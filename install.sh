#!/usr/bin/env bash
# =============================================================================
#   StarCloud Panel installer (Debian / Ubuntu)
# -----------------------------------------------------------------------------
#   sudo bash install.sh                          install (or update) and start the panel
#   sudo bash install.sh --admin-user X --admin-pass Y --yes   unattended install
#   bash install.sh --skip-system                 only .env + Node packages (no apt, no service)
#   sudo bash install.sh --start | --stop | --status   control the panel (after install)
#
#   Options:
#     --admin-user NAME   admin username (3-32 chars: letters, digits, _ . -)
#     --admin-pass PASS   admin password (press Enter at the prompt for admin / admin)
#     --port N            panel port (default 8080)
#     --skip-system       do not use apt, systemd or start the panel
#     --no-service        install everything but do not start the panel
#     --yes               never ask questions (uses defaults)
#     --os-images MODE    OS cloud images for VM creation: all | none | ask (default all: every OS is downloaded)
#     --all-os            same as --os-images all (kept for compatibility)
#     --verbose           show the raw output of every command (default: only the logo and steps)
#     -h, --help          show this help
#
#   Every command's raw output is written to logs/install.log.
# =============================================================================
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="starcloud"
MIN_NODE_MAJOR=18
NODE_INSTALL_MAJOR=20
TOTAL_STEPS=13
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/install.log"
PID_FILE="$APP_DIR/data/panel.pid"
PANEL_LOG="$LOG_DIR/panel.log"
ENV_FILE="$APP_DIR/.env"
MODE="install"

ADMIN_USER=""
ADMIN_PASS=""
SKIP_SYSTEM=false
VERBOSE=false
NO_SERVICE=false
ASSUME_YES=false
OS_IMAGES="all"
PANEL_PORT=""
SERVICE_KIND="none"
STEP_NO=0

# ---------------------------------------------------------------- colours ----
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
  C_BLUE=$'\033[38;5;39m'; C_CYAN=$'\033[38;5;87m'; C_PURPLE=$'\033[38;5;207m'
  C_OK=$'\033[38;5;84m'; C_WARN=$'\033[38;5;221m'; C_ERR=$'\033[38;5;203m'; C_GREY=$'\033[38;5;245m'
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_BLUE=""; C_CYAN=""; C_PURPLE=""
  C_OK=""; C_WARN=""; C_ERR=""; C_GREY=""
fi

# ---------------------------------------------------------------- output -----
ui_ok()    { printf '  %s✔%s %s\n' "$C_OK" "$C_RESET" "$*"; }
ui_warn()  { printf '  %s!%s %s\n' "$C_WARN" "$C_RESET" "$*"; }
ui_err()   { printf '  %s✖%s %s\n' "$C_ERR" "$C_RESET" "$*" >&2; }
ui_info()  { printf '  %s•%s %s\n' "$C_BLUE" "$C_RESET" "$*"; }
ui_grey()  { printf '    %s%s%s\n' "$C_GREY" "$*" "$C_RESET"; }
log()      { printf '[%s] %s\n' "$(date '+%F %T')" "$*" >> "$LOG_FILE"; }
die()      { ui_err "$*"; log "FATAL: $*"; exit 1; }

usage() { sed -n '2,/^#   Every command/p' "$0" | sed 's/^#\( \|$\)//'; }

on_error() {
  local code=$?
  ui_err "Installer stopped unexpectedly (line $1, exit code $code)."
  ui_info "Full log: $LOG_FILE"
  exit "$code"
}
trap 'on_error $LINENO' ERR

# ---------------------------------------------------------------- logo -------
# The banner is the top 16 rows of the screen. On an interactive terminal a background loop repaints
# it every 120 ms with a rainbow palette, and a scroll region keeps all installer output below it.
# Every repaint is one printf call (cursor saved and restored inside it), so stopping the loop at any
# moment is safe. Prompts pause the loop so the typed text is never drawn over the banner.
LOGO_ROWS=16
LOGO_LINES=(
  ""
  " ███████╗████████╗ █████╗ ██████╗"
  " ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗"
  " ███████╗   ██║   ███████║██████╔╝"
  " ╚════██║   ██║   ██╔══██║██╔══██╗"
  " ███████║   ██║   ██║  ██║██║  ██║"
  " ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝"
  "  ██████╗██╗      ██████╗ ██╗   ██╗██████╗"
  " ██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗"
  " ██║     ██║     ██║   ██║██║   ██║██║  ██║"
  " ██║     ██║     ██║   ██║██║   ██║██║  ██║"
  " ╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝"
  "  ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝"
  ""
  "      ✦  Virtual Machine Panel  ·  Installer  ✦"
  ""
)
# 256-colour rainbow (red -> orange -> yellow -> green -> cyan -> blue -> violet -> pink)
LOGO_PALETTE=(196 202 208 214 220 226 190 154 118 82 46 48 51 45 39 33 27 21 57 93 129 165 201 200 199 198 197)

