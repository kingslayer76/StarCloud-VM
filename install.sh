#!/usr/bin/env bash
# StarCloud Panel installer (Debian / Ubuntu).
#
#   sudo bash install.sh                  interactive install (asks for the admin account)
#   sudo bash install.sh --admin-user X --admin-pass Y   non-interactive admin account
#   bash install.sh --skip-system         only write .env and install Node packages (no apt, no systemd)
#
# Admin account prompt (like Pterodactyl): press Enter to keep the default "admin" / "admin";
# or type your own username / password and that account is created instead.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="starcloud"
MIN_NODE_MAJOR=18
ADMIN_USER=""
ADMIN_PASS=""
SKIP_SYSTEM=false

say()  { printf '%s\n' "$*"; }
warn() { printf '\033[33m[warn]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --admin-user) ADMIN_USER="${2:-}"; shift 2 ;;
    --admin-pass) ADMIN_PASS="${2:-}"; shift 2 ;;
    --skip-system) SKIP_SYSTEM=true; shift ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) fail "Unknown option: $1" ;;
  esac
done

say "=== StarCloud Panel installer ==="
say "Folder: $APP_DIR"

# ---- 1. Host checks -------------------------------------------------------
if [ "$SKIP_SYSTEM" = false ]; then
  [ "$(id -u)" -eq 0 ] || fail "Run as root (sudo bash install.sh), or use --skip-system for a test install."
  command -v apt-get >/dev/null 2>&1 || fail "This installer supports Debian/Ubuntu (apt-get) only."
fi

say ""
say "--- Checking KVM (hardware virtualization) ---"
KVM_OK=false
CPU_VENDOR="$(grep -m1 vendor_id /proc/cpuinfo 2>/dev/null | awk '{print $3}' || true)"
VIRT_FLAG=""
if grep -qw vmx /proc/cpuinfo 2>/dev/null; then VIRT_FLAG="vmx"; fi
if grep -qw svm /proc/cpuinfo 2>/dev/null; then VIRT_FLAG="svm"; fi
if [ -e /dev/kvm ] && [ -n "$VIRT_FLAG" ]; then KVM_OK=true; fi

if [ "$KVM_OK" = true ]; then
  say "[ok]   KVM available (CPU flag: $VIRT_FLAG, vendor: ${CPU_VENDOR:-unknown})."
else
  warn "KVM is NOT available on this host."
  [ -e /dev/kvm ] || warn "  /dev/kvm is missing: enable Intel VT-x / AMD-V in BIOS/UEFI, or you are inside a VM without nested virtualization."
  [ -n "$VIRT_FLAG" ] || warn "  CPU has no vmx/svm flag."
  warn "  The panel will keep the 'KVM On / Off' option OFF and nested KVM unavailable."
  warn "  VMs will still run, but with slow software emulation (QEMU TCG)."
fi

# Nested KVM: ask the kernel module to allow nested guests (needs root and a reboot or module reload)
NESTED_PARAM=""
if [ "$KVM_OK" = true ]; then
  if [ "$CPU_VENDOR" = "AuthenticAMD" ]; then NESTED_PARAM=/sys/module/kvm_amd/parameters/nested; MOD_OPT="kvm_amd nested=1";
  else NESTED_PARAM=/sys/module/kvm_intel/parameters/nested; MOD_OPT="kvm_intel nested=1"; fi
  if [ -r "$NESTED_PARAM" ] && grep -qE '^(1|Y|y)' "$NESTED_PARAM"; then
    say "[ok]   Host nested KVM is already ON."
  elif [ "$SKIP_SYSTEM" = false ]; then
    say "[..]   Enabling nested KVM for the next boot (file: /etc/modprobe.d/starcloud-kvm-nested.conf)."
    echo "options $MOD_OPT" > /etc/modprobe.d/starcloud-kvm-nested.conf
    say "       Reboot the host once, or unload/reload the module when no VM is running."
  else
    warn "Host nested KVM is OFF. Skipped writing the modprobe file (--skip-system)."
  fi
fi

# Record the KVM result for the panel (the panel locks the KVM options when KVM is missing)
mkdir -p "$APP_DIR/data"
DEV_KVM_JSON=false; [ -e /dev/kvm ] && DEV_KVM_JSON=true
KVM_JSON=false; [ "$KVM_OK" = true ] && KVM_JSON=true
cat > "$APP_DIR/data/install-kvm-report.json" <<JSON
{"kvm": $KVM_JSON, "devKvm": $DEV_KVM_JSON, "virtFlag": "$VIRT_FLAG", "vendor": "${CPU_VENDOR:-unknown}", "checkedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
JSON
say "[ok]   KVM result saved to data/install-kvm-report.json"

# ---- 2. System packages ----------------------------------------------------
if [ "$SKIP_SYSTEM" = false ]; then
  say ""
  say "--- Installing system packages (QEMU, disk and ISO tools, build tools) ---"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y qemu-system-x86 qemu-utils genisoimage cloud-image-utils \
    openssl curl ca-certificates build-essential python3 git
  if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$MIN_NODE_MAJOR" ]; then
    say "[..]   Installing Node.js 20 (needed: Node $MIN_NODE_MAJOR or newer)."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
fi

command -v node >/dev/null 2>&1 || fail "Node.js is not installed."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge "$MIN_NODE_MAJOR" ] || fail "Node.js $MIN_NODE_MAJOR or newer is required (found $(node -v))."

