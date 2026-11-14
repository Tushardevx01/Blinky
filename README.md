# BLINKY

> **Ask. Learn. Automate. Control from anywhere.**

Blinky is an intelligent, privacy-first AI desktop tutor and autonomous computer-use agent for Windows and Linux, accompanied by a React Native (Expo) mobile companion, a pure-Rust agent & OS daemon, a local System 1 neural decision engine, an Offline Knowledge Format (OKF) notebook workspace, and an AiCut C++17 video processing suite.

---

## Key Capabilities

- **System 1 Neural Decision Engine:** Sub-millisecond (<1ms) non-autoregressive ONNX Transformer classifier (`decision_engine/`) distinguishing instant OS reflexes from deliberative System 2 multi-step reasoning before LLM invocation.
- **Pure Rust Autonomous Agent (`crates/blinky-agent`):** Ultra-fast native Rust autonomous agent loop with multi-provider streaming support (Ollama, Groq, Gemini, OpenAI), native OS tools, and embedded SQLite vector storage.
- **Headless Linux Desktop Daemon (`crates/blinky-daemon`):** Native daemon for Wayland (Hyprland/wlroots) and X11 featuring direct Linux `/dev/uinput` actuation, AT-SPI2 DBus accessibility trees, and PipeWire high-FPS capture.
- **Screen-Aware Tutoring & OmniParser Grounding:** Realtime screen inspection combining WinRT OCR / Tesseract with OmniParser YOLO icon detection, assigning persistent `@ref` spatial tags and on-screen guidance overlays.
- **Blinky Notebook Hub & Offline Knowledge Format (OKF):** High-density structured document workspace (`docs/OKF.md`) eliminating vector fragmentation with 100% full-context reasoning and actionable **"▶ Execute on PC"** desktop citations.
- **Voice Interaction & Sarvam Synchronized Highlighting:** Realtime multilingual speech dictation (`saaras:v3`) and natural voice guidance (`bulbul:v3`) with dynamic, word-by-word visual highlight synchronization.
- **Local Offline Wake Word:** Zero-latency hands-free activation powered by the bundled `python/hey_blinky.onnx` model running entirely locally via ONNX Runtime.
- **AiCut C++17 Video Processing Suite & MCP Server:** Native CMake engine with `faster-whisper` forced alignment, automatic silence stripping, and a Model Context Protocol (MCP) server for natural-language video editing.
- **Antigravity IDE Bridge & Mobile HITL Gate:** Port 9003 webhook bridge streaming live terminal outputs and file modifications to mobile with an interactive Human-in-the-Loop (HITL) approval safety card.
- **Expo Mobile Companion (`common/mobile`):** Standalone Android app with Sentinel PC telemetry, Wake-on-LAN power triggers, gesture screenshot canvas, 16MB chunked file transfers, and Android KeyStore encryption.
- **Web-in-the-Loop (WIL) Autonomous Research:** Playwright persistent browser automation coupled with local SearXNG search retrieval and clickable source synthesis.
- **Hardware Peripherals & Ambient Lighting:** Universal Arduino/C++ firmware for ESP32 microcontrollers controlling NeoPixel LEDs for real-time visual system telemetry.

---

## Evaluation Benchmark & System Performance

Blinky is continuously benchmarked for minimal latency, zero-lag desktop responsiveness, and accurate physical actuation:

| Metric                                      |    Result     | Benchmark Standard                                                 |
| :------------------------------------------ | :-----------: | :----------------------------------------------------------------- |
| **System 1 Decision Engine Latency**        | **< 1.0 ms**  | Sub-millisecond non-autoregressive intent routing on CPU           |
| **Local Wake Word Detection**               |  **< 15 ms**  | Real-time offline audio buffer inference via ONNX Runtime          |
| **Mobile File Streaming Throughput**        | **~125 MB/s** | 16MB chunked bidirectional transfers on LAN with streaming SHA-256 |
| **Screen Element Grounding (OCR + Vision)** | **< 350 ms**  | High-precision `@ref` spatial indexing with 2-second IOU cache     |
| **Pure Rust Agent Memory Footprint**        |  **< 28 MB**  | Zero garbage-collection pauses and ultra-low resident memory usage |

---

## Technology Stack

| Layer                           | Technologies                                                                                |
| :------------------------------ | :------------------------------------------------------------------------------------------ |
| **Desktop Frontend**            | Tauri 2.x, React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts                 |
| **Native Core & Daemons**       | Rust (Tauri 2, `blinky-agent`, `blinky-daemon`), `rusqlite`, `zbus`, `evdev`, `/dev/uinput` |
| **AI & Neural Decision Engine** | Python 3.11+, ONNX Runtime, HuggingFace Transformers, PyTorch, OmniParser YOLO              |
| **Voice & Speech**              | Sarvam AI (`saaras:v3`, `bulbul:v3`), AssemblyAI, local `hey_blinky.onnx`                   |
| **Mobile Companion**            | React Native (Expo SDK 57), TypeScript, OkHttp TLS Pinning, Android KeyStore                |
| **Video Suite & MCP**           | C++17, CMake, FFmpeg, `faster-whisper`, Python MCP JSON-RPC Server                          |
| **Hardware & Peripherals**      | ESP32 Arduino/C++, NeoPixel, PipeWire, `xdg-desktop-portal`, Headless WhatsApp Web          |

---

## Monorepo Architecture