# Prints the banner. With a colour phase, each row gets its own palette colour that moves each frame.
logo_block() {
  local p="${1:-0}" r c n=${#LOGO_PALETTE[@]} out=""
  for r in $(seq 0 $((LOGO_ROWS - 1))); do
    if [ -n "$C_RESET" ]; then
      if [ "$r" -eq 14 ]; then
        c=${LOGO_PALETTE[$(( (p + 13) % n ))]}
      else
        c=${LOGO_PALETTE[$(( (p + r * 2) % n ))]}
      fi
      out+="$(printf '\033[1;38;5;%sm%s\033[0m' "$c" "${LOGO_LINES[$r]}")"$'\n'
    else
      out+="${LOGO_LINES[$r]}"$'\n'
    fi
  done
  printf '%s' "$out"
}

show_logo() {
  if [ -t 1 ] && [ "$VERBOSE" = false ]; then TERM="${TERM:-xterm-256color}" clear 2>/dev/null || true; fi
  logo_block 0
}

# Repaints the banner in place (cursor saved and restored in the same write).
logo_paint() {
  printf '\e7\033[1;1H%s\e8' "$(logo_block "$1")"
}

LOGO_ANIM_PID=""
LOGO_REGION=0

logo_anim_start() {
  [ "$LOGO_REGION" = 1 ] || return 0
  [ -z "$LOGO_ANIM_PID" ] || return 0
  (
    trap - ERR
    set +e
    while :; do
      logo_paint $(( $(date +%s%3N) / 120 ))
      sleep 0.12
    done
  ) &
  LOGO_ANIM_PID=$!
}

logo_anim_stop() {
  if [ -n "$LOGO_ANIM_PID" ]; then
    kill "$LOGO_ANIM_PID" 2>/dev/null || true
    wait "$LOGO_ANIM_PID" 2>/dev/null || true
    LOGO_ANIM_PID=""
  fi
}

# Starts the scroll region below the banner and the animation. Only on a real terminal that is tall
# enough, and only when the banner is at the top of the screen (not with --verbose).
logo_region_on() {
  [ -n "$C_RESET" ] && [ "$VERBOSE" = false ] || return 0
  local rows
  rows="$(tput lines 2>/dev/null || echo 0)"
  [[ "$rows" =~ ^[0-9]+$ ]] && [ "$rows" -ge $((LOGO_ROWS + 8)) ] || return 0
  printf '\e7\033[%d;%dr\e8' $((LOGO_ROWS + 1)) "$rows"
  LOGO_REGION=1
  logo_anim_start
}

# Stops the animation and gives the whole screen back to the terminal (the final colours stay).
logo_region_off() {
  logo_anim_stop
  if [ "$LOGO_REGION" = 1 ]; then
    printf '\e7\033[r\e8'
    LOGO_REGION=0
  fi
}

logo_pause()  { logo_anim_stop; }
logo_resume() { logo_anim_start; }

# read wrapper: pauses the banner animation while the user types.
ask() {
  local rc=0
  logo_pause
  read "$@" || rc=$?
  logo_resume
  return "$rc"
}

section() { printf '\n  %s%s%s\n' "$C_BOLD$C_CYAN" "$*" "$C_RESET"; log "== $*"; }

# ---------------------------------------------------------------- helpers ----
port_listening() { (exec 3<>"/dev/tcp/127.0.0.1/${PANEL_PORT}") >/dev/null 2>&1; }

panel_answers() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${PANEL_PORT}/login" 2>/dev/null || true)"
  [[ "$code" =~ ^[1-4][0-9][0-9]$ ]]
}

node_major() { node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0; }

# STARCLOUD_NO_SYSTEMD=1 forces the background mode (used for testing on machines that have systemd)
systemd_usable() { [ -z "${STARCLOUD_NO_SYSTEMD:-}" ] && [ -d /run/systemd/system ] && command -v systemctl >/dev/null 2>&1; }

read_env_value() { # read_env_value KEY default
  local v
  v="$(grep -E "^$1=" "$APP_DIR/.env" 2>/dev/null | tail -1 | cut -d= -f2- || true)"
  printf '%s' "${v:-$2}"
}

# skip_step "Title" [count] - marks one or more steps as skipped (keeps the numbering right)
skip_step() {
  local count="${2:-1}"
  STEP_NO=$((STEP_NO + count))
  printf '  %s–%s [%d/%d] %s%s (skipped)%s\n' "$C_GREY" "$C_RESET" "$STEP_NO" "$TOTAL_STEPS" "$C_GREY" "$1" "$C_RESET"
  log "SKIP steps up to $STEP_NO: $1"
}

