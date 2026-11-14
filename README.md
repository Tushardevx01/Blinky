<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo_text.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo_text.png">
  <img alt="sutra" src="docs/assets/logo_text.png" width="72%">
</picture>

<br>

Screen-aware tutoring · Voice interaction · Desktop automation · Mobile control

<br>

[![Demo](https://img.shields.io/badge/Watch_Demo-YouTube-red?style=for-the-badge)](https://youtu.be/CHFF9J_Jqgw)
[![Blog](https://img.shields.io/badge/Blog-Medium-000000?style=for-the-badge)](https://medium.com/@khannasparsh0001/building-sutra-fighting-captchas-invisible-windows-and-the-agony-of-visualizing-ai-b1247b9fc324?sharedUserId=khannasparsh0001)

<br>

![Tauri](https://img.shields.io/badge/Tauri-2.x-FFC131?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-24+-339933?logo=nodedotjs&logoColor=white)
![npm](https://img.shields.io/badge/npm-11+-CB3837?logo=npm&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Exclusively-47A248?logo=mongodb&logoColor=white)
![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-Object_Storage-F38020?logo=cloudflare&logoColor=white)
![Platform](https://img.shields.io/badge/Windows%20%7C%20Linux%20%7C%20Android-supported-blue)
![License](https://img.shields.io/badge/License-MIT-green)

<br>

## Overview

Learning complex desktop software often means switching between tutorials, documentation, and the application itself. **sutra** brings intelligence directly into your workflow: ask a question about your screen, receive grounded next-step guidance with live on-screen highlights, and trigger automated desktop actions seamlessly. A cross-platform mobile companion extends complete telemetry and remote control to your mobile device.

| Aspect | Detail |
|---|---|
| **Target Audience** | Students, developers, and power users navigating complex desktop software |
| **Core Problem** | Tutorials and documentation are disconnected from the application interface |
| **Solution** | Screen intelligence, multimodal guidance, visual highlights, voice agents, and optional automation |
| **Database** | **MongoDB exclusively** for persistent application state, session indexing, and user metadata |
| **Object Storage** | **Cloudflare R2** for durable artifact and media asset storage |
| **Package Management** | **npm exclusively** across all monorepo applications and tooling |

---

## Key Capabilities

| Capability | What it does |
|---|---|
| **Sutra Predict** | Embedded predictive intelligence engine (`crates/sutra-predict`) that identifies recurring workflow patterns, calculates transition probabilities via hierarchical 2nd-order Markov modeling, and predicts next desktop actions with verified tool recommendations. |
| **System 1 Decision Engine** | Sub-millisecond (<1ms) non-autoregressive ONNX Transformer classifier (`packages/decision-engine/`) that routes queries before LLM invocation. |
| **sutra Notebook Hub & OKF** | Offline Knowledge Format (OKF) personal workspace (`docs/specifications/OKF.md`) with full-context document reasoning and verified citations. |
| **Pure Rust Agent (`sutra-agent`)** | High-performance native Rust autonomous agent loop (`crates/sutra-agent`) with multi-provider LLM calling (OpenAI, Gemini, Groq, Ollama), tool registry, and embedded vector store. |
| **Screen-Aware Tutoring** | Captures active display, performs OCR combined with accessibility and visual UI detection, and presents step-by-step guidance overlays. |
| **Voice Interaction** | Real-time speech input, voice-agent tool calls, spoken responses, and turn-taking via Sarvam AI and AssemblyAI. |
| **Hey Sutra Wake Word** | Runs the bundled `services/agent/hey_sutra.onnx` model locally via ONNX Runtime for zero-latency hands-free activation. |
| **Linux Desktop Daemon (`sutra-daemon`)** | Native headless Rust daemon for Wayland (Hyprland/wlroots) and X11 with direct `/dev/uinput`, AT-SPI2 DBus trees, and PipeWire capture. |
| **AiCut C++17 & MCP Video Suite** | C++17 core engine, CMake build, faster-whisper forced word aligner, intelligent silence removal, and MCP server (`packages/aicut/aicut_mcp.py`). |
| **Web Research** | SearXNG and Web Intelligence Layer integration for synthesized answers with clickable source citations. |
| **Android Companion App** | Connects to desktop over an authenticated WebSocket with TLS public-key pinning for remote chat, voice, quick actions, and PC controls over LAN, USB, or Tailscale. |
| **Remote Files & Camera Transfer** | Browses PC files, transfers files between mobile and desktop with 16MB streaming chunks, and syncs camera selections directly into AiCut workflows. |
| **PC Power & Wake-on-LAN** | Displays hardware telemetry and supports sleep, hibernate, restart, shutdown, and Wake-on-LAN. |

---

## Tech Stack & Architecture

- **Desktop Frontend**: React 19, TypeScript, Vite, Tailwind CSS / Vanilla styling.
- **Desktop Host**: Tauri 2 (Rust), TLS WebSocket gateway (:9001), File transfer stream (:9002), Antigravity bridge (:9003).
- **Core Rust Crates**: `crates/sutra-agent`, `crates/sutra-daemon`, `crates/sutra-predict`.
- **Backend Services**: Python 3.11+ agent service (`services/agent/`), SearXNG (`services/search/`).
- **Machine Learning**: ONNX Runtime, Gemini 2.5 Flash / Groq / Ollama models, faster-whisper.
- **Mobile Companion**: React Native, Expo, Kotlin/Swift native socket module (`apps/mobile/modules/sutra-secure-socket`).
- **Database**: **MongoDB exclusively** (`MONGODB_URI`).
- **Object Storage**: **Cloudflare R2** (`CLOUDFLARE_R2_*`).
- **Package Manager**: **npm** only.

---

## Installation & Setup

### Prerequisites

| Tool | Version / Requirement | Purpose |
|---|---|---|
| **Node.js & npm** | Node v20+ / npm v10+ | Frontend, tooling, and script execution |
| **Rust Toolchain** | `cargo` stable (1.80+) | Desktop Tauri application and Rust crates |
| **Python** | 3.11+ | Agent services, ONNX inference, decision engine |
| **MongoDB** | 6.0+ (Local or Atlas) | Primary database |
| **Cloudflare R2** | Bucket credentials | Object storage (when configured) |
| **Git** | Standard | Version control |

### 1. Clone & Setup Workspace

```bash
git clone https://github.com/KingSahil/sutra.git
cd sutra
```

### 2. Environment Configuration

The application maintains **exactly one `.env` file** at the project root.

```bash
# Verify or create the single root .env
cat << 'EOF' > .env
# Database & Storage
MONGODB_URI=mongodb://localhost:27017/sutra
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET_NAME=sutra-storage

# AI & Voice Providers
SUTRA_AI_PROVIDER=groq
SUTRA_GROQ_MODEL=qwen/qwen3.8-27b
GROQ_API_KEY=
GEMINI_API_KEY=
SARVAM_API_KEY=
ASSEMBLYAI_API_KEY=

# Sutra Desktop Configuration
SUTRA_VOICE_PROVIDER=assemblyai
SUTRA_SHORTCUT=Space
SUTRA_TRANSPORT_MODE=development
EOF
```

> [!IMPORTANT]
> Never create `.env.example`, `.env.local`, or nested `.env` files. Maintain exactly one `.env` at the repository root.

### 3. Install Dependencies

Using **npm exclusively**:

```bash
npm install
```

### 4. Running Desktop Application

To launch the full desktop environment:

```bash
# Development mode (Vite + Tauri)
npm run dev

# Or build for production
npm run build:release
```

### 5. Running Mobile Companion

```bash
npm run mobile:dev
```

---

## Repository Structure

```
sutra/
├── apps/
│   ├── desktop/              # Tauri 2 host + React 19 frontend
│   │   ├── src/              # UI components, state, hooks, lib
│   │   ├── src-tauri/        # Rust desktop backend, IPC, TLS gateway
│   │   └── package.json
│   └── mobile/               # React Native / Expo Android companion
│       ├── components/       # Mobile screens, modals, components
│       ├── hooks/            # Mobile hooks (WebSocket, audio, telemetry)
│       ├── lib/              # Session manager, vector store, purchases
│       ├── modules/          # Native Kotlin/Swift TLS pinning modules
│       └── package.json
├── crates/
│   ├── sutra-agent/          # Pure Rust autonomous agent loop
│   └── sutra-daemon/         # Headless Linux Wayland/X11 daemon
├── packages/
│   ├── aicut/                # C++17 AiCut video editing engine & MCP server
│   ├── decision-engine/      # Neural decision engine classifier & model
│   └── shared/               # Shared JSON schemas and protocol definitions
├── services/
│   ├── agent/                # Python agent, tools, OCR, wake-word model
│   └── search/               # SearXNG configuration
├── firmware/
│   └── esp32/                # ESP32 universal ambient light daemon
├── scripts/
│   ├── build/                # Release preparation and runtime builders
│   ├── dev/                  # Development orchestration
│   ├── platform/             # OS verification and diagnostic scripts
│   └── tools/                # Utilities and test launchers
├── docs/
│   ├── architecture/         # Architectural blueprints and ADRs
│   ├── guides/               # Setup, compilation, testing, and security guides
│   ├── plans/                # Roadmaps and task specifications
│   └── specifications/       # Formal subsystem specifications
├── .env                      # Single root environment configuration
├── .gitignore                # Git ignore rules (.env, node_modules, target)
├── Cargo.toml                # Rust workspace configuration
├── package.json              # Monorepo root npm configuration
├── ARCHITECTURE.md           # System architecture overview
└── STRUCTURE.md              # Detailed repository tree and module guide
```

---

## Verification & Quality Assurance

Run the verification suite across all subsystems:

```bash
# Typecheck desktop TypeScript
npm run typecheck

# Verify Rust workspace compilation
cargo check --workspace

# Validate Python agent services
python3 -m compileall -q services/agent packages/aicut packages/decision-engine
```

---

## Documentation Index

- [Architecture Overview](ARCHITECTURE.md)
- [Folder & Module Structure](STRUCTURE.md)
- [Compilation & Build Guide](docs/guides/COMPILATION_AND_BUILD_GUIDE.md)
- [Testing & Quality Assurance](docs/guides/TESTING.md)
- [Security & Remote Authentication](docs/guides/SECURITY-REMEDIATION.md)
- [Offline Knowledge Format (OKF)](docs/specifications/OKF.md)
- [Sutra Summary Specification](docs/specifications/SUTRA_SUMMARY.md)

---

## License

This project is licensed under the MIT License.
