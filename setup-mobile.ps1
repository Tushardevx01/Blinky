#Requires -Version 5.1
<#
.SYNOPSIS
  sutra mobile one-click setup (Windows) -- installs deps, prints LAN IP, starts Expo QR.
.USAGE
  powershell -ExecutionPolicy Bypass -File setup-mobile.ps1
  .\setup-mobile.ps1 -Tunnel     # use ngrok tunnel when phone+PC are on different networks
  .\setup-mobile.ps1 -Usb        # USB mode: adb reverse + localhost (no Wi-Fi needed)
  .\setup-mobile.ps1 -Clear      # start Metro with cache cleared (expo start -c)
  Flow: 1) run desktop first (.\run.ps1)  2) run this script  3) scan QR  4) enter PC IP, tap Establish Link.
#>
param([switch]$Tunnel, [switch]$Usb, [switch]$Clear)
$ErrorActionPreference = "Stop"
function Write-Step($m){ Write-Host "`n[STEP] $m" -ForegroundColor Cyan }
function Write-Ok($m){ Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn($m){ Write-Host "  [WARN] $m" -ForegroundColor Yellow }
function Fail($msg,$hint,$fix){
  Write-Host "`n================================ ERROR ================================" -ForegroundColor Red
  Write-Host "[ERROR] $msg" -ForegroundColor Red
  if($hint){ Write-Host "`n  Why: $hint" -ForegroundColor Yellow }
  if($fix){ Write-Host "  Fix and retry:`n    $fix" -ForegroundColor White }
  Write-Host "`n  Mobile setup aborted. Fix above, then re-run: .\setup-mobile.ps1`n" -ForegroundColor Red
  exit 1
}
function Test-Cmd($n){ try{ $null=Get-Command $n -ErrorAction Stop; return $true }catch{ return $false } }

$RepoRoot=$PSScriptRoot; if(-not $RepoRoot){ $RepoRoot=Split-Path -Parent $MyInvocation.MyCommand.Path }
Set-Location $RepoRoot
$MobileDir=Join-Path $RepoRoot "apps\mobile"
Write-Host "`n============================================================" -ForegroundColor Magenta
Write-Host "  sutra - Mobile One-click Setup (Windows)" -ForegroundColor Magenta
Write-Host "  Mobile dir: $MobileDir" -ForegroundColor DarkGray
Write-Host "============================================================" -ForegroundColor Magenta

if(-not (Test-Path "$MobileDir\package.json")){ Fail "apps/mobile/package.json not found." "Run from the sutra repo root; checkout may be incomplete." "cd <path-to-sutra>  then .\setup-mobile.ps1" }

if(-not (Test-Cmd "node")){ Fail "Node.js not found." "Node.js is required for Expo Metro bundler." "winget install OpenJS.NodeJS.LTS" }
if(-not (Test-Cmd "npm")){ Fail "npm not found." "npm is required to manage packages." "winget install OpenJS.NodeJS.LTS" }

Write-Step "Installing mobile dependencies (apps\mobile)"
try{
  $oldEAP=$ErrorActionPreference; $ErrorActionPreference="Continue"
  Push-Location $MobileDir
  $out=& npm install --prefer-offline 2>&1 | Out-String; $code=$LASTEXITCODE
  Pop-Location
  $ErrorActionPreference=$oldEAP; Write-Host $out
  if($code -ne 0){ throw "npm install exited with $code" }
  Write-Ok "Mobile deps installed"
}catch{ $ErrorActionPreference="Stop"; Fail "Mobile npm install failed: $_" "Usually network issues." "cd apps\mobile; npm install  # manual retry" }

# Expo CLI check
Write-Step "Checking Expo CLI"
$expoOk=$false
try{
  $oldEAP=$ErrorActionPreference; $ErrorActionPreference="Continue"
  $ev=& npx expo --version 2>&1 | Out-String; $code=$LASTEXITCODE
  $ErrorActionPreference=$oldEAP
  if($code -eq 0 -and ($ev -match "\d+\.\d+")){ $expoOk=$true; Write-Ok "Expo $($ev.Trim())" }
  else{ throw $ev }
}catch{
  $ErrorActionPreference="Stop"
  Write-Warn "Expo CLI check had warning: $($_.Exception.Message)"
}

# Desktop backend check: port 9001 should be listening (npm run dev).
Write-Step "Checking desktop backend (port 9001)"
$pcRunning=$false
try{
  $tcp=New-Object Net.Sockets.TcpClient
  $iar=$tcp.BeginConnect("127.0.0.1",9001,$null,$null)
  if($iar.AsyncWaitHandle.WaitOne(1200)){ $tcp.EndConnect($iar); $pcRunning=$true }
  $tcp.Close()
}catch{}
if($pcRunning){ Write-Ok "Desktop backend reachable on 127.0.0.1:9001" }
else{
  Write-Warn "Desktop backend NOT reachable on port 9001."
  Write-Host "    Start desktop first in another terminal:  .\run.ps1  (or: npm run dev)" -ForegroundColor White
}

# Print LAN IPv4s so user knows what to type as "PC IP" + Establish Link.
Write-Step "Your PC IP (type this in the phone app, then Establish Link)"
try{
  $ips=Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -ExpandProperty IPAddress -Unique
  if($ips){ foreach($ip in $ips){ Write-Host "  PC IP: $ip :9001" -ForegroundColor Green } }
  else{ Write-Warn "No LAN IPv4 found. Are you on Wi-Fi?" }
}catch{ Write-Warn "Could not enumerate IPs: $_" }

# USB mode: adb reverse so phone uses 'localhost'.
if($Usb){
  Write-Step "USB mode: adb reverse tcp:9001/9002/9004/8081"
  $adb=$null
  if(Test-Cmd "adb"){ $adb="adb" }
  foreach($p in @("$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe","$env:LOCALAPPDATA\Android\platform-tools\adb.exe")){ if((-not $adb)-and (Test-Path $p)){ $adb=$p } }
  if($env:ANDROID_HOME -and (Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe")){ $adb="$env:ANDROID_HOME\platform-tools\adb.exe" }
  if(-not $adb){ Fail "adb.exe not found (needed for -Usb)." "Install Android SDK Platform Tools and enable USB debugging on the phone." "winget install Google.AndroidSDKPlatformTools, then .\setup-mobile.ps1 -Usb" }
  try{
    foreach($port in @(9001,9002,9004,8081)){ & $adb reverse "tcp:$port" "tcp:$port" 2>&1 | Out-String | Write-Host }
    Write-Ok "USB reverse routing done. In the phone app use IP: localhost"
  }catch{ Fail "adb reverse failed: $_" "Phone not connected / USB debugging off / authorization prompt not accepted." }
}

# Launch Expo
Write-Step "Starting Expo (QR prints below -- scan it)"
$expoArgs=@("run","start","--","--host","lan")
if($Tunnel){ $expoArgs=@("run","start","--","--tunnel") }
if($Clear){ $expoArgs+=@("-c") }
Write-Host ""
Write-Host "  ================= PHONE TEST FLOW =================" -ForegroundColor Green
Write-Host "  1) Scan the QR below with Expo Go (or your sutra dev build)." -ForegroundColor White
Write-Host "  2) Phone + PC must be on the SAME Wi-Fi (or -Usb mode with IP 'localhost')." -ForegroundColor White
Write-Host "  3) In the app: QR tab (default) - scan pairing code from PC header." -ForegroundColor White
Write-Host "  Metro keys: r = reload, m = dev menu, a = open app, Ctrl+C = stop." -ForegroundColor DarkGray
Write-Host "  ====================================================" -ForegroundColor Green
Write-Host ""
try{
  Push-Location $MobileDir
  & npm @expoArgs
  Pop-Location
}catch{ Fail "Expo failed to start: $_" "See error above." "cd apps\mobile; npm run start" }