# run_step "Title" function-or-command args...
# Shows a spinner while the work runs. Raw output goes to the log file (or the screen with --verbose).
run_step() {
  local title="$1"; shift
  STEP_NO=$((STEP_NO + 1))
  local n="$STEP_NO" start=$SECONDS rc=0 before
  before="$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)"
  log "STEP $n/$TOTAL_STEPS: $title"

  if [ "$VERBOSE" = true ]; then
    printf '\n  %s[%d/%d]%s %s\n' "$C_GREY" "$n" "$TOTAL_STEPS" "$C_RESET" "$title"
    set +e
    ( trap - ERR; "$@" ) 2>&1 | tee -a "$LOG_FILE"
    rc=${PIPESTATUS[0]}
    set -e
  else
    ( trap - ERR; "$@" ) >>"$LOG_FILE" 2>&1 &
    local pid=$! i=0
    local frames=(⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)
    if [ -t 1 ]; then
      while kill -0 "$pid" 2>/dev/null; do
        printf '\r  %s%s%s [%d/%d] %s' "$C_BLUE" "${frames[$((i % 10))]}" "$C_RESET" "$n" "$TOTAL_STEPS" "$title"
        i=$((i + 1))
        sleep 0.1
      done
    fi
    wait "$pid" || rc=$?
  fi

  local took=$((SECONDS - start))
  if [ "$rc" -eq 0 ]; then
    if [ "$VERBOSE" = true ]; then
      ui_ok "$title ${C_GREY}(${took}s)${C_RESET}"
    else
      printf '\r\033[K  %s✔%s [%d/%d] %s %s(%ss)%s\n' "$C_OK" "$C_RESET" "$n" "$TOTAL_STEPS" "$title" "$C_GREY" "$took" "$C_RESET"
    fi
    log "OK step $n (${took}s)"
    return 0
  fi

  if [ "$VERBOSE" = false ]; then
    printf '\r\033[K  %s✖%s [%d/%d] %s\n' "$C_ERR" "$C_RESET" "$n" "$TOTAL_STEPS" "$title"
    echo ""
    printf '  %sLast lines of the log:%s\n' "$C_WARN" "$C_RESET"
    tail -n +"$((before + 1))" "$LOG_FILE" | tail -n 25 | sed 's/^/      /'
  else
    printf '\n  %s✖%s [%d/%d] %s\n' "$C_ERR" "$C_RESET" "$n" "$TOTAL_STEPS" "$title"
  fi
  log "FAILED step $n (exit $rc)"
  echo ""
  ui_info "Full log: $LOG_FILE"
  exit "$rc"
}

# ---------------------------------------------------------------- panel -------
# The panel runs in its own session (setsid), so closing the terminal does not stop it.
# On a server with systemd the service is used; otherwise the process is tracked in data/panel.pid.
service_installed() { systemd_usable && [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ]; }

panel_pid() { # prints the PID of the running panel (from the PID file, or by its command line)
  local p=""
  if [ -f "$PID_FILE" ]; then p="$(cat "$PID_FILE" 2>/dev/null || true)"; fi
  if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then echo "$p"; return 0; fi
  if command -v pgrep >/dev/null 2>&1; then
    p="$(pgrep -f "${APP_DIR}/app.js" 2>/dev/null | head -n 1 || true)"
    if [ -n "$p" ]; then echo "$p"; return 0; fi
  fi
  return 1
}

stop_panel_background() {
  local p i
  p="$(panel_pid || true)"
  if [ -z "$p" ]; then rm -f "$PID_FILE"; return 0; fi
  if ! kill "$p" 2>/dev/null; then
    echo "could not stop the panel (pid $p). Run with sudo: sudo bash install.sh --stop"
    return 1
  fi
  for i in $(seq 1 10); do kill -0 "$p" 2>/dev/null || break; sleep 1; done
  kill -0 "$p" 2>/dev/null && kill -9 "$p" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "stopped the panel (pid $p)"
}

start_panel_background() {
  local node_bin pid real i
  node_bin="$(command -v node || true)"
  [ -n "$node_bin" ] || { echo "Node.js is not installed"; return 1; }
  [ -d "$APP_DIR/node_modules/express" ] || { echo "Node packages are missing. Run: sudo bash install.sh"; return 1; }
  mkdir -p "$LOG_DIR" "$APP_DIR/data"
  cd "$APP_DIR"
  nohup setsid "$node_bin" "$APP_DIR/app.js" >> "$PANEL_LOG" 2>&1 < /dev/null &
  pid=$!
  real="$(panel_pid || true)"
  echo "${real:-$pid}" > "$PID_FILE"
  for i in $(seq 1 40); do
    if panel_answers; then echo "panel is up on port ${PANEL_PORT} (process ${real:-$pid})"; return 0; fi
    if ! kill -0 "$pid" 2>/dev/null && [ -z "$(panel_pid || true)" ]; then
      echo "the panel stopped right after start. Last log lines:"; tail -n 30 "$PANEL_LOG" 2>/dev/null || true; return 1
    fi
    sleep 1
  done
  echo "the panel did not answer on port ${PANEL_PORT} within 40 seconds. Last log lines:"
  tail -n 30 "$PANEL_LOG" 2>/dev/null || true
  return 1
}

control_start() {
  [ -f "$ENV_FILE" ] || die "The panel is not installed yet. Run: sudo bash install.sh"
  if service_installed; then
    systemctl start "$SERVICE_NAME" && echo "service '${SERVICE_NAME}' started"
  elif panel_answers; then
    echo "the panel is already running on port ${PANEL_PORT}"
  else
    start_panel_background
  fi
}

control_stop() {
  if service_installed; then systemctl stop "$SERVICE_NAME" 2>/dev/null && echo "service '${SERVICE_NAME}' stopped" || true; fi
  stop_panel_background || true
}

