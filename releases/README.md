# 📦 Blinky Releases

Official standalone binary distributions for **Blinky v1.1.0** — including the Windows 64-bit Desktop application and the Android Companion APK.

---

## Downloads (v1.1.0)

| Platform              | Package                                                      | Architecture              | Size    | SHA-256 Checksum                                                   |
| :-------------------- | :----------------------------------------------------------- | :------------------------ | :------ | :----------------------------------------------------------------- |
| **Windows Desktop**   | [`Blinky_1.1.0_x64-setup.exe`](./Blinky_1.1.0_x64-setup.exe) | `x86_64`                  | ~201 MB | `6c892703f17ce9ca29a7c3558ecb171f3e30d6b0f6b8b24d7c82a389554fb667` |
| **Android Companion** | [`Blinky-1.1.0.apk`](./Blinky-1.1.0.apk)                     | `arm64-v8a` / `universal` | ~118 MB | `5b723b88ba79dc5910efc41ad2ec4e69e077ea53929917bd62f9af3e25fef213` |

---

## What's New in v1.1.0

- **System 1 Neural Decision Engine:** Sub-millisecond (<1ms) ONNX Transformer intent classifier for zero-latency OS reflexes.
- **Pure Rust Agent (`blinky-agent`):** Native ultra-low memory autonomous agent loop with multi-provider streaming support (Ollama, Groq, Gemini).
- **Blinky Notebook Hub & OKF:** High-density Offline Knowledge Format supporting full-context document reasoning and actionable `"▶ Execute on PC"` citations.
- **AiCut C++17 Video Suite:** Native engine with `faster-whisper` forced alignment and Model Context Protocol (MCP) server for natural language video editing.
- **Enhanced Android Companion:** 16MB chunked bidirectional file streaming, Wake-on-LAN power triggers, Sentinel hardware telemetry, and Android KeyStore credential encryption.
- **Google Gemini 1.5 Pro Support:** First-class multimodal AI support with automated fallback and health verification scripts.

---

## Installation & Setup Guide

### 1. Windows Desktop Installation (`Blinky_1.1.0_x64-setup.exe`)

1. **Download:** Get [`Blinky_1.1.0_x64-setup.exe`](./Blinky_1.1.0_x64-setup.exe).
2. **Run Installer:** Double-click the installer and follow the on-screen setup wizard.
3. **Launch:** Run Blinky from the Start Menu or Desktop shortcut.
4. **First Run Setup:**
   - Press <kbd>Alt</kbd> + <kbd>Space</kbd> (or your configured shortcut) to toggle the floating CommandBar.
   - Configure your AI provider (**Gemini 1.5 Pro**, **Groq**, or local **Ollama**) in the settings menu.

### 2. Android Companion Installation (`Blinky-1.1.0.apk`)

1. **Download:** Transfer [`Blinky-1.1.0.apk`](./Blinky-1.1.0.apk) to your Android device.
2. **Enable Unknown Sources:** If prompted, allow your browser or file manager to install unknown apps (Settings → Apps → Special app access → Install unknown apps).
3. **Install:** Tap the `.apk` file and confirm installation.
4. **Pair with Desktop:**
   - Ensure your phone and PC are connected to the same local network (or USB tethering / Tailscale).
   - In the Blinky desktop app, open the **QR Code** pairing modal.
   - On your phone, open Blinky and scan the desktop QR code to establish an authenticated, TLS-pinned WebSocket connection on port `9001`.

---

## Verification & Checksums

To verify the integrity of your downloaded files before installation:

### Windows (PowerShell):

```powershell
Get-FileHash -Algorithm SHA256 .\Blinky_1.1.0_x64-setup.exe
```

### Linux / macOS (Terminal):

```bash
sha256sum Blinky_1.1.0_x64-setup.exe
sha256sum Blinky-1.1.0.apk
```
