import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";

// Existing terminals can retain a stale PATH after installing toolchains.
// Resolve per-user toolchains for every child process.
if (process.platform === "win32") {
  const home = process.env.USERPROFILE || "";
  const toolDirs = [join(home, ".cargo", "bin")].filter(existsSync);
  process.env.PATH = [...toolDirs, process.env.PATH || ""].join(delimiter);
  process.env.CARGO_BUILD_JOBS ||= "1";
}

// Each Python worker otherwise creates a full BLAS/OpenMP thread pool.
for (const variable of ["OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS", "NUMEXPR_NUM_THREADS"]) {
  process.env[variable] ||= "1";
}

const args = process.argv.slice(2);
const noDocker = args.includes("--no-docker");
const noMobile = args.includes("--no-mobile");

function getDockerPath(): string {
  if (process.platform !== "win32") {
    return "docker";
  }
  const progFiles = process.env.ProgramFiles || "C:\\Program Files";
  const progFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const candidates = [
    "docker",
    `${progFiles}\\Docker\\Docker\\resources\\bin\\docker.exe`,
    `${progFilesX86}\\Docker\\Docker\\resources\\bin\\docker.exe`,
    "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
  ];
  for (const c of candidates) {
    if (c === "docker") {
      try {
        const proc = spawn("docker", ["--version"]);
        proc.kill();
        return "docker";
      } catch {}
    } else if (existsSync(c)) {
      return c;
    }
  }
  return "docker";
}

function getDockerDesktopPath(): string | null {
  if (process.platform === "win32") {
    const progFiles = process.env.ProgramFiles || "C:\\Program Files";
    const progFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA || "";
    const candidates = [
      `${progFiles}\\Docker\\Docker\\Docker Desktop.exe`,
      "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe",
      `${progFilesX86}\\Docker\\Docker\\Docker Desktop.exe`,
      `${localAppData}\\Programs\\Docker\\Docker\\Docker Desktop.exe`,
      `${localAppData}\\Docker\\Docker Desktop.exe`,
    ];
    for (const c of candidates) {
      if (c && existsSync(c)) {
        return c;
      }
    }
  } else if (process.platform === "darwin") {
    if (existsSync("/Applications/Docker.app")) {
      return "/Applications/Docker.app";
    }
  }
  return null;
}