control_status() {
  local p state
  p="$(panel_pid || true)"
  if panel_answers; then state="RUNNING (answering on port ${PANEL_PORT})"; rc=0
  elif [ -n "$p" ]; then state="process ${p} exists but is not answering yet"; rc=1
  else state="NOT RUNNING"; rc=1; fi
  echo "StarCloud Panel: ${state}"
  [ -n "$p" ] && echo "  process id : ${p}"
  service_installed && echo "  service     : systemd (${SERVICE_NAME}) - $(systemctl is-active "$SERVICE_NAME" 2>/dev/null || true)"
  echo "  folder      : ${APP_DIR}"
  echo "  panel log   : ${PANEL_LOG}"
  echo "  start/stop  : sudo bash install.sh --start | --stop"
  return "$rc"
}

# ---------------------------------------------------------------- args -------
while [ $# -gt 0 ]; do
  case "$1" in
    --admin-user)  ADMIN_USER="${2:-}"; shift 2 ;;
    --admin-pass)  ADMIN_PASS="${2:-}"; shift 2 ;;
    --port)        PANEL_PORT="${2:-}"; shift 2 ;;
    --skip-system) SKIP_SYSTEM=true; shift ;;
    --no-service)  NO_SERVICE=true; shift ;;
    --yes|-y)      ASSUME_YES=true; shift ;;
    --os-images)   OS_IMAGES="${2:-}"; shift 2
                   case "$OS_IMAGES" in all|none|ask) ;; *) echo "--os-images must be: all, none or ask" >&2; exit 1 ;; esac ;;
    --all-os)      OS_IMAGES=all; shift ;;
    --verbose|-v)  VERBOSE=true; shift ;;
    --start)       MODE="start"; shift ;;
    --stop)        MODE="stop"; shift ;;
    --status)      MODE="status"; shift ;;
    -h|--help)     usage; exit 0 ;;
    *) echo "Unknown option: $1 (see: bash install.sh --help)" >&2; exit 1 ;;
  esac
done

if [ "$MODE" != "install" ]; then
  PANEL_PORT="${PANEL_PORT:-$(read_env_value PORT 8080)}"
  rc=0
  case "$MODE" in
    start)  control_start || rc=$? ;;
    stop)   control_stop || rc=$? ;;
    status) control_status || rc=$? ;;
  esac
  exit "$rc"
fi

mkdir -p "$LOG_DIR" "$APP_DIR/data"
: >> "$LOG_FILE"
log "===== StarCloud Panel installer started ($(date)) args: $* ====="

PANEL_PORT="${PANEL_PORT:-$(read_env_value PORT 8080)}"
[[ "$PANEL_PORT" =~ ^[0-9]+$ ]] && [ "$PANEL_PORT" -ge 1 ] && [ "$PANEL_PORT" -le 65535 ] || die "Port must be a number from 1 to 65535."

show_logo
logo_region_on
trap 'logo_region_off' EXIT

# =============================================================================
#   PREFLIGHT: check the machine before changing anything
# =============================================================================
section "Checking this machine"

if [ "$SKIP_SYSTEM" = false ]; then
  [ "$(id -u)" -eq 0 ] || die "Run as root:  sudo bash install.sh     (or use --skip-system for a test install)"
  ui_ok "Running as root."
  command -v apt-get >/dev/null 2>&1 || die "This installer supports Debian and Ubuntu (apt-get) only."
fi

OS_NAME="unknown"
if [ -f /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  OS_NAME="${PRETTY_NAME:-$ID}"
  case "${ID:-}" in
    debian|ubuntu) ui_ok "Operating system: $OS_NAME" ;;
    *)             ui_warn "Operating system: $OS_NAME (only Debian and Ubuntu are tested)" ;;
  esac
fi

ARCH="$(uname -m)"
if [ "$ARCH" = "x86_64" ]; then ui_ok "Architecture: $ARCH"; else ui_warn "Architecture: $ARCH (virtual machines need x86_64 for the usual setup)"; fi

CPUS="$(nproc 2>/dev/null || echo 1)"
MEM_MB="$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)"
DISK_GB="$(df -BG --output=avail "$APP_DIR" 2>/dev/null | tail -1 | tr -dc '0-9' || echo 0)"
ui_ok "Resources: ${CPUS} CPU, ${MEM_MB} MB RAM, ${DISK_GB:-?} GB free disk"
[ "${MEM_MB:-0}" -ge 2048 ] || ui_warn "Less than 2 GB RAM. The panel may run, but VMs will be very limited."
if [ "${MEM_MB:-0}" -lt 6000 ] && [ "${MEM_MB:-0}" -ge 2048 ]; then
  ui_grey "Small server: create guest VMs with about half of the RAM (for 4 GB, use about 2 GB per VM)."
fi
[ "${DISK_GB:-0}" -ge 10 ] || ui_warn "Less than 10 GB free disk. Cloud images and VM disks need space."

# KVM (hardware virtualization)
KVM_OK=false
CPU_VENDOR="$(grep -m1 vendor_id /proc/cpuinfo 2>/dev/null | awk '{print $3}' || true)"
VIRT_FLAG=""
if grep -qw vmx /proc/cpuinfo 2>/dev/null; then VIRT_FLAG="vmx"; fi
if grep -qw svm /proc/cpuinfo 2>/dev/null; then VIRT_FLAG="svm"; fi
if [ -e /dev/kvm ] && [ -n "$VIRT_FLAG" ]; then KVM_OK=true; fi
if [ "$KVM_OK" = true ]; then
  ui_ok "KVM available (${VIRT_FLAG}, ${CPU_VENDOR:-unknown} CPU). Full-speed VMs are possible."
