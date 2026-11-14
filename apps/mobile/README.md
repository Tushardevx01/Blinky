# sutra Remote Mobile Companion

This directory contains the React Native Expo mobile application that connects to the sutra desktop client over local Wi-Fi, USB, or Tailscale. It enables remote command execution, telemetry monitoring, and secure file transfer.

## Prerequisites

1. Install a **custom sutra development or release build** on the device. The app uses Expo SDK 57 and project-local native modules (`modules/sutra-secure-socket`) for secure connections with TLS certificate pinning and hardware keystore encryption. Expo Go cannot run the native socket modules.

## Setup and Installation

1. Open your terminal and navigate to the mobile directory from the repository root:
   ```bash
   cd apps/mobile
   ```

2. Install dependencies using **npm**:
   ```bash
   npm install
   ```

3. Build and install a new native app whenever Expo SDK, a native package (such as `expo-image-picker`), or native app configuration changes. For an internal Android APK, run:
   ```bash
   npx eas-cli init
   npm run build:release
   ```
   The build profiles are defined in [eas.json](eas.json).

## Running the Application

### Local Android Debug Testing

The debug APK intentionally uses Android's debuggable flag and the RevenueCat test configuration. It loads JavaScript from Metro, so install it with `install_apk.bat` (debug is the default), then start the PC development app from the repository root with `npm run dev`. The launcher starts Metro, forwards USB ports 9001, 9002, 9004, and 8081, and launches the mobile app. For a USB connection, use `localhost` in the mobile app.

1. Ensure your computer and mobile device are connected to the **same local Wi-Fi network**.
2. From the repository root, start the mobile development server:
   ```bash
   npm run mobile:dev
   ```
   Or inside `apps/mobile`:
   ```bash
   npm run start:clear
   ```
3. Open the Metro link in the installed sutra development build. A release APK uses its bundled JavaScript and does not need Metro.

## Connecting to Sutra Desktop

Release builds open the link setup on the **QR** tab by default; debug builds show the manual form directly.

**Option A — QR (release builds only, fastest, recommended)**
1. Make sure sutra is running on your desktop PC (`npm run dev`).
2. In the PC app, click the **QR icon** in the sutra header to display the pairing code.
3. In the mobile app's **QR** tab, point the camera at the code — pairing connects instantly.

**Option B — Manual Connection**
1. Make sure sutra is running on your desktop PC (`npm run dev`).
2. Obtain your computer's local IP address (`ipconfig` on Windows or `ip route get 1.1.1.1` on Linux).
3. Switch to the **Manual** tab, input your PC's IP address (e.g., `192.168.1.15`).
   Release builds also need the remote token and certificate pin (displayed in the PC settings).
4. Tap **Establish Link** to connect.

## Capabilities

- **Power Actions**: Sleep, Restart, Shut Down, Wake-on-LAN.
- **Remote Queries**: AI and browser queries over the desktop WebSocket connection on port 9001 (WS in development, WSS in release).
- **Streaming Telemetry**: Real-time CPU, RAM, and GPU statistics.
- **File Transfer**: Transfer multiple files to a selected PC folder with 16MB chunked streaming on port 9002, with optional AiCut edits.
- **Grounded Research**: Standalone mobile document search and offline knowledge format (OKF) reasoning with encrypted API keys stored in Android KeyStore.