async function isDockerDaemonRunning(dockerPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(dockerPath, ["info"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      const timer = setTimeout(() => {
        try { proc.kill(); } catch {}
        resolve(false);
      }, 3500);

      proc.on("exit", (code) => {
        clearTimeout(timer);
        resolve(code === 0);
      });
      proc.on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

async function tryStartDockerDaemon(dockerPath: string): Promise<boolean> {
  if (await isDockerDaemonRunning(dockerPath)) {
    return true;
  }

  if (process.platform === "win32") {
    const desktopExe = getDockerDesktopPath();
    if (desktopExe) {
      console.log(`[Docker] 🐳 Docker is installed but daemon is not running. Launching Docker Desktop (${desktopExe})...`);
      try {
        const startProc = spawn("cmd.exe", ["/c", "start", "", desktopExe], {
          detached: true,
          stdio: ["ignore", "ignore", "ignore"],
        });
        startProc.unref();
      } catch (err: any) {
        console.warn(`[Docker] Failed to launch Docker Desktop: ${err?.message || err}`);
        return false;
      }
    } else {
      console.log("[Docker] 🐳 Docker Desktop executable not found at standard paths. Trying com.docker.service...");
      try {
        spawnSync("powershell", ["-NoProfile", "-Command", "Start-Service com.docker.service -ErrorAction SilentlyContinue"], { timeout: 4000 });
      } catch {}
    }
  } else if (process.platform === "darwin") {
    console.log("[Docker] 🐳 Docker daemon is not running. Launching Docker.app...");
    try {
      const startProc = spawn("open", ["-a", "Docker"], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      });
      startProc.unref();
    } catch (err: any) {
      console.warn(`[Docker] Failed to launch Docker.app: ${err?.message || err}`);
      return false;
    }
  } else {
    // Linux
    console.log("[Docker] 🐳 Attempting to start docker daemon via systemctl...");
    try {
      spawnSync("sudo", ["systemctl", "start", "docker"], { timeout: 4000 });
    } catch {}
  }

  // Poll for up to 25 seconds for the daemon to become responsive
  const maxWaitMs = 25000;
  const pollIntervalMs = 1500;
  const startTime = Date.now();
  process.stdout.write("[Docker] Waiting for daemon to start...");

  while (Date.now() - startTime < maxWaitMs) {
    if (await isDockerDaemonRunning(dockerPath)) {
      console.log(" ready! 🚀");
      return true;
    }
    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  console.log(" timed out.");
  return false;
}

async function ensureSearXNGStarted() {
  if (noDocker) {
    console.log("Skipping SearXNG startup (--no-docker flag detected).");
    return;
  }

  const dockerPath = getDockerPath();
  const isRunning = await tryStartDockerDaemon(dockerPath);

  if (!isRunning) {
    console.warn("Warning: Docker was not found or failed to start. Skipping SearXNG (web search functionality will be disabled).");
    console.warn("💡 Tip: You can start Docker Desktop manually anytime and SearXNG will connect.");
    return;
  }

  console.log("Starting SearXNG via Docker Compose...");
  try {
    const dockerCompose = spawn(dockerPath, ["compose", "-f", "services/search/docker-compose.yml", "up", "-d"], {
      stdio: "inherit",
    });
    dockerCompose.on("exit", (exitCode) => {
      if (exitCode !== 0) {
        console.error("Warning: Failed to start SearXNG via Docker Compose. Continuing anyway...");
      } else {
        console.log("[Docker] ✅ SearXNG service is ready on http://localhost:8888");
      }
    });
  } catch (err: any) {
    console.warn(`Warning: Docker Compose error (${err?.message || err}). Skipping SearXNG.`);
  }
}

function getAdbPath(): string | null {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || "";
    const androidHome = process.env.ANDROID_HOME || "";
    const candidates = [
      "adb",
      `${localAppData}\\Android\\platform-tools\\adb.exe`,
      `${localAppData}\\Android\\Sdk\\platform-tools\\adb.exe`,
      `${androidHome}\\platform-tools\\adb.exe`,
      "C:\\Program Files\\Android\\Android Studio\\platform-tools\\adb.exe",
    ];
    for (const c of candidates) {
      if (c === "adb") {
        try {
          const test = spawn("adb", ["version"]);
          test.kill();
          return "adb";
        } catch {}
      } else if (existsSync(c)) {
        return c;
      }
    }
  } else {
    try {
      const test = spawn("adb", ["version"]);
      test.kill();
      return "adb";
    } catch {}
  }
  return null;
}

/** Best-effort physical LAN IPv4 (skips loopback/link-local/virtual adapters). */
function getLanIp(): string | null {
  try {
    if (process.platform === "win32") {
      const res = spawnSync("powershell", ["-NoProfile", "-Command",
        "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*vEthernet*' -and $_.InterfaceAlias -notlike '*WSL*' -and $_.InterfaceAlias -notlike '*Hyper-V*' -and $_.InterfaceAlias -notlike '*Tailscale*' -and $_.InterfaceAlias -notlike '*Docker*' } | Select-Object -ExpandProperty IPAddress -First 1"]);
      if (res.status === 0) {
        const ip = res.stdout.toString().trim().split(/\s+/)[0] ?? "";
        if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
      }
    } else {
      const res = spawnSync("sh", ["-c", "hostname -I 2>/dev/null | tr ' ' '\\n' | grep -v '^127\\.' | grep -v '^169\\.254\\.' | grep -v '^172\\.17\\.' | head -n 1"]);
      if (res.status === 0) {
        const ip = res.stdout.toString().trim();
        if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
      }
    }
  } catch {}
  return null;
}

/** Prints the manual Wi-Fi debug flow. */
function printManualExpoHints(lanIp: string): void {
  console.log(`[Mobile] ── Wi-Fi debug (no USB) ──────────────────────────────`);
  console.log(`[Mobile] 1) Start Metro with LAN host:`);
  console.log(`[Mobile]      cd apps/mobile && npm run start -- --host lan`);
  console.log(`[Mobile] 2) Scan the Metro exp:// QR with EXPO GO to load the app.`);
  console.log(`[Mobile] 3) The app auto-connects to ${lanIp}:9001.`);
  console.log(`[Mobile] ───────────────────────────────────────────────────────`);
}

/**
 * Publishes the PC LAN IP to the single root .env file.
 */
async function publishMobileDevEnv(): Promise<string | null> {
  const lanIp = getLanIp();
  if (!lanIp) {
    console.warn("[Mobile] Could not detect LAN IP; phone auto-connect will rely on subnet scan.");
    return null;
  }
  const envPath = ".env";
  const begin = "# BEGIN sutra-dev-managed (rewritten by npm run dev; safe to delete)";
  const end = "# END sutra-dev-managed";
  const managed = `${begin}\nEXPO_PUBLIC_PC_IP=${lanIp}\nEXPO_PUBLIC_PC_PORT=9001\n${end}\n`;
  try {
    let existing = "";
    if (existsSync(envPath)) {
      existing = readFileSync(envPath, "utf8");
    }
    const blockRe = /# BEGIN sutra-dev-managed[\s\S]*?# END sutra-dev-managed\n?/;
    const next = blockRe.test(existing)
      ? existing.replace(blockRe, managed)
      : `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}${existing ? "\n" : ""}${managed}`;
    writeFileSync(envPath, next, "utf8");
    console.log(`[Mobile] 📡 Published PC LAN IP ${lanIp} to ${envPath} (EXPO_PUBLIC_PC_IP).`);
  } catch (err: any) {
    console.warn(`[Mobile] Could not write ${envPath}: ${err?.message || err}`);
  }
  return lanIp;
}

function getTailscaleIp(): string | null {
  try {
    const tailscaleExe = process.platform === "win32"
      ? "C:\\Program Files\\Tailscale\\tailscale.exe"
      : "tailscale";
    const res = spawnSync(tailscaleExe, ["ip", "-4"]);
    if (res.status === 0) {
      const ip = res.stdout.toString().trim();
      if (ip && ip.startsWith("100.")) {
        return ip;
      }
    }
  } catch {}
  return null;
}

async function checkAndStartMobileIfUsbConnected(): Promise<ChildProcess | null> {
  const lanIp = await publishMobileDevEnv();
  const adb = getAdbPath();
  if (!adb) {
    console.log("[Mobile] adb not found. Skipping USB mobile check.");
    if (lanIp) printManualExpoHints(lanIp);
    return null;
  }

  try {
    const proc = spawnSync(adb, ["devices", "-l"], { timeout: 2500 });
    const output = proc.stdout ? proc.stdout.toString() : "";

    const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const connectedDevices = lines.filter(l => !l.startsWith("List of") && l.includes("device") && !l.includes("offline") && !l.includes("unauthorized"));

    if (connectedDevices.length === 0) {
      console.log("[Mobile] No USB-connected Android devices detected.");
      if (lanIp) printManualExpoHints(lanIp);
      return null;
    }

    console.log(`[Mobile] 📱 Detected ${connectedDevices.length} USB-connected Android device(s):`);
    for (const dev of connectedDevices) {
      console.log(`  - ${dev}`);
    }

    console.log("[Mobile] Setting up USB reverse port forwarding (tcp:9001, tcp:9002, tcp:9004, tcp:8081)...");
    spawnSync(adb, ["reverse", "tcp:9001", "tcp:9001"], { timeout: 1500 });
    spawnSync(adb, ["reverse", "tcp:9002", "tcp:9002"], { timeout: 1500 });
    spawnSync(adb, ["reverse", "tcp:9004", "tcp:9004"], { timeout: 1500 });
    spawnSync(adb, ["reverse", "tcp:8081", "tcp:8081"], { timeout: 1500 });

    let mobileProc: ChildProcess | null = null;
    let isRunning = false;
    try {
      const res = await fetch("http://127.0.0.1:8081", { signal: AbortSignal.timeout(1000) });
      isRunning = res.status === 200 || res.status === 404;
    } catch {}

    if (isRunning) {
      console.log("[Mobile] ⚡ Metro bundler is already running on port 8081 (IPv4).");
    } else {
      const tailscaleIp = getTailscaleIp();
      if (tailscaleIp) {
        console.log(`[Mobile] 🔒 Detected Tailscale IP: ${tailscaleIp}`);
      }

      console.log("[Mobile] 🚀 Starting Expo mobile development server on port 8081...");
      mobileProc = spawn("npm", ["run", "start", "--", "--host", "lan"], {
        cwd: "apps/mobile",
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          EXPO_NO_TELEMETRY: "1",
          ...(tailscaleIp ? { EXPO_PUBLIC_TAILSCALE_IP: tailscaleIp } : {}),
        },
      });
    }

    (async () => {
      const maxAttempts = 40;
      let ready = false;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const res = await fetch("http://127.0.0.1:8081/status", { signal: AbortSignal.timeout(1000) });
          if (res.status === 200) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 500));
      }

      if (ready) {
        console.log("[Mobile] 📱 Metro is ready. Opening app on device...");
      } else {
        console.warn("[Mobile] ⚠️ Metro bundler readiness check timed out. Attempting launch anyway...");
      }

      try {
        const checkPkg = spawnSync(adb, ["shell", "pm", "list", "packages", "com.technerds.sutraremote"]);
        const isCustomInstalled = checkPkg.stdout?.toString().includes("com.technerds.sutraremote");
        if (isCustomInstalled) {
          console.log("[Mobile] 📱 Launching sutra custom native app on device...");
          spawn(adb, ["shell", "am", "start", "-n", "com.technerds.sutraremote/.MainActivity"]);
        } else {
          console.log("[Mobile] 📱 Launching Expo Go on device...");
          spawn(adb, ["shell", "am", "start", "-a", "android.intent.action.VIEW", "-d", "exp://127.0.0.1:8081", "host.exp.exponent"]);
        }
      } catch (err: any) {
        console.warn(`[Mobile] Could not launch app on device: ${err?.message || err}`);
      }
    })();

    return mobileProc;
  } catch (err: any) {
    console.warn(`[Mobile] USB mobile check encountered an error: ${err?.message || err}`);
    return null;
  }
}

