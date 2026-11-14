#Requires -Version 5.1
<#
.SYNOPSIS
  sutra one-click setup (Windows) -- installs missing dependencies, configures .venv, sets up .env, typechecks, launches.
.DESCRIPTION
  Audits the system for Node.js, npm, Rust/Cargo, MSVC, WebView2, Python 3.11-3.13,
  creates .venv, installs desktop and mobile dependencies, prepares .env, and optionally launches the app.
.USAGE
  powershell -ExecutionPolicy Bypass -File setup.ps1
  .\setup.ps1 -Run              # setup + immediately run the app (npm run dev)
  .\setup.ps1 -Yes              # auto-confirm installs (winget / rustup)
  .\setup.ps1 -SkipMobile       # skip apps/mobile deps (faster PC-only setup)
#>
param(
  [switch]$Run,
  [switch]$Yes,
  [switch]$SkipMobile
)
$ErrorActionPreference = "Stop"
$Global:SetupFailed = $false
$Global:CurrentStep = "init"

function Write-Step($m) { Write-Host "`n[STEP] $m" -ForegroundColor Cyan }
function Write-Ok($m) { Write-Host "  [OK] $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "  [WARN] $m" -ForegroundColor Yellow }
function Fail($msg, $hint, $fix) {
  $Global:SetupFailed = $true
  Write-Host "`n================================ ERROR ================================" -ForegroundColor Red
  Write-Host "[ERROR] $msg" -ForegroundColor Red
  if ($hint) { Write-Host "`n  Why: $hint" -ForegroundColor Yellow }
  if ($fix) { Write-Host "  Fix and retry:`n    $fix" -ForegroundColor White }
  Write-Host "`n  Setup aborted. Fix above and re-run: .\setup.ps1`n" -ForegroundColor Red
  exit 1
}
function Confirm-AutoInstall($name) {
  if ($Yes) { return $true }
  Write-Host "  $name is missing." -ForegroundColor Yellow
  $ans = Read-Host "  Install $name automatically? [Y/n]"
  return ($ans -notmatch "^[nN]")
}
function Test-Cmd($name) {
  try { $null = Get-Command $name -ErrorAction Stop; return $true } catch { return $false }
}
function Refresh-Path {
  $reg = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine")
  $cargoHome = Join-Path $env:USERPROFILE ".cargo\bin"
  if ((Test-Path $cargoHome) -and ($reg -notlike "*$cargoHome*")) { $reg = "$cargoHome;$reg" }
  $env:Path = $reg
}

$RepoRoot = $PSScriptRoot
if (-not $RepoRoot) { $RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path }
Set-Location $RepoRoot

try { Start-Transcript -Path (Join-Path $RepoRoot "setup.log") -Append -ErrorAction SilentlyContinue | Out-Null } catch {}

Write-Host "`n============================================================" -ForegroundColor Magenta
Write-Host "  sutra - One-click Windows Setup" -ForegroundColor Magenta
Write-Host "  Repo: $RepoRoot  Flags: Run=$Run Yes=$Yes SkipMobile=$SkipMobile" -ForegroundColor DarkGray
Write-Host "============================================================" -ForegroundColor Magenta

# -- 1. Node.js & npm -----------------------------------------------------
$Global:CurrentStep = "Node.js & npm"
Write-Step "Checking Node.js & npm (required)"
if (-not (Test-Cmd "node")) {
  Fail "Node.js is required but was not found." "Node.js runs the desktop build and dev tooling." "winget install OpenJS.NodeJS.LTS"
}
if (-not (Test-Cmd "npm")) {
  Fail "npm is required but was not found." "npm manages JavaScript packages." "winget install OpenJS.NodeJS.LTS"
}
Write-Ok "Node $((node --version 2>&1 | Out-String).Trim())"
Write-Ok "npm $((npm --version 2>&1 | Out-String).Trim())"

# -- 2. Rust / Cargo ------------------------------------------------------
$Global:CurrentStep = "Rust/Cargo (Tauri)"
Write-Step "Checking Rust/Cargo (required for Tauri desktop shell)"
$HasCargo = Test-Cmd "cargo"
if (-not $HasCargo) { Refresh-Path; $HasCargo = Test-Cmd "cargo" }
if ($HasCargo) {
  try { Write-Ok "$((cargo --version 2>&1 | Out-String).Trim())" } catch { Write-Warn "cargo present but 'cargo --version' failed: $_" }
} else {
  Write-Warn "Cargo/Rust not found."
  if (Confirm-AutoInstall "Rust toolchain via rustup") {
    Write-Host "  Installing Rust (stable-x86_64-pc-windows-msvc)..." -ForegroundColor DarkGray
    try {
      Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"
      & "$env:TEMP\rustup-init.exe" -y --default-toolchain stable-x86_64-pc-windows-msvc | Out-Null
    } catch { Write-Warn "rustup-init failed: $_" }
    Refresh-Path
    $HasCargo = Test-Cmd "cargo"
  }
  if ($HasCargo) { Write-Ok "$((cargo --version 2>&1 | Out-String).Trim()) (just installed)" }
  else {
    Write-Host "  Continuing setup (JS/Python steps), but 'npm run dev' WILL fail until Rust is installed." -ForegroundColor Yellow
  }
}

# Optional tools
Write-Step "Checking optional tools"
try {
  $dv = docker --version 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0) { Write-Ok "$($dv.Trim()) -- enables local SearXNG search" } else { throw }
} catch { Write-Warn "Docker not found (optional). Without it web search is disabled; use -NoDocker." }
try {
  $ov = ollama --version 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0) { Write-Ok "$($ov.Trim()) -- needed only if SUTRA_AI_PROVIDER=ollama" } else { throw }
} catch { Write-Warn "Ollama not found (optional)." }