else
  ui_warn "KVM is NOT available. The panel keeps 'KVM On / Off' locked OFF; VMs run in slow software emulation."
  ui_grey "Enable Intel VT-x / AMD-V in BIOS/UEFI, or enable nested virtualization if this is a VM."
fi

# Environment hints
ENV_NOTE="Plain Linux server"
if [ -n "${CODESPACES:-}" ] || [ -n "${CODESPACE_NAME:-}" ]; then ENV_NOTE="GitHub Codespaces"
elif [ -f /.dockerenv ]; then ENV_NOTE="Docker container"
elif grep -qi microsoft /proc/version 2>/dev/null; then ENV_NOTE="WSL"; fi
ui_ok "Environment: $ENV_NOTE"

# systemd decides how the panel is kept running
if [ "$SKIP_SYSTEM" = false ] && systemd_usable; then
  ui_ok "systemd is running. The panel will be installed as a service (${SERVICE_NAME})."
else
  ui_warn "systemd is not running here. The panel will run in the background (own session, survives closing the terminal)."
fi

# Internet
if curl -fsS --max-time 8 -o /dev/null https://registry.npmjs.org/ 2>/dev/null; then
  ui_ok "Internet: reachable (npm registry)"
else
  ui_warn "Internet: npm registry not reachable. Package installation may fail."
fi

# Port
if panel_answers; then
  ui_ok "Port ${PANEL_PORT}: the StarCloud Panel is already running. It will be restarted with the new code."
elif port_listening; then
  ui_warn "Port ${PANEL_PORT} is used by another program:"
  (ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | grep ":${PANEL_PORT} " | sed 's/^/      /' || true
  if [ "$ASSUME_YES" = true ] || [ ! -t 0 ]; then
    die "Port ${PANEL_PORT} is busy. Free it or choose another port with --port N."
  fi
  ask -r -p "  Continue anyway? [y/N]: " CONFIRM || CONFIRM=""
  [[ "$CONFIRM" =~ ^[Yy]$ ]] || die "Installation cancelled."
else
  ui_ok "Port ${PANEL_PORT} is free."
fi

if [ "$SKIP_SYSTEM" = true ]; then
  command -v node >/dev/null 2>&1 || die "Node.js is missing. Install Node.js ${MIN_NODE_MAJOR}+ or run without --skip-system."
fi

# =============================================================================
#   ADMIN ACCOUNT
# =============================================================================
section "Admin account"
if [ -z "$ADMIN_USER" ] && [ -z "$ADMIN_PASS" ] && [ "$ASSUME_YES" = false ] && [ -t 0 ]; then
  ui_grey "Press Enter to keep the default  admin / admin  (change it after login),"
  ui_grey "or type your own username and password."
  ask -r -p "  Admin username [admin]: " ADMIN_USER || true
  ask -r -s -p "  Admin password [admin]: " ADMIN_PASS || true
  echo ""
fi
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin}"
[[ "$ADMIN_USER" =~ ^[A-Za-z0-9_.-]{3,32}$ ]] || die "Admin username must be 3-32 characters: letters, digits, _ . -"
if [ "$ADMIN_PASS" = "admin" ]; then
  ui_warn "Default password 'admin' is in use. Change it from the Profile page right after login."
elif [ "${#ADMIN_PASS}" -lt 8 ]; then
  ui_warn "Password is shorter than 8 characters. A longer one is safer."
fi
ui_ok "Admin account: ${ADMIN_USER}"
log "admin user: $ADMIN_USER"

# =============================================================================
#   OS IMAGES: decide whether to download the cloud images now
# =============================================================================
section "OS images for VM creation"
OS_COUNT="$(grep -cE '^  [a-z0-9_]+: \{' "$APP_DIR/services/os-templates.js" 2>/dev/null || echo 0)"
if [ "$OS_IMAGES" = ask ]; then
  if [ "$ASSUME_YES" = false ] && [ -t 0 ]; then
    ui_grey "The panel creates VMs from cloud images: Ubuntu, Debian, Fedora, CentOS, AlmaLinux, Rocky."
    ui_grey "${OS_COUNT} images, several GB in total. Skip now and download later from Admin > Templates."
    ask -r -p "  Download all OS images now? [Y/n]: " OS_ANS || true
    case "${OS_ANS:-}" in n|N|no|NO|No) OS_IMAGES=none ;; *) OS_IMAGES=all ;; esac
  else
    OS_IMAGES=all
  fi
fi
case "$OS_IMAGES" in
  all)  ui_ok "All ${OS_COUNT} OS images will be downloaded during the install" ;;
  *)    ui_grey "OS images skipped (download later: sudo bash install.sh --os-images all)" ;;
esac
log "os images: $OS_IMAGES"

# =============================================================================
#   INSTALL STEPS
# =============================================================================
section "Installing"