# ---- 3. Admin account (Pterodactyl-style prompt) --------------------------
say ""
say "--- Admin account ---"
if [ -z "$ADMIN_USER" ] && [ -z "$ADMIN_PASS" ] && [ -t 0 ]; then
  read -r -p "Admin username [admin]: " ADMIN_USER || true
  read -r -s -p "Admin password [admin]: " ADMIN_PASS || true
  echo ""
fi
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin}"
[[ "$ADMIN_USER" =~ ^[A-Za-z0-9_.-]{3,32}$ ]] || fail "Admin username must be 3-32 characters: letters, digits, _ . -"
if [ "$ADMIN_PASS" = "admin" ]; then
  warn "Using the default password 'admin'. Change it from the Profile page right after login."
elif [ "${#ADMIN_PASS}" -lt 8 ]; then
  warn "Admin password is shorter than 8 characters. Consider a longer one."
fi
say "Admin account to create: $ADMIN_USER"

# ---- 4. Write .env (keeps existing values, replaces only what the installer owns) ----
ENV_FILE="$APP_DIR/.env"
touch "$ENV_FILE"
grep -v -E '^(STARCLOUD_ADMIN_USER|STARCLOUD_ADMIN_PASSWORD|SESSION_SECRET)=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
SECRET="$(openssl rand -hex 32)"
{
  cat "$ENV_FILE.tmp"
  echo "SESSION_SECRET=$SECRET"
  echo "STARCLOUD_ADMIN_USER=$ADMIN_USER"
  echo "STARCLOUD_ADMIN_PASSWORD=$ADMIN_PASS"
} > "$ENV_FILE"
rm -f "$ENV_FILE.tmp"
# Keep the database and secrets inside the project data folder (unless the admin set another folder)
if ! grep -qE '^STARCLOUD_DATA_DIR=' "$ENV_FILE"; then echo "STARCLOUD_DATA_DIR=./data" >> "$ENV_FILE"; fi
chmod 600 "$ENV_FILE"
say "[ok]   Wrote $ENV_FILE (mode 600). The plain-text admin password is removed automatically after the first start."

# ---- 5. Node packages ------------------------------------------------------
say ""
say "--- Installing Node.js packages ---"
cd "$APP_DIR"
if [ -f package-lock.json ]; then npm ci --omit=dev || npm install --omit=dev; else npm install --omit=dev; fi

# ---- 6. Service ------------------------------------------------------------
# systemd only counts as usable when it is really running as PID 1 (/run/systemd/system exists).
# Codespaces, Docker and WSL often have the systemctl command but no running systemd.
START_IN_BACKGROUND=0
if [ "$SKIP_SYSTEM" = false ] && [ -d /run/systemd/system ] && command -v systemctl >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
  cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<UNIT
[Unit]
Description=StarCloud Panel (VM management)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} ${APP_DIR}/app.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT
  if systemctl daemon-reload && systemctl enable --now "${SERVICE_NAME}.service"; then
    say "[ok]   Service '${SERVICE_NAME}' enabled and started."
  else
    warn "systemd could not start the service. Starting the panel in the background instead."
    START_IN_BACKGROUND=1
  fi
elif [ "$SKIP_SYSTEM" = false ]; then
  say "[info] systemd is not running on this machine (normal in Codespaces, Docker and WSL)."
  START_IN_BACKGROUND=1
fi

if [ "$START_IN_BACKGROUND" = 1 ]; then
  say ""
  if bash "$APP_DIR/start-panel.sh"; then
    say "[ok]   Panel is running in the background. After a restart run:  bash $APP_DIR/start-panel.sh"
  else
    warn "The panel did not start. Read the log above, fix the problem, then run:  bash $APP_DIR/start-panel.sh"
  fi
fi

PORT_VALUE="$(grep -E '^PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2 || true)"
PORT_VALUE="${PORT_VALUE:-8080}"
say ""
say "=== Done ==="
say "Open the panel:  http://<this-server-ip>:${PORT_VALUE}/login"
say "GitHub Codespaces: open the PORTS tab and make port ${PORT_VALUE} Public (or Private) before opening the link."
say "Admin username:  $ADMIN_USER"
say "Admin password:  (the one you typed; 'admin' if you pressed Enter)"
if [ "$KVM_OK" = false ]; then warn "KVM is OFF on this host (see the warnings above)."; fi
