#!/usr/bin/env bash
# sutra one-click setup (Linux). Idempotent; safe to re-run.
# Usage:
#   chmod +x setup.sh && ./setup.sh
#   ./setup.sh --run           # setup + immediately run the app (npm run dev)
#   ./setup.sh -y              # auto-confirm installs (CI or headless)
#   ./setup.sh --skip-mobile   # skip apps/mobile deps (faster PC-only setup)
# Any failure prints [ERROR] + exact fix command.
set -u
set -o pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; NC='\033[0m'
LOG_FILE="setup.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo -e "\n=== sutra Setup Started: $(date) ==="

RUN_APP=0; ASSUME_YES=0; SKIP_MOBILE=0
for arg in "$@"; do
  case "$arg" in
    --run) RUN_APP=1 ;;
    -y|--yes) ASSUME_YES=1 ;;
    --skip-mobile) SKIP_MOBILE=1 ;;
    --help|-h)
      echo "Usage: ./setup.sh [--run] [-y|--yes] [--skip-mobile]"
      echo "  --run          setup + launch 'npm run dev' at the end"
      echo "  -y, --yes      auto-confirm installs"
      echo "  --skip-mobile  skip apps/mobile deps"
      exit 0 ;;
    *) echo -e "${YELLOW}Unknown option: $arg (ignored)${NC}" ;;
  esac
done

step() { echo -e "\n${CYAN}[STEP] $*${NC}"; }
ok()   { echo -e "  ${GREEN}+ $*${NC}"; }
warn() { echo -e "  ${YELLOW}! $*${NC}"; }
fail() {
  echo -e "\n${RED}[ERROR] $1${NC}"
  [ -n "${2:-}" ] && echo -e "  ${YELLOW}Why: $2${NC}"
  [ -n "${3:-}" ] && echo -e "  Fix and retry:\n    $3"
  echo -e "  ${RED}Setup aborted. Fix the error above and re-run: ./setup.sh${NC}\n"
  exit 1
}
confirm_install() {
  [ "$ASSUME_YES" = "1" ] && return 0
  echo -e -n "  ${YELLOW}Install $1 automatically? [Y/n]: ${NC}"
  read -r ans
  case "$ans" in
    [nN]|[nN][oO]) return 1 ;;
    *) return 0 ;;
  esac
}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"
echo -e "${MAGENTA}============================================================${NC}"
echo -e "${MAGENTA}  sutra - One-click Linux Setup${NC}"
echo -e "${MAGENTA}  Repo: $REPO_ROOT  Flags: run=$RUN_APP yes=$ASSUME_YES skip_mobile=$SKIP_MOBILE${NC}"
echo -e "${MAGENTA}============================================================${NC}"