# Downloads every built-in OS template (services/os-templates.js) into the panel's template cache,
# the same folder the panel uses: ~/vms/templates/<key>-template.qcow2. Existing files are kept.
# One failed image never stops the install; the summary lists what failed.
step_os_images() {
  local dir list key url file part total=0 ok=0 had=0 failed="" free_gb
  dir="$(node -p "require('path').join(require('os').homedir(), 'vms', 'templates')")"
  mkdir -p "$dir"
  list="$(node -e "const { OS_TEMPLATES, resolveTemplateUrl } = require(process.argv[1]); (async () => { for (const [k, v] of Object.entries(OS_TEMPLATES)) console.log(k + ' ' + await resolveTemplateUrl(v)); })();" "$APP_DIR/services/os-templates.js")"
  free_gb="$(df -BG --output=avail "$dir" 2>/dev/null | tail -1 | tr -dc '0-9' || true)"
  echo "cache folder: $dir (free: ${free_gb:-?} GB)"
  if [ -n "$free_gb" ] && [ "$free_gb" -lt 40 ] 2>/dev/null; then
    echo "warning: less than 40 GB free; large images may not fit"
  fi
  while read -r key url; do
    [ -n "$key" ] || continue
    total=$((total + 1))
    file="$dir/${key}-template.qcow2"
    if [ -s "$file" ]; then
      had=$((had + 1)); echo "$key: already present"; continue
    fi
    part="$file.part"
    echo "$key: downloading $url"
    if curl -fL --retry 3 --retry-delay 5 --connect-timeout 20 -o "$part" "$url" && [ -s "$part" ]; then
      mv -f "$part" "$file"; ok=$((ok + 1)); echo "$key: done"
    else
      rm -f "$part"; failed="$failed $key"; echo "$key: FAILED (the rest continue)"
    fi
  done <<< "$list"
  {
    echo "OS images: $ok downloaded, $had already present, $(( total - ok - had )) failed (of $total)"
    [ -z "$failed" ] || echo "failed:$failed  -> retry later from Admin > Templates, or: sudo bash install.sh --os-images all"
  } > "$LOG_DIR/os-images.txt"
  cat "$LOG_DIR/os-images.txt"
  return 0
}

step_apt() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y -o Dpkg::Options::=--force-confold \
    qemu-kvm qemu-system-x86 qemu-utils libvirt-daemon-system libvirt-clients virtinst \
    bridge-utils cpu-checker genisoimage cloud-image-utils cloud-init xorriso \
    curl wget ca-certificates unzip tar gzip jq rsync lsof net-tools iproute2 \
    openssl build-essential python3 git procps
}

# libvirt and its helper services (same set as the HKVM master setup). Failures are not fatal.
step_libvirt() {
  if ! systemd_usable; then
    echo "systemd is not running: libvirt services were not started (start them manually if needed)"
    return 0
  fi
  for svc in libvirtd virtlogd virtlockd; do
    systemctl enable --now "$svc" 2>/dev/null || echo "could not enable $svc (continuing)"
  done
  systemctl restart libvirtd 2>/dev/null || true
  echo "libvirt services: $(systemctl is-active libvirtd 2>/dev/null || echo unknown)"
}

# 4 GB swap file, only when the machine has no swap at all and at least 6 GB free disk.
# Never fails the install: some containers (Codespaces, Docker) do not allow swap.
step_swap() {
  if swapon --show --noheadings 2>/dev/null | grep -q .; then
    echo "swap already present:"; swapon --show 2>/dev/null || true
    return 0
  fi
  local free_gb
  free_gb="$(df -BG --output=avail / 2>/dev/null | tail -1 | tr -dc '0-9' || echo 0)"
  if [ "${free_gb:-0}" -lt 6 ]; then
    echo "not enough free disk (${free_gb:-0} GB) for a 4 GB swap file: skipped"
    return 0
  fi
  if fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile; then
    grep -q "^/swapfile " /etc/fstab || echo "/swapfile none swap sw 0 0" >> /etc/fstab
    echo "4 GB swap file created (/swapfile)"
  else
    rm -f /swapfile
    echo "swap could not be created on this system (continuing)"
  fi
}

# Swappiness 10: keep VM RAM in memory, use swap only when really needed
step_sysctl() {
  mkdir -p /etc/sysctl.d
  echo "vm.swappiness=10" > /etc/sysctl.d/99-starcloud.conf
  if sysctl -w vm.swappiness=10 >/dev/null 2>&1; then
    echo "vm.swappiness=10 applied now (saved in /etc/sysctl.d/99-starcloud.conf)"
  else
    echo "vm.swappiness=10 saved in /etc/sysctl.d/99-starcloud.conf (applies after reboot)"
  fi
}

# The VM tools the panel needs. Missing one = the installer stops with the name of the tool.
step_tools() {
  local missing="" tool
  for tool in qemu-system-x86_64 qemu-img genisoimage cloud-localds; do
    if command -v "$tool" >/dev/null 2>&1; then
      echo "$tool: $(command -v "$tool")"
    else
      missing="$missing $tool"
    fi
  done
  if [ -n "$missing" ]; then
    echo "MISSING tools:$missing (package install failed? see the apt lines above)"
    [ "$SKIP_SYSTEM" = true ] && return 0   # test installs (--skip-system) do not need the VM tools
    return 1
  fi
  if [ -e /dev/kvm ]; then echo "/dev/kvm: OK"; else echo "/dev/kvm: not present (VMs will use software emulation)"; fi
}

