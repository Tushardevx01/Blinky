# SUTRA — Official UI/UX Design Direction

**Product:** SUTRA (सूत्र)  
**Tagline:** Connect. Understand. Act.  
**Product Type:** AI-powered desktop application with a mobile companion.

---

## 1. Design Philosophy

Build a premium, minimalist, white-first cross-platform application that feels like an intelligent operating companion rather than a conventional AI chatbot or SaaS dashboard.

The interface must prioritise:
- **Clarity:** Uncluttered layouts, high-legibility typography, clear hierarchy.
- **Contextual Awareness:** The interface constantly surfaces what SUTRA sees on the desktop and connected devices.
- **Effortless Navigation:** Predictable, low-friction interactions across both desktop and mobile form factors.
- **Functional Transparency:** The user always understands what the AI is planning, executing, and requesting permission for.

**Design Benchmark:** Apple-level simplicity, Linear-level organisation, and a unique contextual AI interaction model.

---

## 2. Visual Identity & Design Tokens

### Color Palette

| Token | Hex / Value | Role |
| :--- | :--- | :--- |
| **Primary Background** | `#FFFFFF` | Main surface, pure white, clean canvas |
| **Secondary Background** | `#F7F6FA` | Subtle off-white for sidebars, secondary panels, card backgrounds |
| **Primary Accent** | `#7653D6` | Muted violet for primary CTAs, active states, key focus points |
| **Secondary Accent** | `#EDE7FC` | Soft lavender for badges, selected pills, subtle highlight tint |
| **Primary Typography** | `#24212D` | Deep charcoal for maximum contrast and readability |
| **Secondary Typography** | `#6B6678` | Balanced neutral slate for secondary metadata and subtitles |
| **Muted Typography** | `#9E9AA8` | Subtle grey for hints, disabled states, timestamps |
| **Borders** | `#E9E6EF` | Subtle grey-lavender hairline borders separating panels |
| **Border Light** | `#F1EFF6` | Ultra-light dividers within cards and list items |
| **Success** | `#10B981` | Positive action confirmation, device connected status |
| **Warning / Pending** | `#F59E0B` | Approval needed, awaiting human confirmation |
| **Danger / Destructive** | `#EF4444` | Rejected task, disconnected state, critical alert |