# -- 4. npm install (desktop) ---------------------------------------------
$Global:CurrentStep = "npm install (desktop JS deps)"
Write-Step "Installing desktop JS dependencies (npm install)"
if (-not (Test-Path "$RepoRoot\package.json")) { Fail "package.json not found in $RepoRoot." "You are not in the sutra repo root." "cd <path-to-sutra>  then re-run .\setup.ps1" }
try {
  $oldEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  $out = & npm install --prefer-offline 2>&1 | Out-String; $code = $LASTEXITCODE
  $ErrorActionPreference = $oldEAP
  Write-Host $out
  if ($code -ne 0) { throw "npm install exited with code $code. See output above." }
  Write-Ok "Desktop JS dependencies installed"
} catch {
  $ErrorActionPreference = "Stop"
  Fail "npm install failed: $_" "Usually network or package issue." "npm install"
}

# -- 5. Python venv + deps + Playwright -----------------------------------
$Global:CurrentStep = "Python .venv"
Write-Step "Setting up Python virtual environment (.venv)"
$VenvPath = Join-Path $RepoRoot ".venv"
$VenvPython = Join-Path $VenvPath "Scripts\python.exe"
$RequirementsPath = Join-Path $RepoRoot "services\agent\requirements\requirements-windows.txt"
if (-not (Test-Path $RequirementsPath)) { Fail "requirements-windows.txt not found." "Repo checkout incomplete." "git pull  then re-run .\setup.ps1" }
if (-not (Test-Path $VenvPython)) {
  Write-Host "  Creating .venv..." -ForegroundColor DarkGray
  try {
    & python -m venv $VenvPath 2>&1 | Out-String | Write-Host
    Write-Ok ".venv created at $VenvPath"
  } catch {
    Fail "Failed to create .venv: $_" "Python not found or venv failed." "winget install Python.Python.3.13"
  }
} else { Write-Ok ".venv already exists at $VenvPath" }

$Global:CurrentStep = "pip install (Python deps)"
Write-Step "Installing Python dependencies (may take 2-5 min)"
try {
  $oldEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  & $VenvPython -m pip install --upgrade pip 2>&1 | Out-String | Write-Host
  & $VenvPython -m pip install -r $RequirementsPath 2>&1 | Out-String | Write-Host
  $ErrorActionPreference = $oldEAP
  Write-Ok "Python packages installed"
} catch { Fail "Python deps failed: $_" "Check requirements vs Python version." ".\.venv\Scripts\python.exe -m pip install -r $RequirementsPath" }

$Global:CurrentStep = "Playwright Chromium"
Write-Step "Installing Playwright Chromium"
try {
  & $VenvPython -m playwright install chromium 2>&1 | Out-String | Write-Host
  Write-Ok "Playwright Chromium installed"
} catch { Fail "Playwright install failed: $_" "WhatsApp/browser automation needs this." ".\.venv\Scripts\python.exe -m playwright install chromium" }

