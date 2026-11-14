#!/usr/bin/env bash
# sutra mobile one-click setup (Linux) -- installs deps, prints LAN IP, starts Expo QR.
# Usage:
#   chmod +x setup-mobile.sh && ./setup-mobile.sh
#   ./setup-mobile.sh --tunnel   # ngrok tunnel when phone+PC are on different networks
#   ./setup-mobile.sh --usb      # USB mode: adb reverse + localhost (no Wi-Fi needed)
#   ./setup-mobile.sh --clear    # start Metro with cache cleared (expo start -c)
# Flow: 1) run desktop first (./run.sh)  2) run this script  3) scan QR  4) enter PC IP, tap Establish Link.
set -u
set -o pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; NC='\033[0m'
TUNNEL=0; USB=0; CLEAR=0
for arg in "$@"; do
  case "$arg" in
    --tunnel) TUNNEL=1 ;;
    --usb) USB=1 ;;
    --clear|-c) CLEAR=1 ;;
    --help|-h) echo "Usage: ./setup-mobile.sh [--tunnel] [--usb] [--clear]"; exit 0 ;;
    *) echo -e "${YELLOW}! Unknown flag: $arg${NC}" ;;
  esac
done

step() { echo -e "\n${CYAN}[STEP] $*${NC}"; }
ok()   { echo -e "  ${GREEN}+ $*${NC}"; }
warn() { echo -e "  ${YELLOW}! $*${NC}"; }
fail() {
  echo -e "\n${RED}[ERROR] $1${NC}"
  [ -n "${2:-}" ] && echo -e "  ${YELLOW}Why: $2${NC}"
  [ -n "${3:-}" ] && echo -e "  Fix and retry:\n    $3"
  echo -e "  ${RED}Mobile setup aborted. Fix above, then re-run: ./setup-mobile.sh${NC}\n"
  exit 1
}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"
MOBILE_DIR="$REPO_ROOT/apps/mobile"
echo -e "${MAGENTA}============================================================${NC}"
echo -e "${MAGENTA}  sutra - Mobile One-click Setup (Linux)${NC}"
echo -e "${MAGENTA}  Mobile dir: $MOBILE_DIR${NC}"
echo -e "${MAGENTA}============================================================${NC}"

[ -f "$MOBILE_DIR/package.json" ] \
  || fail "apps/mobile/package.json not found." "Run from the sutra repo root." "cd <path-to-sutra> then ./setup-mobile.sh"

command -v node >/dev/null 2>&1 \
  || fail "Node.js not found." "Node.js is required for Expo Metro bundler." "Install Node.js 20+ (https://nodejs.org)"
command -v npm >/dev/null 2>&1 \
  || fail "npm not found." "npm is required to manage packages." "Install npm (https://nodejs.org)"

step "Installing mobile dependencies (apps/mobile)"
(cd "$MOBILE_DIR" && npm install --prefer-offline) \
  || fail "Mobile npm install failed." "Usually network issues." "cd apps/mobile && npm install  # manual retry"
ok "Mobile deps installed"

step "Checking Expo CLI"
if npx expo --version >/dev/null 2>&1; then ok "Expo $(npx expo --version 2>/dev/null | head -n1)"
else warn "Expo CLI check failed (non-blocking; 'npm run start' will fetch it)."; fi

step "Checking desktop backend (port 9001)"
if (command -v nc >/dev/null 2>&1 && nc -z -w2 127.0.0.1 9001) || (exec 3<>/dev/tcp/127.0.0.1/9001) 2>/dev/null; then
  exec 3<&- 3>&- 2>/dev/null || true
  ok "Desktop backend reachable on 127.0.0.1:9001"
else
  warn "Desktop backend NOT reachable on port 9001."
  echo "    Start desktop first in another terminal:  ./run.sh  (or: npm run dev)"
fi

step "Your PC IP (type this in the phone app, then Establish Link)"
LAN_IP=""
if command -v ip >/dev/null 2>&1; then
  LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' || true)
fi
if [ -n "$LAN_IP" ]; then echo -e "  ${GREEN}PC IP: $LAN_IP :9001${NC}"
else
  warn "Could not auto-detect LAN IP."
fi
if command -v tailscale >/dev/null 2>&1; then
  TS_IP=$(tailscale ip -4 2>/dev/null | head -n1 || true)
  [ -n "$TS_IP" ] && echo -e "  ${GREEN}Tailscale IP: $TS_IP :9001 (use off-LAN)${NC}"
fi

if [ "$USB" = "1" ]; then
  step "USB mode: adb reverse tcp:9001/9002/9004/8081"
  command -v adb >/dev/null 2>&1 \
    || fail "adb not found (needed for --usb)." "Install platform tools and enable USB debugging." "sudo pacman -S android-tools / sudo apt install adb, then ./setup-mobile.sh --usb"
  adb reverse tcp:9001 tcp:9001 || fail "adb reverse 9001 failed." "Phone not connected / USB debugging off."
  adb reverse tcp:9002 tcp:9002
  adb reverse tcp:9004 tcp:9004
  adb reverse tcp:8081 tcp:8081 || true
  ok "USB reverse routing done. In the phone app use IP: localhost"
fi

step "Starting Expo (QR prints below -- scan it)"
ARGS=(run start -- --host lan)
[ "$TUNNEL" = "1" ] && ARGS=(run start -- --tunnel)
[ "$CLEAR" = "1" ] && ARGS+=( -c )
echo ""
echo -e "  ${GREEN}================= PHONE TEST FLOW =================${NC}"
echo "  1) Scan the QR below with Expo Go (or your sutra dev build)."
echo "  2) Phone + PC must be on the SAME Wi-Fi (or --usb mode with IP 'localhost')."
echo "  3) In the app: QR tab (default) - scan pairing code from PC header."
echo "     Or Manual tab: enter PC IP printed above, tap Establish Link."
echo "  Metro keys: r = reload, m = dev menu, a = open app, Ctrl+C = stop."
echo -e "  ${GREEN}====================================================${NC}"
echo ""
(cd "$MOBILE_DIR" && npm "${ARGS[@]}") \
  || fail "Expo failed to start." "See error above." "cd apps/mobile && npm run start"