### Typography
- **Font Families:** `Inter`, `Geist`, or clean system sans-serif (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`).
- **Hierarchy:**
  - Display / Title: 24–32px, Semibold (600) / Bold (700), tight letter-spacing (`-0.03em`).
  - Section Header: 16–18px, Semibold (600), letter-spacing (`-0.015em`).
  - Body: 14–15px, Regular (400) / Medium (500), comfortable line height (1.5).
  - Caption / Meta: 12–13px, Medium (500) / Regular (400).
  - Code / Keystroke: Monospace, 12–13px, clean badge style.

### Iconography & Geometry
- **Icons:** Consistent [Lucide](https://lucide.dev) iconography (1.5px – 2px stroke weight).
- **Corners / Border Radius:**
  - Cards & Containers: `12px` – `16px`.
  - Buttons & Inputs: `8px` – `12px`.
  - Badges & Pills: `9999px` (fully rounded).
- **Shadows:** Restrained, crisp, and subtle. Avoid heavy blurry drop shadows:
  - Low: `0 1px 2px 0 rgba(36, 33, 45, 0.04)`
  - Medium: `0 4px 16px -2px rgba(36, 33, 45, 0.06), 0 1px 3px 0 rgba(36, 33, 45, 0.03)`
  - Elevated / Modal: `0 12px 32px -4px rgba(36, 33, 45, 0.10), 0 2px 6px -1px rgba(36, 33, 45, 0.04)`
- **Animations:** Purposeful, smooth, and lightweight (150ms – 250ms ease-out transitions). Avoid gratuitous delays.

### Styling Restraints
- **Avoid:** Excessive gradients, neon glow effects, heavy glassmorphism, glossy 3D objects, unnecessary stock illustrations, and generic chatbot layouts.

---

## 3. Desktop Application Architecture

The Desktop application is designed as a focused multi-panel workspace:

```
+-----------------------------------------------------------------------------------------------+
| SUTRA  [Connected: Pixel 8 Pro ●]                         [Model: Claude 3.5 Sonnet ▾] [_][□][X]|
+-----------+-----------------------------------------------+-----------------------------------+
| Side Nav  | Central AI Assistant Workspace                | Contextual Screen-Awareness Panel |
|           |                                               |                                   |
| • Chat    |  - SUTRA AI Orb & Command input               |  - Live screen thumbnail & state  |
| • Tasks   |  - Conversational message stream              |  - Focused application detection  |
| • Screen  |  - Task Execution Timeline                    |  - Detected UI elements & bounds  |
| • Devices |  - Human Approval Cards                       |  - Quick contextual actions       |
| • Memory  |  - Code & document inspection tabs            |                                   |
| • Settings|                                               |-----------------------------------|
|           |                                               | Connected Device Status           |
|           |                                               |  - Battery, sync, network latency |
+-----------+-----------------------------------------------+-----------------------------------+
```

### Core Desktop Panels:
1. **Navigation Sidebar:** Compact, collapsible sidebar with direct access to Chat, Tasks, Screen Vision, Connected Devices, Memory/Knowledge Hub, and Settings.
2. **Central AI Assistant Workspace:** The primary command and conversation area. Houses the SUTRA interactive input, conversational messages, structured tool responses, and human-in-the-loop approval cards.
3. **Contextual Screen-Awareness Panel:** Real-time visibility into what SUTRA perceives on the user's active monitor: active window title, screen thumbnail, OCR/detected interactive elements, and proactive contextual suggestions.
4. **Connected-Device Status:** Displays active companion devices (mobile, ESP32 hardware, secondary computers) with live connection health and quick actions.
5. **Task Execution and Activity Timeline:** Linear step-by-step audit of ongoing multi-step agent actions (e.g., "Inspecting browser DOM" → "Clicking Submit" → "Verifying result").
6. **Permission and Approval Interface:** High-visibility, security-first confirmation dialogs for destructive, filesystem, or sensitive API operations.
7. **Settings, Model Selection and Personal Knowledge Hub:** Switch models (Hermes, Claude, GPT-4o, Gemini, Local Ollama), configure OCR/vision rates, and manage persistent memory/vector index.

---

## 4. Mobile Companion Experience

A native-feeling, tactile mobile experience optimized for one-handed operation and companion control:

### Core Mobile Views:
1. **Onboarding & Desktop Pairing:** Seamless QR-code scanning or local network discovery to link with the desktop SUTRA daemon.
2. **Connected-Device Home Screen:** Immediate overview of connected desktop status, current active desktop application, recent timeline events, and battery/sync status.
3. **AI Conversation Interface:** Clean, light chat view with deep charcoal typography, soft lavender message bubbles for user queries, and white cards with subtle borders for SUTRA responses.
4. **Voice Assistant with Animated State-Responsive Orb:** Fullscreen or bottom-sheet voice mode featuring the fluid SUTRA Orb reacting dynamically to voice input.
5. **Task Activity and Approval Centre:** Push-notification driven approval queue where the user can inspect desktop agent proposals (with screenshots) and tap **Approve** or **Decline**.
6. **Device Management and Settings:** Manage paired machines, permissions, audio devices, and model routing.

---

## 5. Signature Components & States

### 1. SUTRA AI Orb
The central brand expression of SUTRA's awareness. Smoothly transforms between states using muted violet (`#7653D6`) and soft lavender (`#EDE7FC`):
- **Idle:** Gentle, slow rhythmic breathing pulse.
- **Listening:** Dynamic wave responsiveness to ambient audio amplitude.
- **Thinking:** Internal rotational swirl / fluid orbit.
- **Responding:** Soft radiant bloom with gentle cadence matching speech output.
- **Executing:** Sharp, focused kinetic pulse indicating active desktop automation.

### 2. Live Desktop Context Cards
Card components displaying:
- Current active window and app icon (e.g. VS Code, Chrome, Terminal).
- Bounding-box highlights of interactable targets.
- Timestamp of last screen capture with OCR confidence.

### 3. Contextual Action Suggestions
Subtle pill buttons (lavender background `#EDE7FC`, violet text `#7653D6`) offering high-probability next steps based on the user's desktop context.

### 4. Agent Execution Timeline
Step-by-step tree showing:
- Status indicators (Completed, In-progress, Queued, Blocked).
- Expandable logs with tool names, parameters, and execution duration.

### 5. Human Approval Cards
Prominent security gate with:
- Clear summary of the requested action (e.g., "Run shell command: `rm -rf ./tmp`").
- Risk level badge (Low, Medium, Critical).
- Two primary buttons: **Approve Action** (Muted Violet) and **Decline** (Subtle outline).

### 6. Connected-Device Indicators
Pill badge with a subtle pulsing green dot indicating real-time WebSocket / WebRTC connection to companion devices.

### 7. Screen-Element Highlighting
Non-intrusive bounding boxes overlaid on the screen or preview thumbnail, rendering coordinates with high-contrast violet accent borders.

---

## 6. UX Principles & Rules of Engagement

1. **Make the AI's current state obvious:** The user should never wonder if the system is listening, thinking, stalled, or executing.
2. **Show what the AI sees, plans, and executes:** Provide visual evidence of screen OCR, planned steps, and output tokens.
3. **Explain actions before performing them:** For any automated desktop interaction (mouse clicks, keystrokes, CLI commands), show the intent before the execution.
4. **Require confirmation for sensitive operations:** File deletion, payment processing, sending messages, or executing privileged shell commands always require explicit approval.
5. **Display actual execution status:** Accurate progress bars and step counters rather than generic infinite spinners.
6. **Keep navigation predictable:** Clear top-level views without deeply nested hidden menus.
7. **Accessible contrast and readable typography:** All text elements meet WCAG AA contrast standards against `#FFFFFF` and `#F7F6FA`.
8. **Platform-native ergonomics:** Desktop leverages keyboard shortcuts (`Cmd/Ctrl + K`, multi-panel views), while Mobile leverages bottom navigation, haptics, and swipe gestures.