# -- 1. Node.js and npm ---------------------------------------------------
step "Checking Node.js & npm (required)"
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is required but was not found." "Node.js runs the desktop build and dev tooling." "Ubuntu: sudo apt install nodejs npm | Arch: sudo pacman -S nodejs npm (https://nodejs.org)"
fi
if ! command -v npm >/dev/null 2>&1; then
  fail "npm is required but was not found." "npm manages JavaScript packages." "Ubuntu: sudo apt install npm | Arch: sudo pacman -S npm"
fi
ok "Node $(node --version)"
ok "npm $(npm --version)"

# -- 2. Rust/Cargo --------------------------------------------------------
step "Checking Rust/Cargo (required for Tauri)"
if command -v cargo >/dev/null 2>&1; then
  ok "$(cargo --version)"
else
  warn "Cargo/Rust not found."
  if confirm_install "Rust via rustup"; then
    echo "  Installing Rust via rustup.rs (stable toolchain)..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
      || warn "rustup install failed -- see output above."
    # shellcheck disable=SC1091
    [ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"
    export PATH="$HOME/.cargo/bin:$PATH"
  fi
  if command -v cargo >/dev/null 2>&1; then
    ok "$(cargo --version) (just installed -- if 'npm run dev' still says cargo missing, restart terminal)"
  else
    echo -e "  ${RED}[ERR] Rust is REQUIRED to run/build the Tauri app.${NC}"
    echo -e "  ${YELLOW}Hint: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  (or: sudo pacman -S rust / sudo apt install cargo)${NC}"
    echo -e "  ${YELLOW}Continuing setup so JS/Python still install, but 'npm run dev' WILL fail until Rust exists.${NC}"
  fi
fi

# -- 2b. Tauri Linux system libs ------------------------------------------
step "Checking Tauri Linux system libraries"
MISSING_SYS=""
if command -v pkg-config >/dev/null 2>&1; then ok "pkg-config present"; else warn "pkg-config missing. Ubuntu: sudo apt install pkg-config build-essential libssl-dev libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev"; MISSING_SYS="$MISSING_SYS pkg-config"; fi
if pkg-config --exists webkit2gtk-4.1 2>/dev/null || pkg-config --exists webkit2gtk-4.0 2>/dev/null; then ok "webkit2gtk present"; else warn "webkit2gtk missing (Tauri needs it). Ubuntu: sudo apt install libwebkit2gtk-4.1-dev | Arch: sudo pacman -S webkit2gtk-4.1"; fi
if [ -n "$MISSING_SYS" ]; then warn "Install the packages above before 'npm run dev', or the Rust build will fail with 'library not found'."; fi

# -- 3. Python 3.11+ ------------------------------------------------------
step "Checking Python 3.11+ (required)"
PYTHON_BIN=""
for cand in python3.13 python3.12 python3.11 python3 python; do
  if command -v "$cand" >/dev/null 2>&1; then
    if "$cand" -c "import sys; exit(0 if sys.version_info >= (3,11) else 1)" 2>/dev/null; then
      PYTHON_BIN="$cand"; break
    fi
  fi
done
if [ -z "$PYTHON_BIN" ]; then
  fail "Python 3.11+ is required but was not found." "The Python daemon (OCR, AI routing, automation) cannot run without it." "Ubuntu: sudo apt install python3.11 python3-venv python3-pip   Arch: sudo pacman -S python   (https://python.org) then re-run ./setup.sh"
fi
ok "Found $($PYTHON_BIN --version) via $PYTHON_BIN"
"$PYTHON_BIN" -m venv --help >/dev/null 2>&1 \
  || fail "python venv module missing." "Debian/Ubuntu splits it into a separate package." "sudo apt install python3-venv   (Arch: already in python) then re-run ./setup.sh"

# Optional tools
step "Checking optional tools"
if command -v docker >/dev/null 2>&1; then ok "$(docker --version) -- enables local SearXNG search"; else warn "Docker not found (optional). Without it web search is disabled; use --no-docker."; fi
if command -v ollama >/dev/null 2>&1; then ok "$(ollama --version 2>&1 | head -n1) -- needed only if SUTRA_AI_PROVIDER=ollama"; else warn "Ollama not found (optional)."; fi
if command -v tesseract >/dev/null 2>&1; then ok "Tesseract $(tesseract --version 2>&1 | head -n1)"; else warn "Tesseract missing -- OCR fallback may fail. sudo apt install tesseract-ocr"; fi
if gst-inspect-1.0 --version >/dev/null 2>&1; then ok "GStreamer $(gst-inspect-1.0 --version 2>&1 | head -n1)"; else warn "GStreamer missing -- audio may fail."; fi

# -- 4. npm install (desktop) ---------------------------------------------
step "Installing desktop JS dependencies (npm install)"
[ -f "$REPO_ROOT/package.json" ] \
  || fail "package.json not found in $REPO_ROOT." "You are not in the sutra repo root." "cd <path-to-sutra> then re-run ./setup.sh"
npm install --prefer-offline \
  || fail "npm install failed." "Usually network, locked files, or package issues." "npm install"
ok "Desktop JS dependencies installed"

# -- 5. Python venv + deps + Playwright ------------------------------------
step "Setting up Python virtual environment (.venv)"
VENV_PATH="$REPO_ROOT/.venv"; VENV_PYTHON="$VENV_PATH/bin/python"
REQUIREMENTS="$REPO_ROOT/services/agent/requirements/requirements-linux.txt"
[ -f "$REQUIREMENTS" ] || fail "requirements-linux.txt not found." "Repo checkout incomplete." "git pull then re-run ./setup.sh"
if [ ! -f "$VENV_PYTHON" ]; then
  echo "  Creating .venv with $PYTHON_BIN..."
  "$PYTHON_BIN" -m venv "$VENV_PATH" \
    || fail "Failed to create .venv." "Broken Python or missing venv module." "$PYTHON_BIN -m venv .venv --clear  # manual retry, then re-run ./setup.sh"
  ok ".venv created at $VENV_PATH"
else
  ok ".venv already exists at $VENV_PATH"
fi

step "Installing Python dependencies (may take 2-5 min)"
"$VENV_PYTHON" -m pip install --upgrade pip \
  || fail "pip upgrade failed." "No internet or broken venv." ".venv/bin/python -m pip install --upgrade pip  # manual retry"
ok "pip upgraded"
"$VENV_PYTHON" -m pip install -r "$REQUIREMENTS" \
  || fail "pip install failed." "Check $REQUIREMENTS vs Python version (3.11+)." ".venv/bin/python -m pip install -r $REQUIREMENTS  # manual retry"
ok "Python packages installed"

step "Installing Playwright Chromium"
"$VENV_PYTHON" -m playwright install chromium \
  || fail "Playwright install failed." "Browser automation needs this." ".venv/bin/python -m playwright install chromium  # manual retry"
ok "Playwright Chromium installed"
if command -v npx >/dev/null 2>&1; then
  echo "  Installing Playwright system deps (may need sudo, non-blocking)..."
  "$VENV_PYTHON" -m playwright install-deps chromium 2>&1 | tail -n 20 || warn "playwright install-deps had warnings"
fi

# -- 6. .env validation ---------------------------------------------------
step "Validating single root .env"
ENV_PATH="$REPO_ROOT/.env"
if [ ! -f "$ENV_PATH" ]; then
  cat > "$ENV_PATH" <<'EOF'
SUTRA_AI_PROVIDER=groq
GROQ_API_KEY=
SARVAM_API_KEY=
SUTRA_SHORTCUT=Space
EOF
  ok ".env created (minimal) -- EDIT IT"
else
  ok ".env already exists (not overwritten)"
fi
PROVIDER=$(grep -E "^SUTRA_AI_PROVIDER=" "$ENV_PATH" 2>/dev/null | cut -d= -f2 | tr -d ' \r' || echo groq)
if [ "$PROVIDER" = "groq" ] && ! grep -qE "^GROQ_API_KEY=gsk_" "$ENV_PATH" 2>/dev/null; then
  warn "GROQ_API_KEY is empty but SUTRA_AI_PROVIDER=groq. App WILL start but AI answers will 401."
else
  ok ".env provider/key check done (provider=$PROVIDER)"
fi

# Tesseract local fallback
if [ ! -f "packages/shared/tessdata/eng.traineddata" ] && ! command -v tesseract >/dev/null 2>&1; then
  warn "No tesseract data found. If you lack sudo, run:"
  echo "    mkdir -p packages/shared/tessdata && curl -L -o packages/shared/tessdata/eng.traineddata https://github.com/tesseract-ocr/tessdata_fast/raw/main/eng.traineddata"
fi

# -- 7. Mobile deps -------------------------------------------------------
if [ "$SKIP_MOBILE" = "1" ]; then
  step "Skipping mobile deps (--skip-mobile)"
  warn "Mobile skipped. Run later: ./setup-mobile.sh"
else
  step "Installing mobile companion deps (apps/mobile)"
  if [ ! -f "$REPO_ROOT/apps/mobile/package.json" ]; then
    warn "apps/mobile/package.json not found -- skipping mobile deps."
  else
    (cd "$REPO_ROOT/apps/mobile" && npm install --prefer-offline) \
      || warn "Mobile deps failed (non-blocking for desktop). Fix: cd apps/mobile && npm install; then ./setup-mobile.sh"
    ok "Mobile deps installed. Run mobile QR setup: ./setup-mobile.sh"
  fi
fi

# -- 8. Typecheck ---------------------------------------------------------
step "Sanity check (typecheck, non-blocking)"
if npm run typecheck 2>&1; then ok "Typecheck passed"; else warn "Typecheck had warnings (app will still run)"; fi

# -- 9. Doctor summary ----------------------------------------------------
step "Doctor -- what's ready, what's not"
echo "  Node:   $(command -v node || echo MISSING) ($(node --version 2>/dev/null || echo '?'))"
echo "  npm:    $(command -v npm || echo MISSING) ($(npm --version 2>/dev/null || echo '?'))"
echo "  Cargo:  $(command -v cargo || echo 'MISSING (npm run dev will fail)')"
echo "  Venv:   $([ -f .venv/bin/python ] && echo READY || echo MISSING)"
echo "  .env:   check warnings above (GROQ/AssemblyAI keys)"
echo "  Mobile: $([ -d apps/mobile/node_modules ] && echo READY || echo 'run ./setup-mobile.sh')"

echo -e "\n${GREEN}============================================================${NC}"
echo -e "${GREEN}  Setup complete! One-click run:${NC}"
echo -e "${GREEN}============================================================${NC}"
cat <<'EOF'

  RUN THE APP (pick one):
    ./run.sh                 # one-click run (checks deps, picks docker/no-docker)
    npm run dev              # full (SearXNG + Tauri + Python)
    npm run dev:no-docker    # skip Docker/SearXNG (no web search)

  MOBILE (phone remote + QR):
    ./setup-mobile.sh        # installs mobile deps, prints LAN IP + QR flow

  CONFIGURE KEYS (.env -- required before AI works):
    GROQ_API_KEY=gsk_...     # https://console.groq.com -> API Keys
    ASSEMBLY_AI_API_KEY=...  # https://assemblyai.com (voice)
    SUTRA_AI_PROVIDER=groq   # or: custom / ollama

  HOTKEYS:  CTRL + SHIFT + SPACE  (fallback CTRL + SHIFT + ENTER)

EOF

if [ "$RUN_APP" = "1" ]; then
  step "One-click run requested (--run): launching sutra"
  command -v cargo >/dev/null 2>&1 \
    || fail "Cannot --run: Rust/Cargo still missing." "Tauri cannot start without it." "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  # restart terminal, re-run ./setup.sh --run"
  if docker info >/dev/null 2>&1; then npm run dev; else warn "Docker daemon not running -- launching with --no-docker."; npm run dev:no-docker; fi
fi
