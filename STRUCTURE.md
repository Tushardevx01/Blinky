# Sutra Project Structure

This document provides a comprehensive map of the refactored **Sutra** repository structure, outlining the purpose, contents, and boundaries of every directory and module.

---

## Complete Directory Tree

```
sutra/
├── .env                                  # Single root environment configuration (git ignored)
├── .gitignore                            # Root gitignore (.env, node_modules, target, etc.)
├── Cargo.lock                            # Rust dependency lockfile
├── Cargo.toml                            # Root Cargo workspace manifest
├── package.json                          # Monorepo root npm configuration
├── package-lock.json                     # Monorepo npm dependency lockfile
├── tsconfig.json                         # Root TypeScript configuration
├── run.sh                                # Linux development launcher (npm / node)
├── run.ps1                               # Windows development launcher (npm / node)
├── setup.sh                              # Linux environment setup script
├── setup.ps1                             # Windows environment setup script
├── setup-mobile.sh                       # Linux mobile setup script
├── setup-mobile.ps1                      # Windows mobile setup script
├── README.md                             # Project overview, quickstart & documentation
├── ARCHITECTURE.md                       # Architectural blueprints, security & runtime flows
├── STRUCTURE.md                          # Detailed directory structure & module map (this file)
│
├── apps/                                 # User-facing applications
│   ├── desktop/                          # Desktop application (Tauri 2 + React 19)
│   │   ├── index.html                    # HTML entry point with Sutra mascot icon
│   │   ├── package.json                  # Desktop package configuration
│   │   ├── tsconfig.json                 # Desktop TypeScript configuration
│   │   ├── vite.config.ts                # Vite build configuration
│   │   ├── public/                       # Static public assets
│   │   │   └── sutra_mascot_logo.png     # Sutra brand mascot logo
│   │   ├── src/                          # React 19 Frontend source code
│   │   │   ├── App.tsx                   # Main desktop UI application shell
│   │   │   ├── main.tsx                  # React entry point
│   │   │   ├── CommandBar.tsx            # Floating spotlight/command bar component
│   │   │   ├── SettingsModal.tsx         # Desktop configuration & preferences dialog
│   │   │   ├── QrPairingModal.tsx        # Mobile device pairing QR code display
│   │   │   ├── components/               # Modular desktop UI components
│   │   │   ├── hooks/                    # Desktop React hooks (shortcuts, speech, IPC)
│   │   │   ├── lib/                      # Tauri IPC helpers, session storage, sarvam streaming
│   │   │   ├── theme/                    # Design tokens, color palettes & typography
│   │   │   └── types/                    # Desktop TypeScript definitions
│   │   ├── src-tauri/                    # Native Rust host backend
│   │   │   ├── Cargo.toml                # Desktop crate dependencies (tauri, tokio, etc.)
│   │   │   ├── build.rs                  # Build script (tracks SUTRA_TRANSPORT_MODE)
│   │   │   ├── tauri.conf.json           # Tauri v2 application configuration
│   │   │   ├── icons/                    # Desktop icon assets
│   │   │   └── src/                      # Rust host implementation
│   │   │       ├── main.rs               # Binary entry point (invokes sutra_lib::run)
│   │   │       ├── lib.rs                # Library root, IPC commands, window supervisors
│   │   │       ├── file_transfer.rs      # Port 9002 16MB chunked file streaming receiver
│   │   │       ├── websocket.rs          # Port 9001 WSS gateway with P-256 certificate pinning
│   │   │       ├── transport.rs          # Transport mode contracts (development vs release)
│   │   │       └── platform/             # Windows/Linux platform specifics & CUA drivers
│   │   └── tests/                        # Desktop frontend unit & integration tests
│   │       ├── secureSpeech.test.ts      # Native speech lifecycle tests
│   │       └── test-framework.ts         # Lightweight Node.js test runner shim
│   │
│   └── mobile/                           # Mobile companion application (React Native / Expo)
│       ├── App.tsx                       # Mobile application entry point & router
│       ├── APP-FLOW.md                   # Mobile interaction flows and lifecycle spec
│       ├── app.json                      # Expo application manifest
│       ├── eas.json                      # Expo Application Services build configurations
│       ├── index.ts                      # React Native entry point
│       ├── metro.config.js               # Metro bundler configuration
│       ├── package.json                  # Mobile package configuration
│       ├── tsconfig.json                 # Mobile TypeScript configuration
│       ├── README.md                     # Mobile setup, pairing, and build instructions
│       ├── assets/                       # Mascot images, splash screen, and icons
│       ├── components/                   # Mobile screens, drawers & modals
│       │   ├── ChatTab.tsx               # AI Autopilot interactive chat screen
│       │   ├── NotebookScreen.tsx        # Offline Knowledge Format (OKF) document hub
│       │   ├── FilesScreen.tsx           # Remote PC file browser & transfer UI
│       │   ├── TelemetryScreen.tsx       # Live hardware telemetry monitoring (CPU/RAM/GPU)
│       │   ├── SettingsModal.tsx         # Mobile preferences & server connection settings
│       │   ├── SessionHistoryModal.tsx   # Persistent session management drawer
│       │   ├── PromoCodeModal.tsx        # In-app promo code redemption modal
│       │   ├── MessageBubble.tsx         # Chat message render bubble
│       │   └── MarkdownRenderer.tsx      # Fast native markdown renderer
│       ├── hooks/                        # Mobile React hooks
│       │   └── usePCWebSocket.ts         # WebSocket communication with auto-reconnect
│       ├── lib/                          # Mobile business logic & storage
│       │   ├── session_manager.ts        # Persistent chat session manager
│       │   ├── mobile_rag_db.ts          # On-device vector store and TF-IDF matcher
│       │   ├── secure_keys.ts            # Android KeyStore AES-256 encrypted credential store
│       │   ├── purchases.ts              # RevenueCat entitlements & promo validation
│       │   ├── wol.ts                    # Wake-on-LAN magic packet UDP transmitter
│       │   └── fileTransferOffer.ts      # File transfer staging & intent detection
│       ├── modules/                      # Project-local native modules
│       │   └── sutra-secure-socket/      # Pinned TLS socket module (Kotlin/Swift/C++)
│       ├── scripts/                      # Mobile helper scripts (allow_firewall.bat)
│       ├── theme/                        # Mobile styling tokens and colors
│       ├── types/                        # Mobile TypeScript type definitions
│       └── tests/                        # Mobile test suite (Node.js test-framework)
│
├── crates/                               # Independent Rust workspace crates
│   ├── sutra-agent/                      # Pure Rust autonomous agent loop
│   │   ├── Cargo.toml                    # Agent crate manifest
│   │   └── src/                          # Agent loop, LLM providers (Groq/Ollama), tools
│   └── sutra-daemon/                     # Headless Linux Wayland/X11 daemon
│       ├── Cargo.toml                    # Daemon crate manifest
│       ├── sutra-daemon.service          # Systemd user service unit
│       └── src/                          # Direct /dev/uinput, AT-SPI2 DBus, PipeWire capture
│
├── packages/                             # Shared libraries and native engines
│   ├── aicut/                            # C++17 video processing engine
│   │   ├── CMakeLists.txt                # Native build configuration
│   │   ├── aicut_mcp.py                  # Model Context Protocol (MCP) server
│   │   └── src/                          # Word-level alignment, silence removal, cut execution
│   ├── decision-engine/                  # Neural reflex classifier
│   │   ├── pyproject.toml                # Python package configuration
│   │   ├── model/                        # ONNX Transformer weights and tokenizer
│   │   └── decision_engine/              # Sub-millisecond (<1ms) inference & training scripts
│   └── shared/                           # Shared schemas and data contracts
│       └── clicky-result.schema.json     # Standard tutor result schema
│
├── services/                             # Background backend services
│   ├── agent/                            # Multimodal Python agent service
│   │   ├── main.py                       # Service entry point
│   │   ├── agent_router.py               # Route intent dispatcher
│   │   ├── wake_word.py                  # Wake word listener using hey_sutra.onnx
│   │   ├── hey_sutra.onnx                # Local ONNX wake word detection model
│   │   ├── ui_observer.py                # Background UI state observer
│   │   ├── ai/                           # Cloud and local LLM clients (Groq, Gemini, Ollama)
│   │   ├── computer_use/                 # Bounded action actuator, cursor bridge, grounder
│   │   ├── ocr/                          # Screen OCR (WinRT, Tesseract, OmniParser)
│   │   ├── tools/                        # Agent tool implementations (browser, apps, ESP32)
│   │   ├── wil/                          # Web Intelligence Layer & SearXNG client
│   │   └── tests/                        # Python unit and integration test suite
│   └── search/                           # SearXNG private search service
│       ├── docker-compose.yml            # Docker deployment manifest
│       └── settings.yml                  # SearXNG service settings
│
├── firmware/                             # Microcontroller hardware firmware
│   └── esp32/                            # ESP32 universal ambient light daemon
│       ├── SutraUniversalDaemon.ino      # Arduino C++ main firmware
│       └── config.h                      # Hardware pins & Wi-Fi configuration header
│
├── scripts/                              # Build, dev, platform, and maintenance tooling
│   ├── build/                            # Production build & packaging scripts
│   │   ├── build-release.ts              # Pure Node.js release builder
│   │   ├── prepare-python-runtime.mjs    # Bundled Python runtime packager
│   │   └── prepare-whatsapp-backend.mjs  # WhatsApp backend preparer
│   ├── dev/                              # Development process orchestrators
│   │   ├── dev.ts                        # Unified Node.js dev process supervisor
│   │   └── start-dev-session.ps1         # Windows dev session launcher
│   ├── platform/                         # OS-specific setup and diagnostics
│   │   ├── check-ollama.sh / .ps1        # Ollama health checks
│   │   ├── groq-check.sh                 # Groq connectivity validation
│   │   ├── setup-python.sh / .ps1        # Python virtualenv setup
│   │   └── enable-windows-paging.ps1     # Windows memory optimization
│   └── tools/                            # Utility scripts
│       ├── generate_esp32_config.py      # Generates firmware config.h from root .env
│       ├── launch_edge_debug.bat         # Edge CDP launcher
│       └── verify-overlay-input.py       # Overlay input verification
│
└── docs/                                 # Centralized project documentation
    ├── architecture/                     # Architecture blueprints, ADRs, runtime flows
    │   ├── ARCHITECTURE.md               # Detailed architectural specification
    │   ├── RUNTIME-FLOWS.md              # Request & data flow sequences
    │   └── ADR.md                        # Architectural Decision Records
    ├── assets/                           # Diagrams, mascots, and pipeline graphics
    │   ├── sutra_mascot_logo.png         # Sutra mascot visual asset
    │   ├── logo_text.png                 # Main project logo
    │   └── wakeword_engine_Arch_pipeline.png # Wake word architecture diagram
    ├── guides/                           # Step-by-step developer guides
    │   ├── COMPILATION_AND_BUILD_GUIDE.md # Build instructions for all platforms
    │   ├── CONFIGURATION.md              # Environment variables & configuration
    │   ├── TESTING.md                    # Verification & testing procedures
    │   ├── SECURITY-REMEDIATION.md       # Token security & TLS pinning guidelines
    │   ├── REVENUECAT-AND-ANDROID-DISTRIBUTION-GUIDE.md # Mobile distribution
    │   └── LINUX_QUICK_START.md          # Linux environment setup
    ├── plans/                            # Roadmaps and implementation plans
    │   ├── tasks.md                      # Milestone checklists
    │   └── shipathon-description.md      # Hackathon submission summary
    └── specifications/                   # Subsystem technical specifications
        ├── SUTRA_SUMMARY.md              # Executive architectural summary
        ├── SUTRA-DAEMON-SPEC.md          # Linux daemon specification
        ├── OKF.md                        # Offline Knowledge Format specification
        ├── OKF_RAG_ACTION_PLAN.md        # RAG action plan
        └── AICUT_VIDEO_EDITOR.md         # Video editor specification
```

---

## Architectural Boundaries

1. **Frontend / Backend Boundary:** `apps/desktop/src` communicates with `apps/desktop/src-tauri` strictly via typed Tauri IPC commands. No direct OS system calls are made from the frontend.
2. **Desktop / Mobile Boundary:** `apps/mobile` connects to desktop strictly over WebSocket port 9001 (control) and HTTP port 9002 (file transfer). In release builds, WSS is enforced with SHA-256 certificate pinning.
3. **Data Boundary:** Persistent application data interfaces with offline-first local SQLite and filesystem storage.
4. **Environment Boundary:** Exactly one `.env` file exists at the repository root. It is ignored by Git and never committed.
