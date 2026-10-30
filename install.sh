#!/usr/bin/env bash
# =============================================================================
#   StarCloud Panel installer (Debian / Ubuntu)
# -----------------------------------------------------------------------------
#   sudo bash install.sh                          interactive install
#   sudo bash install.sh --admin-user X --admin-pass Y --yes   unattended install
#   bash install.sh --skip-system                 only .env + Node packages (no apt, no service)
#
#   Options:
#     --admin-user NAME   admin username (3-32 chars: letters, digits, _ . -)
#     --admin-pass PASS   admin password (press Enter at the prompt for admin / admin)
#     --port N            panel port (default 8080)
#     --skip-system       do not use apt, systemd or start the panel
#     --no-service        install everything but do not start the panel
#     --yes               never ask questions (uses defaults)
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
TOTAL_STEPS=12
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/install.log"
PID_FILE="$APP_DIR/data/panel.pid"

ADMIN_USER=""
ADMIN_PASS=""
SKIP_SYSTEM=false
VERBOSE=false
NO_SERVICE=false
ASSUME_YES=false
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

usage() { sed -n '2,20p' "$0" | sed 's/^#\( \|$\)//'; }

on_error() {
  local code=$?
  ui_err "Installer stopped unexpectedly (line $1, exit code $code)."
  ui_info "Full log: $LOG_FILE"
  exit "$code"
}
trap 'on_error $LINENO' ERR

# ---------------------------------------------------------------- logo -------
show_logo() {
  if [ -t 1 ] && [ "$VERBOSE" = false ]; then clear || true; fi
  printf '\n'
  printf '%s%s' "$C_BLUE" "$C_BOLD"; cat <<'EOF'
 ███████╗████████╗ █████╗ ██████╗
 ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗
 ███████╗   ██║   ███████║██████╔╝
 ╚════██║   ██║   ██╔══██║██╔══██╗
 ███████║   ██║   ██║  ██║██║  ██║
 ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
EOF
  printf '%s%s' "$C_PURPLE" "$C_BOLD"; cat <<'EOF'
  ██████╗██╗      ██████╗ ██╗   ██╗██████╗
 ██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗
 ██║     ██║     ██║   ██║██║   ██║██║  ██║
 ██║     ██║     ██║   ██║██║   ██║██║  ██║
 ╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝
  ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝
EOF
  printf '%s\n' "$C_RESET"
  printf '      %s✦%s  %sVirtual Machine Panel  ·  Installer%s  %s✦%s\n\n' \
    "$C_CYAN" "$C_RESET" "$C_BOLD" "$C_RESET" "$C_CYAN" "$C_RESET"
}

section() { printf '\n  %s%s%s\n' "$C_BOLD$C_CYAN" "$*" "$C_RESET"; log "== $*"; }

# ---------------------------------------------------------------- helpers ----
port_listening() { (exec 3<>"/dev/tcp/127.0.0.1/${PANEL_PORT}") >/dev/null 2>&1; }

panel_answers() {
  curl -fsS -o /dev/null --max-time 3 "http://127.0.0.1:${PANEL_PORT}/login" >/dev/null 2>&1
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

# ---------------------------------------------------------------- args -------
while [ $# -gt 0 ]; do
  case "$1" in
    --admin-user)  ADMIN_USER="${2:-}"; shift 2 ;;
    --admin-pass)  ADMIN_PASS="${2:-}"; shift 2 ;;
    --port)        PANEL_PORT="${2:-}"; shift 2 ;;
    --skip-system) SKIP_SYSTEM=true; shift ;;
    --no-service)  NO_SERVICE=true; shift ;;
    --yes|-y)      ASSUME_YES=true; shift ;;
    --verbose|-v)  VERBOSE=true; shift ;;
    -h|--help)     usage; exit 0 ;;
    *) echo "Unknown option: $1 (see: bash install.sh --help)" >&2; exit 1 ;;
  esac
done

mkdir -p "$LOG_DIR" "$APP_DIR/data"
: >> "$LOG_FILE"
log "===== StarCloud installer started ($(date)) args: $* ====="

PANEL_PORT="${PANEL_PORT:-$(read_env_value PORT 8080)}"
[[ "$PANEL_PORT" =~ ^[0-9]+$ ]] && [ "$PANEL_PORT" -ge 1 ] && [ "$PANEL_PORT" -le 65535 ] || die "Port must be a number from 1 to 65535."

show_logo

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
  ui_warn "systemd is not running here. The panel will run in the background (start-panel.sh)."
fi

# Internet
if curl -fsS --max-time 8 -o /dev/null https://registry.npmjs.org/ 2>/dev/null; then
  ui_ok "Internet: reachable (npm registry)"
else
  ui_warn "Internet: npm registry not reachable. Package installation may fail."
fi

# Port
if panel_answers; then
  ui_ok "Port ${PANEL_PORT}: the StarCloud panel is already running. It will be restarted with the new code."
elif port_listening; then
  ui_warn "Port ${PANEL_PORT} is used by another program:"
  (ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | grep ":${PANEL_PORT} " | sed 's/^/      /' || true
  if [ "$ASSUME_YES" = true ] || [ ! -t 0 ]; then
    die "Port ${PANEL_PORT} is busy. Free it or choose another port with --port N."
  fi
  read -r -p "  Continue anyway? [y/N]: " CONFIRM || CONFIRM=""
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
  read -r -p "  Admin username [admin]: " ADMIN_USER || true
  read -r -s -p "  Admin password [admin]: " ADMIN_PASS || true
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
#   INSTALL STEPS
# =============================================================================
section "Installing"

step_apt() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y -o Dpkg::Options::=--force-confold \
    qemu-kvm qemu-system-x86 qemu-utils libvirt-daemon-system libvirt-clients virtinst \
    bridge-utils cpu-checker genisoimage cloud-image-utils cloud-init xorriso \
    curl wget ca-certificates unzip tar gzip jq rsync lsof net-tools iproute2 \
    openssl build-essential python3 git
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

stop_old_background_panel() {
  if [ -f "$PID_FILE" ]; then
    local old; old="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then kill "$old" 2>/dev/null || true; sleep 2; fi
    rm -f "$PID_FILE"
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
  stop_old_background_panel
  bash "$APP_DIR/start-panel.sh"
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
if systemd_usable && [ -f "/etc/systemd/system/${SERVICE_NAME}.service" ] && systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  SERVICE_KIND="systemd"
elif [ -f "$PID_FILE" ]; then
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
  printf '     start                    bash %s/start-panel.sh\n' "$APP_DIR"
  printf '     stop                     kill "$(cat %s)"\n' "$PID_FILE"
  printf '     live panel log           tail -f %s/logs/panel.log\n' "$APP_DIR"
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
  ui_info "Files and settings are ready. Start the panel with:  bash ${APP_DIR}/start-panel.sh"
else
  ui_warn "Installed, but the panel is not answering yet. Read $LOG_FILE, then run:  bash ${APP_DIR}/start-panel.sh"
fi
log "installer finished (status: ${STATUS_TEXT})"