step_node() {
  if command -v node >/dev/null 2>&1 && [ "$(node_major)" -ge "$MIN_NODE_MAJOR" ]; then
    return 0
  fi
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_INSTALL_MAJOR}.x" | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  [ "$(node_major)" -ge "$MIN_NODE_MAJOR" ]
}

step_npm() {
  cd "$APP_DIR"
  if [ -f package-lock.json ]; then
    npm ci --omit=dev || npm install --omit=dev
  else
    npm install --omit=dev
  fi
}

step_kvm() {
  mkdir -p "$APP_DIR/data"
  if [ "$KVM_OK" = true ]; then
    local param modopt
    if [ "$CPU_VENDOR" = "AuthenticAMD" ]; then
      param=/sys/module/kvm_amd/parameters/nested; modopt="kvm_amd nested=1"
    else
      param=/sys/module/kvm_intel/parameters/nested; modopt="kvm_intel nested=1"
    fi
    if [ -r "$param" ] && grep -qE '^(1|Y|y)' "$param"; then
      echo "nested KVM already on"
    elif [ "$SKIP_SYSTEM" = false ]; then
      echo "options $modopt" > /etc/modprobe.d/starcloud-kvm-nested.conf
      echo "nested KVM will be enabled after the next reboot (or module reload)"
    fi
  fi
  local dev=false kvm=false
  [ -e /dev/kvm ] && dev=true
  [ "$KVM_OK" = true ] && kvm=true
  cat > "$APP_DIR/data/install-kvm-report.json" <<JSON
{"kvm": $kvm, "devKvm": $dev, "virtFlag": "$VIRT_FLAG", "vendor": "${CPU_VENDOR:-unknown}", "checkedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
JSON
}

step_env() {
  local env_file="$APP_DIR/.env" secret keep tmp
  touch "$env_file"
  secret="$(openssl rand -hex 32)"
  # Keep existing settings (including the session secret and data folder); replace only the installer's own keys
  tmp="$(mktemp)"
  grep -v -E '^(STARCLOUD_ADMIN_USER|STARCLOUD_ADMIN_PASSWORD|SESSION_SECRET|PORT)=' "$env_file" > "$tmp" || true
  {
    cat "$tmp"
    echo "PORT=${PANEL_PORT}"
    echo "SESSION_SECRET=${secret}"
    echo "STARCLOUD_ADMIN_USER=${ADMIN_USER}"
    echo "STARCLOUD_ADMIN_PASSWORD=${ADMIN_PASS}"
  } > "$env_file"
  rm -f "$tmp"
  # Database lives inside the project folder (data/). Set only when missing, so an existing choice is kept.
  if ! grep -qE '^STARCLOUD_DATA_DIR=' "$env_file"; then echo "STARCLOUD_DATA_DIR=${APP_DIR}/data" >> "$env_file"; fi
  chmod 600 "$env_file"
}

step_firewall() {
  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow "${PANEL_PORT}/tcp"
    echo "ufw: opened ${PANEL_PORT}/tcp"
  elif command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state 2>/dev/null | grep -q running; then
    firewall-cmd --permanent --add-port="${PANEL_PORT}/tcp"
    firewall-cmd --reload
    echo "firewalld: opened ${PANEL_PORT}/tcp"
  else
    echo "no active firewall found (nothing to open)"
  fi
}


step_service() {
  local unit="/etc/systemd/system/${SERVICE_NAME}.service"
  if [ "$NO_SERVICE" = true ]; then
    echo "--no-service: the panel was not started"
    return 0
  fi
  if systemd_usable; then
    local node_bin; node_bin="$(command -v node)"
    cat > "$unit" <<UNIT
[Unit]
Description=StarCloud Panel (VM management)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=${node_bin} ${APP_DIR}/app.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT
    if systemctl daemon-reload && systemctl enable "${SERVICE_NAME}.service" && systemctl restart "${SERVICE_NAME}.service"; then
      echo "systemd service '${SERVICE_NAME}' is running"
      return 0
    fi
    echo "systemd could not start the service; falling back to a background process"
  fi
  stop_panel_background || true
  start_panel_background
}

step_health() {
  local i
  for i in $(seq 1 40); do
    if panel_answers; then echo "panel answers on port ${PANEL_PORT}"; return 0; fi
    sleep 1
  done
  echo "panel did not answer on port ${PANEL_PORT} within 40 seconds (see logs)"
  return 0
}

if [ "$SKIP_SYSTEM" = false ]; then
  run_step "Installing QEMU/KVM, libvirt, ISO and cloud-init tools" step_apt
  run_step "Checking Node.js ${MIN_NODE_MAJOR}+" step_node
  run_step "Starting libvirt services" step_libvirt
  run_step "Checking swap (4 GB, only if none)" step_swap
  run_step "Setting swappiness (vm.swappiness=10)" step_sysctl
else
  skip_step "System packages, Node.js, libvirt, swap, swappiness (--skip-system)" 5
fi
run_step "Checking VM tools (qemu, genisoimage, cloud-localds)" step_tools
run_step "Installing Node packages" step_npm
run_step "Recording KVM / nested virtualization status" step_kvm
run_step "Writing configuration (.env, mode 600)" step_env
if [ "$OS_IMAGES" = all ]; then
  run_step "Downloading ${OS_COUNT} OS images (cloud templates)" step_os_images
  [ ! -s "$LOG_DIR/os-images.txt" ] || ui_grey "$(cat "$LOG_DIR/os-images.txt")"
else
  skip_step "OS images (not requested: --os-images $OS_IMAGES)" 1
fi
if [ "$SKIP_SYSTEM" = false ]; then
  run_step "Opening port ${PANEL_PORT} in the firewall" step_firewall
  if [ "$NO_SERVICE" = false ]; then
    run_step "Starting the panel" step_service
  else
    skip_step "Starting the panel (--no-service)"
  fi
  run_step "Health check" step_health
else
  skip_step "Firewall, service and health check (--skip-system)" 3
fi

# =============================================================================
#   SUMMARY
# =============================================================================
logo_region_off
if systemd_usable && [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ] && systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  SERVICE_KIND="systemd"
elif [ -n "$(panel_pid || true)" ]; then
  SERVICE_KIND="background"
fi

if [ -n "${CODESPACE_NAME:-}" ]; then
  PANEL_URL="https://${CODESPACE_NAME}-${PANEL_PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
else
  PUBLIC_IP="$(curl -4 -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)"
  [ -n "$PUBLIC_IP" ] || PUBLIC_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  PANEL_URL="http://${PUBLIC_IP:-YOUR_SERVER_IP}:${PANEL_PORT}"
fi

if panel_answers; then
  STATUS="${C_OK}● ONLINE${C_RESET}"; STATUS_TEXT="ONLINE"
elif [ "$SKIP_SYSTEM" = true ] || [ "$NO_SERVICE" = true ]; then
  STATUS="${C_WARN}○ NOT STARTED${C_RESET}"; STATUS_TEXT="NOT STARTED"
else
  STATUS="${C_ERR}● OFFLINE${C_RESET}"; STATUS_TEXT="OFFLINE"
fi

printf '\n%s' "$C_PURPLE$C_BOLD"
cat <<'EOF'
  ══════════════════════════════════════════════════════════
EOF
printf '%s' "$C_RESET"
printf '   %s✦  StarCloud Panel is installed%s\n' "$C_BOLD" "$C_RESET"
printf '%s' "$C_PURPLE$C_BOLD"
cat <<'EOF'
  ══════════════════════════════════════════════════════════
EOF
printf '%s\n' "$C_RESET"
printf '   %-16s %b\n' "Status"     "$STATUS"
printf '   %-16s %s\n' "Panel URL"  "$PANEL_URL/login"
printf '   %-16s %s\n' "Admin user" "$ADMIN_USER  (password: the one you chose; 'admin' if you pressed Enter)"
if [ "$STATUS_TEXT" = "NOT STARTED" ]; then SERVICE_SHOW="not started"; else SERVICE_SHOW="$SERVICE_KIND"; fi
printf '   %-16s %s\n' "Service"    "$SERVICE_SHOW"
printf '   %-16s %s\n' "Folder"     "$APP_DIR"
printf '   %-16s %s\n' "Install log" "$LOG_FILE"
printf '\n   %sCommands%s\n' "$C_BOLD" "$C_RESET"
if [ "$SERVICE_KIND" = "systemd" ]; then
  printf '     start / stop / restart   sudo systemctl start|stop|restart %s\n' "$SERVICE_NAME"
  printf '     live panel log           journalctl -u %s -f\n' "$SERVICE_NAME"
else
  printf '     start                    sudo bash %s/install.sh --start\n' "$APP_DIR"
  printf '     stop                     sudo bash %s/install.sh --stop\n' "$APP_DIR"
  printf '     status                   bash %s/install.sh --status\n' "$APP_DIR"
  printf '     live panel log           tail -f %s\n' "$PANEL_LOG"
fi
printf '     reinstall / update       sudo bash install.sh\n'

printf '\n   %sNext steps%s\n' "$C_BOLD" "$C_RESET"
printf '     1. Open the panel link and log in.\n'
printf '     2. Profile page: change the admin password (if you kept admin / admin).\n'
printf '     3. Admin > Settings > Discord: enable Discord login (optional).\n'
if [ -n "${CODESPACE_NAME:-}" ]; then
  printf '     4. Codespaces: PORTS tab, port %s -> Visibility Public or Private.\n' "$PANEL_PORT"
fi
echo ""
if [ "$STATUS_TEXT" = "ONLINE" ]; then
  ui_ok "Done. The panel is running on port ${PANEL_PORT}."
elif [ "$STATUS_TEXT" = "NOT STARTED" ]; then
  ui_info "Files and settings are ready. Start the panel with:  sudo bash ${APP_DIR}/install.sh --start"
else
  ui_warn "Installed, but the panel is not answering yet. Read $PANEL_LOG, then run:  sudo bash ${APP_DIR}/install.sh --start"
fi
log "installer finished (status: ${STATUS_TEXT})"