# -- 6. .env --------------------------------------------------------------
$Global:CurrentStep = ".env"
Write-Step "Validating root .env"
$EnvPath = Join-Path $RepoRoot ".env"
if (-not (Test-Path $EnvPath)) {
  Set-Content -Path $EnvPath -Value "SUTRA_AI_PROVIDER=groq`nGROQ_API_KEY=`nSARVAM_API_KEY=`nSUTRA_SHORTCUT=Space`n"
  Write-Ok ".env created (minimal) -- EDIT IT"
} else { Write-Ok ".env already exists (not overwritten)" }

# -- 7. Mobile deps -------------------------------------------------------
if (-not $SkipMobile) {
  $Global:CurrentStep = "Mobile deps (apps/mobile)"
  Write-Step "Installing mobile companion deps (apps/mobile)"
  $MobileDir = Join-Path $RepoRoot "apps\mobile"
  if (-not (Test-Path "$MobileDir\package.json")) {
    Write-Warn "apps/mobile/package.json not found -- skipping mobile deps."
  } else {
    try {
      Push-Location $MobileDir
      $out = & npm install --prefer-offline 2>&1 | Out-String; $code = $LASTEXITCODE
      Pop-Location
      Write-Ok "Mobile deps installed. Run mobile QR setup: .\setup-mobile.ps1"
    } catch {
      Write-Warn "Mobile deps failed (non-blocking for desktop): $_"
    }
  }
} else { Write-Step "Skipping mobile deps (-SkipMobile)"; Write-Warn "Mobile skipped. Run later: .\setup-mobile.ps1" }

# -- 8. Typecheck ---------------------------------------------------------
$Global:CurrentStep = "typecheck"
Write-Step "Sanity check (typecheck, non-blocking)"
try {
  $oldEAP = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  $tc = & npm run typecheck 2>&1 | Out-String; $code = $LASTEXITCODE
  $ErrorActionPreference = $oldEAP
  if ($code -eq 0) { Write-Ok "Typecheck passed" } else { Write-Warn "Typecheck warnings:`n$tc" }
} catch { Write-Warn "Typecheck skipped: $_" }

# -- 9. Doctor summary ----------------------------------------------------
$Global:CurrentStep = "doctor"
Write-Step "Doctor -- what's ready, what's not"
$rows = @()
$rows += [pscustomobject]@{ Component = "Node"; Status = if (Test-Cmd "node") { "READY" } else { "MISSING" } }
$rows += [pscustomobject]@{ Component = "npm"; Status = if (Test-Cmd "npm") { "READY" } else { "MISSING" } }
$rows += [pscustomobject]@{ Component = "Rust/Cargo"; Status = if (Test-Cmd "cargo") { "READY" } else { "MISSING (npm run dev will fail)" } }
$rows += [pscustomobject]@{ Component = "Python venv"; Status = if (Test-Path $VenvPython) { "READY" } else { "MISSING" } }
$rows += [pscustomobject]@{ Component = ".env keys"; Status = "CHECK .env (GROQ/AssemblyAI)" }
$rows += [pscustomobject]@{ Component = "Mobile deps"; Status = if ($SkipMobile) { "SKIPPED" } elseif (Test-Path "$RepoRoot\apps\mobile\node_modules") { "READY" } else { "run .\setup-mobile.ps1" } }
$rows | Format-Table -AutoSize | Out-String | Write-Host

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  Setup complete! One-click run:" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host @"

  RUN THE APP:
    .\run.ps1                  # one-click run (checks deps, picks docker/no-docker)
    npm run dev                # full (SearXNG + Tauri + Python)
    npm run dev:no-docker      # skip Docker/SearXNG (no web search)

  MOBILE (phone remote + QR):
    .\setup-mobile.ps1         # installs mobile deps, prints LAN IP + QR flow

  CONFIGURE KEYS (.env -- required before AI works):
    GROQ_API_KEY=gsk_...       # https://console.groq.com -> API Keys
    ASSEMBLY_AI_API_KEY=...    # https://assemblyai.com (voice)
    SUTRA_AI_PROVIDER=groq     # or: custom / ollama

  HOTKEYS:  CTRL + SHIFT + SPACE  (fallback CTRL + SHIFT + ENTER)

"@ -ForegroundColor White

try { Stop-Transcript -ErrorAction SilentlyContinue | Out-Null } catch {}

if ($Run) {
  if ($Global:SetupFailed) { exit 1 }
  Write-Step "One-click run requested (-Run): launching sutra"
  if (-not (Test-Cmd "cargo")) {
    Fail "Cannot -Run: Rust/Cargo still missing." "Install Rust first, otherwise Tauri cannot start." "winget install Rustlang.Rustup"
  }
  & npm run dev
}