```mermaid
flowchart LR
    Mobile["📱 Android Companion<br/>(Expo / React Native)"]
    DesktopUI["🖥️ Desktop Frontend<br/>(Tauri 2 / React 19)"]
    RustCore["⚙️ Native Rust Core<br/>(blinky-agent / blinky-daemon)"]
    PyEngine["🧠 Python AI Engine<br/>(Screen & Voice / Wake Word)"]
    Hardware["🔌 Peripherals & OS<br/>(uinput / PipeWire / ESP32)"]

    Mobile -->|WSS :9001 (TLS Pinning)| RustCore
    Mobile -->|HTTP :9002 (16MB Chunk)| RustCore
    DesktopUI -->|Tauri IPC| RustCore
    RustCore <-->|Local RPC / Sockets| PyEngine
    RustCore -->|Direct Actuation| Hardware
    PyEngine -->|Antigravity Bridge :9003| Mobile
```

```
Blinky/
├── crates/
│   ├── blinky-agent/          # Standalone pure-Rust autonomous agent loop & vector RAG
│   └── blinky-daemon/         # Headless Linux Wayland/X11 automation daemon
├── decision_engine/           # System 1 ONNX Transformer classifier (<1ms reflex routing)
├── common/
│   ├── aicut/                 # C++17 video processing engine, CMake build, & MCP server
│   ├── mobile/                # Expo / React Native Android companion application
│   ├── python/                # Python assistant backend, vision grounding, & IDE bridge
│   └── whatsapp_backend/      # Headless WhatsApp Web session and summary service
├── python/                    # Shared wake-word listener and bundled hey_blinky.onnx model
├── esp32_firmware/            # Universal ESP32 daemon firmware for ambient NeoPixels
├── docs/                      # OKF format, threat remediation, security, and distribution
├── linux/                     # Linux setup scripts, Hyprland/wlroots config, & quick start
├── windows/                   # Windows setup scripts and platform integrations
├── BLINKY_SUMMARY.md          # Comprehensive architectural overview and component ledger
└── README.md
```

---

## Quick Start Guide

### 1. Prerequisites

- **Node.js (v20+)** & `bun` or `npm`
- **Rust (1.75+)** & `cargo`
- **Python 3.11+**
- **FFmpeg & CMake** (for AiCut video processing suite)
- **Expo CLI** (optional, for Android companion app)

### 2. Single Root Environment Configuration

Blinky configures its environment variables through the root `.env` file (copied from `.env_example`).

Root `/.env`:

```bash
# AI Assistant & Model Providers
BLINKY_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
GROQ_API_KEY=
OPENAI_API_KEY=

# Voice & Speech Services
SARVAM_API_KEY=
ASSEMBLY_AI_API_KEY=

# Native Rust Execution
BLINKY_USE_NATIVE_AGENT=0

# Hardware & Peripherals (Optional)
ESP32_HOST=http://192.168.1.100
ANTIGRAVITY_BRIDGE_PORT=9003
```

### 3. Build & Run Desktop Locally

#### On Linux:

```bash
# 1. Install dependencies & setup environment
./setup.sh

# 2. Run Blinky desktop application
./run.sh
```

#### On Windows:

```powershell
# 1. Run PowerShell setup script
.\setup.ps1

# 2. Start Blinky
.\run.ps1
```

### 4. Run Mobile Companion (Android)

```bash
cd common/mobile
npm install
npx expo start
```

Scan the generated QR code using the Expo Go application or build a standalone release APK with `npx eas-cli build -p android`.

---

## Verification & Test Suite

### 1. Run Rust Core, Agent & Daemon Tests

```bash
cargo test --all
```

### 2. Run System 1 Neural Decision Engine Tests

```bash
cd decision_engine
python3 infer.py --test
```

### 3. Run AiCut C++17 & MCP Video Suite Tests

```bash
cd common/aicut
python3 aicut_mcp.py --test
```

### 4. Full Monorepo Typecheck & Build

```bash
# Build desktop frontend
bun run build

# Build Tauri desktop bundle
cargo tauri build
```

---

## Documentation

- [Project Summary & Architecture Map (BLINKY_SUMMARY.md)](./BLINKY_SUMMARY.md)
- [Blinky Notebook Hub & OKF Specification (docs/OKF.md)](./docs/OKF.md)
- [Linux Quick Start & Hyprland Setup (linux/quick_start.md)](./linux/quick_start.md)
- [Linux Port Roadmap (docs/LINUX-PORT-ROADMAP.md)](./docs/LINUX-PORT-ROADMAP.md)
- [AssemblyAI Voice Agent Integration (docs/ASSEMBLYAI_VOICE_AGENT.md)](./docs/ASSEMBLYAI_VOICE_AGENT.md)
- [Computer-Use Integration Plan (docs/HERMES-INTEGRATION-PLAN.md)](./docs/HERMES-INTEGRATION-PLAN.md)
- [Security Remediation & Threat Model (docs/SECURITY-REMEDIATION.md)](./docs/SECURITY-REMEDIATION.md)
- [Mobile Companion Architecture (common/mobile/APP-FLOW.md)](./common/mobile/APP-FLOW.md)
- [AiCut Video Editor Documentation (common/ai_docs/10_aicut_video_editor.md)](./common/ai_docs/10_aicut_video_editor.md)

---

## License

MIT License — Blinky Autonomous Desktop & Mobile Assistant.