await ensureSearXNGStarted();

let mobileProcess: ChildProcess | null = null;
if (!noMobile) {
  mobileProcess = await checkAndStartMobileIfUsbConnected();
}

if (process.platform === "win32" && !existsSync("services/agent/python_runtime/Python313")) {
  console.log("Preparing Python runtime...");
  const prepProc = spawnSync("node", ["scripts/build/prepare-python-runtime.mjs"], {
    stdio: "inherit",
  });
  if (prepProc.status !== 0) {
    console.error("Warning: Python runtime preparation returned non-zero exit code.");
  }
}

const customPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 5173;

const killWindowsProcessTree = (pid?: number) => {
  if (process.platform !== "win32" || !pid) return;
  try {
    spawnSync("taskkill", ["/F", "/T", "/PID", String(pid)]);
  } catch {}
};

const killSutraPorts = () => {
  if (process.platform !== "win32") return;
  const ports = [5173, 9001, 9002, 8081];
  try {
    const cmd = `Get-NetTCPConnection -State Listen -LocalPort ${ports.join(",")} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }`;
    spawnSync("powershell", ["-NoProfile", "-Command", cmd]);
    console.log("[sutra] 🧹 Cleared existing processes on dev ports (5173, 9001, 9002, 8081).");
  } catch {}
};

killSutraPorts();

const tauriArgs = ["npx", "tauri", "dev"];
if (process.env.PORT) {
  const dynamicConfig = JSON.stringify({
    build: {
      devUrl: `http://localhost:${customPort}`,
    },
    app: {
      security: {
        csp: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob: data:; connect-src 'self' ipc: http://ipc.localhost ws://127.0.0.1:9001 wss://127.0.0.1:9001 wss://api.sarvam.ai wss://agents.assemblyai.com wss://streaming.assemblyai.com wss://api.assemblyai.com https://api.assemblyai.com ws://localhost:${customPort} http://localhost:${customPort}`,
      },
    },
  });
  tauriArgs.push("--config", dynamicConfig);
}

console.log(`Starting Tauri Development Server on port ${customPort}...`);
const tauriDev = spawn(tauriArgs[0], tauriArgs.slice(1), {
  stdio: "inherit",
  shell: true,
});

const cleanup = () => {
  if (mobileProcess) {
    try {
      mobileProcess.kill();
    } catch {}
  }
  try {
    tauriDev.kill();
  } catch {}

  killWindowsProcessTree(tauriDev.pid);
};

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
process.on("exit", cleanup);

tauriDev.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});
