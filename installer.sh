#!/usr/bin/env bash
# =============================================================================
#   StarCloud VM installer (Debian / Ubuntu)
# -----------------------------------------------------------------------------
#   sudo bash installer.sh            menu: 1) install   2) uninstall   3) upgrade
#   sudo bash installer.sh --install  install (or repair) and start the panel
#   sudo bash installer.sh --uninstall
#   sudo bash installer.sh --upgrade  get the newest code (git pull), reinstall packages, restart;
#                                   keeps the admin account, database, VMs and OS images
#   sudo bash installer.sh --admin-user X --admin-pass Y --yes   unattended install
#   bash installer.sh --skip-system   only .env + Node packages (no apt, no service)
#   sudo bash installer.sh --start | --stop | --restart | --status   control the panel (after install)
#
#   Options:
#     --admin-user NAME   admin username (3-32 chars: letters, digits, _ . -)
#     --admin-pass PASS   admin password (press Enter at the prompt for admin / admin)
#     --port N            panel port (default 8080)
#     --skip-system       do not use apt, systemd or start the panel
#     --no-service        install everything but do not start the panel
#     --yes               never ask questions (uninstall then keeps data and VMs)
#     --os-images MODE    OS cloud images for VM creation: all | none | ask (default all).
#                         "all" downloads in the background after the install; see logs/os-images.log
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
MODE=""
EXPLICIT_MODE=false
NO_PULL=false
ORIG_ARGS=("$@")
OS_LOG="$LOG_DIR/os-images.log"
OS_PID_FILE="$LOG_DIR/os-images.pid"
OS_STATUS_FILE="$LOG_DIR/os-images.txt"

ADMIN_USER=""
ADMIN_PASS=""
SKIP_SYSTEM=false
VERBOSE=false
NO_SERVICE=false
ASSUME_YES=false
OS_IMAGES="all"
PANEL_PORT=""
EXPLICIT_PORT=false
SERVICE_KIND="none"
STEP_NO=0

# ---------------------------------------------------------------- colours ----
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
  C_BLUE=$'\033[38;5;39m'; C_CYAN=$'\033[38;5;87m'; C_ACCENT=$'\033[38;5;33m'; C_LINE=$'\033[38;5;240m'
  C_OK=$'\033[38;5;84m'; C_WARN=$'\033[38;5;221m'; C_ERR=$'\033[38;5;203m'; C_GREY=$'\033[38;5;245m'
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_BLUE=""; C_CYAN=""; C_ACCENT=""; C_LINE=""
  C_OK=""; C_WARN=""; C_ERR=""; C_GREY=""
fi

# ---------------------------------------------------------------- output -----
# Status lines start with a tag, the same style as the HKVM installer:
#   [OK]  green    [INFO]  blue    [WARNING]  yellow    [ERROR]  red
ui_tag() { printf '%s%-9s%s %s\n' "$1" "$2" "$C_RESET" "$3"; }
ui_ok()   { ui_tag "$C_OK"   "[OK]"      "$*"; }
ui_info() { ui_tag "$C_BLUE" "[INFO]"    "$*"; }
ui_warn() { ui_tag "$C_WARN" "[WARNING]" "$*"; }
ui_err()  { ui_tag "$C_ERR"  "[ERROR]"   "$*" >&2; }
ui_grey() { printf '    %s%s%s\n' "$C_GREY" "$*" "$C_RESET"; }
log()     { printf '[%s] %s\n' "$(date '+%F %T')" "$*" >> "$LOG_FILE"; }
die()     { ui_err "$*"; log "FATAL: $*"; exit 1; }

usage() { sed -n '2,/^#   Every command/p' "$0" | sed 's/^#\( \|$\)//'; }

on_error() {
  local code=$?
  ui_err "Installer stopped unexpectedly (line $1, exit code $code)."
  ui_info "Full log: $LOG_FILE"
  exit "$code"
}
trap 'on_error $LINENO' ERR

# ---------------------------------------------------------------- logo -------
# The banner is the word STARCLOUD in block letters, in ONE colour: the panel's accent blue
# (#0087ff, the same as --accent-blue in public/css/admin.css). It is printed once, as plain
# static text, at the top of every mode (menu, install, upgrade, uninstall, status). There is no
# animation: the installer never moves the cursor back up over the banner, so nothing shakes or
# leaves a stray cursor. Piped output gets the same text without colour codes. On a narrow
# terminal (under 88 columns) the plain word "StarCloud" is used instead.
LOGO_ACCENT=33                 # xterm-256 index of #0087ff
LOGO_LETTERS=9
LOGO_H=6
LOGO_GAP=" "
LOGO_GREY=240                  # not-yet-painted letter cells
LOGO_SUBTITLE="Virtual Machine Panel  ·  Installer"
EOL=""           # "erase to end of line" (terminal only)
CR_EOL=""        # "return + erase line" (terminal only)
LOGO_CELLS=(
  # S (8 cols)
  "███████╗" "██╔════╝" "███████╗" "╚════██║" "███████║" "╚══════╝"
  # T (9 cols)
  "████████╗" "╚══██╔══╝" "   ██║   " "   ██║   " "   ██║   " "   ╚═╝   "
  # A (8 cols)
  " █████╗ " "██╔══██╗" "███████║" "██╔══██║" "██║  ██║" "╚═╝  ╚═╝"
  # R (8 cols)
  "██████╗ " "██╔══██╗" "██████╔╝" "██╔══██╗" "██║  ██║" "╚═╝  ╚═╝"
  # C (8 cols)
  " ██████╗" "██╔════╝" "██║     " "██║     " "╚██████╗" " ╚═════╝"
  # L (8 cols)
  "██╗     " "██║     " "██║     " "██║     " "███████╗" "╚══════╝"
  # O (9 cols)
  " ██████╗ " "██╔═══██╗" "██║   ██║" "██║   ██║" "╚██████╔╝" " ╚═════╝ "
  # U (9 cols)
  "██╗   ██╗" "██║   ██║" "██║   ██║" "██║   ██║" "╚██████╔╝" " ╚═════╝ "
  # D (8 cols)
  "██████╗ " "██╔══██╗" "██║  ██║" "██║  ██║" "██████╔╝" "╚═════╝ "
)
LOGO_TEXT_CELLS=(S t a r C l o u d)

# Picks the banner size: block letters on a wide terminal, the plain word on a narrow one.
logo_setup() {
  local cols
  if [ -t 1 ]; then EOL=$'\033[K'; CR_EOL=$'\r\033[K'; else EOL=""; CR_EOL=""; fi
  cols="$(tput cols 2>/dev/null || echo 80)"
  if [ -t 1 ] && { ! [[ "$cols" =~ ^[0-9]+$ ]] || [ "$cols" -lt 88 ]; }; then
    LOGO_H=1
    LOGO_GAP=""
    LOGO_CELLS=("${LOGO_TEXT_CELLS[@]}")
  else
    LOGO_H=6
    LOGO_GAP=" "
  fi
}

# logo_draw: prints the banner once, every letter in the accent colour. No cursor movement, so
# it cannot shift or flicker, and it looks the same in every terminal (VS Code, PuTTY, tmux, ...).
logo_draw() {
  local H="$LOGO_H" N="$LOGO_LETTERS" gr i cell line
  printf '\n'
  for ((gr = 0; gr < H; gr++)); do
    line="  "
    for ((i = 0; i < N; i++)); do
      cell="${LOGO_CELLS[$((i * H + gr))]}"
      if [ -n "$C_RESET" ]; then
        line+="$(printf '\033[1;38;5;%sm' "$LOGO_ACCENT")$cell$C_RESET$LOGO_GAP"
      else
        line+="$cell$LOGO_GAP"
      fi
    done
    printf '%s%s\n' "$line" "$EOL"
  done
  printf '\n'
  printf '    %s%s%s%s\n' "$C_GREY" "$LOGO_SUBTITLE" "$C_RESET" "$EOL"
  printf '%s\n' "$EOL"
}

# Shows the banner once. Same output for menu, install, upgrade, uninstall and status.
show_logo() {
  logo_setup
  if [ -t 1 ] && [ "$VERBOSE" = false ]; then TERM="${TERM:-xterm-256color}" clear 2>/dev/null || true; fi
  logo_draw
}

# read wrapper (keeps the prompt's exit status)
ask() {
  local rc=0
  read "$@" || rc=$?
  return "$rc"
}

# Section title: a line of '=' above and below, in the accent colour.
section() {
  local rule
  rule="$(printf '=%.0s' $(seq 1 64))"
  printf '\n%s%s%s\n' "$C_LINE" "$rule" "$C_RESET"
  printf '  %s%s%s\n' "$C_BOLD$C_ACCENT" "$*" "$C_RESET"
  printf '%s%s%s\n' "$C_LINE" "$rule" "$C_RESET"
  log "== $*"
}

# ---------------------------------------------------------------- helpers ----
port_listening() { (exec 3<>"/dev/tcp/127.0.0.1/${PANEL_PORT}") >/dev/null 2>&1; }
port_free() { ! (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1; }

# First free port after PANEL_PORT (searches 50 ports). Prints nothing when none is free.
suggest_port() {
  local p
  for ((p = PANEL_PORT + 1; p <= PANEL_PORT + 50 && p <= 65535; p++)); do
    if port_free "$p"; then echo "$p"; return 0; fi
  done
  return 0
}

# Called when PANEL_PORT is busy and it is not this panel.
# Terminal: ask for another port (Enter = the suggested one).
# Unattended: use the next free port, unless the port was given with --port (then stop, change nothing).
choose_free_port() {
  local try next suggested
  if [ -t 0 ] && [ "$ASSUME_YES" = false ]; then
    for try in 1 2 3; do
      suggested="$(suggest_port)"
      ask -r -p "  Enter another port [${suggested:-none}]: " next || next=""
      next="${next:-$suggested}"
      if ! [[ "$next" =~ ^[0-9]+$ ]] || [ "$next" -lt 1 ] || [ "$next" -gt 65535 ]; then
        ui_warn "That is not a valid port number."; continue
      fi
      if port_free "$next"; then PANEL_PORT="$next"; ui_ok "Using port ${PANEL_PORT}."; return 0; fi
      ui_warn "Port ${next} is also in use. Try another one."
    done
    die "No free port was chosen. Run the installer again with --port N."
  fi
  if [ "$EXPLICIT_PORT" = true ]; then
    die "Port ${PANEL_PORT} is busy. Free it or choose another port with --port N."
  fi
  next="$(suggest_port)"
  [ -n "$next" ] || die "No free port between ${PANEL_PORT} and $((PANEL_PORT + 50)). Free one, then run again with --port N."
  PANEL_PORT="$next"
  ui_warn "Unattended mode: using the next free port, ${PANEL_PORT}."
}

# PID of the program listening on a TCP port (empty when unknown).
port_owner_pid() {
  command -v ss >/dev/null 2>&1 || return 0
  ss -ltnpH "sport = :$1" 2>/dev/null | grep -o 'pid=[0-9]*' | head -n 1 | cut -d= -f2
}

# True only when the program on PANEL_PORT is THIS panel (node app.js started from APP_DIR).
# Any other program on the port, even one that answers HTTP, is not our panel.
panel_answers() {
  local pid dir cmd
  pid="$(port_owner_pid "$PANEL_PORT")"
  if [ -z "$pid" ]; then
    command -v ss >/dev/null 2>&1 && return 1   # ss is there and reports no owner: nothing of ours here
    port_listening || return 1
    pid="$(panel_pid 2>/dev/null || true)"
    [ -n "$pid" ] || return 1
  fi
  dir="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
  [ -n "$dir" ] && [ "$dir" = "$(readlink -f "$APP_DIR")" ] && [[ "$cmd" == *app.js* ]]
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
  printf '%s%-9s%s [%d/%d] %s%s (skipped)%s\n' "$C_GREY" "[SKIP]" "$C_RESET" "$STEP_NO" "$TOTAL_STEPS" "$C_GREY" "$1" "$C_RESET"
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
      printf '%s%s%-9s%s [%d/%d] %s %s(%ss)%s\n' "$CR_EOL" "$C_OK" "[OK]" "$C_RESET" "$n" "$TOTAL_STEPS" "$title" "$C_GREY" "$took" "$C_RESET"
    fi
    log "OK step $n (${took}s)"
    return 0
  fi

  if [ "$VERBOSE" = false ]; then
    printf '%s%s%-9s%s [%d/%d] %s\n' "$CR_EOL" "$C_ERR" "[ERROR]" "$C_RESET" "$n" "$TOTAL_STEPS" "$title"
    echo ""
    printf '  %sLast lines of the log:%s\n' "$C_WARN" "$C_RESET"
    tail -n +"$((before + 1))" "$LOG_FILE" | tail -n 25 | sed 's/^/      /'
  else
    printf '\n%s%-9s%s [%d/%d] %s\n' "$C_ERR" "[ERROR]" "$C_RESET" "$n" "$TOTAL_STEPS" "$title"
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
    echo "could not stop the panel (pid $p). Run with sudo: sudo bash installer.sh --stop"
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
  [ -d "$APP_DIR/node_modules/express" ] || { echo "Node packages are missing. Run: sudo bash installer.sh"; return 1; }
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
  [ -f "$ENV_FILE" ] || die "The panel is not installed yet. Run: sudo bash installer.sh"
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

control_restart() {
  [ -f "$ENV_FILE" ] || die "The panel is not installed yet. Run: sudo bash installer.sh"
  if service_installed; then
    systemctl restart "$SERVICE_NAME" && echo "service '${SERVICE_NAME}' restarted"
    return 0
  fi
  control_stop
  sleep 1
  control_start
}

# Runs one panel control action: start | stop | restart | status. Used by the menu and the flags.
run_control() {
  case "$1" in
    start)   control_start ;;
    stop)    control_stop ;;
    restart) control_restart ;;
    status)  control_status ;;
  esac
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
  echo "  start/stop  : sudo bash installer.sh --start | --stop"
  return "$rc"
}

# ---------------------------------------------------------------- background work ----
# The OS image download runs as its own process (same idea as the panel), so the installer finishes
# at once and the images keep downloading. Progress: logs/os-images.log. Short status: logs/os-images.txt.

os_worker_running() {
  [ -f "$OS_PID_FILE" ] && kill -0 "$(cat "$OS_PID_FILE" 2>/dev/null)" 2>/dev/null
}

# One line for the summary: download progress, or the final result.
os_summary_line() {
  local st=""
  [ -f "$OS_STATUS_FILE" ] && st="$(head -n 1 "$OS_STATUS_FILE" 2>/dev/null || true)"
  if os_worker_running; then
    ui_info "OS images: downloading in the background, ${st:-starting}. Watch: tail -f $OS_LOG"
  elif [[ "$st" == running* ]]; then
    ui_warn "OS images: the download stopped early ($st). Resume with: sudo bash installer.sh  (choose 3)"
  elif [ -n "$st" ]; then
    ui_info "$st"
  fi
}

# Internal entry point: "bash installer.sh --os-worker". Downloads every built-in OS template that is not
# in the cache yet (~/vms/templates/<key>-template.qcow2). Existing files are kept. One failed image never
# stops the others. It never runs the installer steps.
os_image_worker() {
  trap - ERR
  set +e
  local dir list key url file part total=0 n=0 ok=0 had=0 nfail=0 failed="" size
  mkdir -p "$LOG_DIR"
  echo "$$" > "$OS_PID_FILE"
  dir="$(node -p "require('path').join(require('os').homedir(), 'vms', 'templates')" 2>/dev/null || true)"
  if [ -z "$dir" ] || ! mkdir -p "$dir"; then
    echo "cannot create the template folder: ${dir:-unknown}"
    rm -f "$OS_PID_FILE"
    exit 1
  fi
  list="$(node -e "const { OS_TEMPLATES, resolveTemplateUrl } = require(process.argv[1]); (async () => { for (const [k, v] of Object.entries(OS_TEMPLATES)) console.log(k + ' ' + await resolveTemplateUrl(v)); })();" "$APP_DIR/services/os-templates.js" 2>/dev/null || true)"
  total="$(printf '%s\n' "$list" | grep -c . || true)"
  echo "$(date '+%F %T') OS image download: ${total} images -> ${dir}"
  echo "running: starting (${total} images)" > "$OS_STATUS_FILE"
  while read -r key url; do
    [ -n "$key" ] || continue
    n=$((n + 1))
    file="$dir/${key}-template.qcow2"
    part="$file.part"
    if [ -s "$file" ]; then
      had=$((had + 1))
      echo "[$n/$total] $key: already present"
      continue
    fi
    echo "[$n/$total] $key: downloading $url"
    rm -f "$part"
    if curl -fL -sS --retry 3 --retry-delay 10 --connect-timeout 20 --speed-time 60 --speed-limit 10240 -o "$part" "$url" && [ -s "$part" ]; then
      mv -f "$part" "$file"
      ok=$((ok + 1))
      size="$(stat -c %s "$file" 2>/dev/null || echo 0)"
      echo "[$n/$total] $key: done ($(awk -v s="$size" 'BEGIN { printf "%.2f GB", s / 1073741824 }'))"
    else
      rm -f "$part"
      nfail=$((nfail + 1))
      failed="$failed $key"
      echo "[$n/$total] $key: FAILED (the others continue)"
    fi
    echo "running: $n/$total done ($ok ok, $had present, $nfail failed)" > "$OS_STATUS_FILE"
  done <<< "$list"
  {
    echo "OS images: $ok downloaded, $had already present, $nfail failed (of $total)"
    [ -z "$failed" ] || echo "failed:$failed -> retry later: sudo bash installer.sh  (choose 3, or Admin > Templates)"
    echo "finished: $(date '+%F %T')"
  } > "$OS_STATUS_FILE"
  cat "$OS_STATUS_FILE"
  rm -f "$OS_PID_FILE"
  exit 0
}

# ---------------------------------------------------------------- menu actions -----
# Asks a yes/no question. Answers "yes" only when the user types y. Never asks with --yes.
confirm_yes() {
  [ "$ASSUME_YES" = false ] && [ -t 0 ] || return 1
  local answer=""
  ask -r -p "  $1 [y/N]: " answer || answer=""
  [[ "$answer" =~ ^[Yy]$ ]]
}

# The menu shown when the installer is started without options on a terminal.
choose_action() {
  local choice="" tries=0
  printf '\n  %sWhat do you want to do?%s\n' "$C_BOLD" "$C_RESET"
  printf '     %s1%s  Install StarCloud VM\n' "$C_ACCENT" "$C_RESET"
  printf '     %s2%s  Uninstall StarCloud VM\n' "$C_ACCENT" "$C_RESET"
  printf '     %s3%s  Upgrade StarCloud VM\n' "$C_ACCENT" "$C_RESET"
  printf '     %s4%s  Start the panel\n' "$C_ACCENT" "$C_RESET"
  printf '     %s5%s  Stop the panel\n' "$C_ACCENT" "$C_RESET"
  printf '     %s6%s  Restart the panel\n\n' "$C_ACCENT" "$C_RESET"
  while :; do
    ask -r -p "  Type 1 to 6 [1]: " choice || choice=""
    choice="${choice//[[:space:]]/}"
    case "${choice:-1}" in
      1) MODE="install"; return 0 ;;
      2) MODE="uninstall"; return 0 ;;
      3) MODE="upgrade"; return 0 ;;
      4) MODE="start"; return 0 ;;
      5) MODE="stop"; return 0 ;;
      6) MODE="restart"; return 0 ;;
    esac
    tries=$((tries + 1))
    [ "$tries" -lt 5 ] || die "No valid choice. Run the installer again: sudo bash installer.sh"
    ui_warn "Please type a number from 1 to 6."
  done
}

# Upgrade: get the newest code (git pull, fast-forward only), then run the normal install steps again.
# The admin account, the database, the VMs and the OS images are kept.
upgrade_prepare() {
  if [ ! -f "$ENV_FILE" ] || [ ! -d "$APP_DIR/node_modules/express" ]; then
    ui_warn "No existing installation found. Running a fresh install instead."
    MODE="install"
    return 0
  fi
  if [ "$NO_PULL" = false ] && [ -d "$APP_DIR/.git" ] && command -v git >/dev/null 2>&1; then
    local before after
    # sudo may run as root on a folder owned by another user: trust this folder; never ask for a password
    export GIT_TERMINAL_PROMPT=0
    before="$(git -c safe.directory="$APP_DIR" -C "$APP_DIR" rev-parse HEAD 2>/dev/null || true)"
    if git -c safe.directory="$APP_DIR" -C "$APP_DIR" pull --ff-only >>"$LOG_FILE" 2>&1; then
      after="$(git -c safe.directory="$APP_DIR" -C "$APP_DIR" rev-parse HEAD 2>/dev/null || true)"
      if [ "$before" != "$after" ]; then
        ui_ok "New code downloaded (git pull). Continuing the upgrade with it."
        exec bash "$APP_DIR/installer.sh" ${ORIG_ARGS[@]+"${ORIG_ARGS[@]}"} --upgrade --no-pull
      fi
      ui_ok "Code is already the newest version."
    else
      ui_warn "git pull did not work (local changes or no internet). Upgrading with the code in this folder. Log: $LOG_FILE"
    fi
  else
    ui_grey "Not a git checkout: upgrading with the files in this folder."
  fi
  return 0
}

# Uninstall: stops the panel and removes its service. Asks before deleting data or VM disks.
# With --yes nothing is deleted (only the service and the running processes are stopped).
do_uninstall() {
  section "Uninstall StarCloud VM"
  ui_warn "This stops the panel and removes its auto-start service."
  ui_grey "Kept: server packages (QEMU, libvirt, Node.js) and this folder: $APP_DIR"
  if [ "$ASSUME_YES" = false ] && [ -t 0 ]; then
    local go=""
    ask -r -p "  Continue with the uninstall? [y/N]: " go || go=""
    if ! [[ "$go" =~ ^[Yy]$ ]]; then
      ui_info "Cancelled. Nothing was changed."
      return 0
    fi
  fi

  local unit="/etc/systemd/system/${SERVICE_NAME}.service" p
  if systemd_usable && [ -f "$unit" ]; then
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "$unit"
    systemctl daemon-reload 2>/dev/null || true
    ui_ok "Service '${SERVICE_NAME}' stopped and removed"
  fi
  stop_panel_background >/dev/null 2>&1 || true
  ui_info "Panel process: stopped (or it was not running)"
  if [ -f "$OS_PID_FILE" ]; then
    p="$(cat "$OS_PID_FILE" 2>/dev/null || true)"
    if [ -n "$p" ]; then kill -- -"$p" 2>/dev/null || kill "$p" 2>/dev/null || true; fi
    rm -f "$OS_PID_FILE"
    ui_info "OS image download: stopped (or it was not running)"
  fi

  local data_dir home_dir vm_dir
  data_dir="$(read_env_value STARCLOUD_DATA_DIR "$APP_DIR/data")"
  case "$data_dir" in
    /*) ;;
    *) data_dir="$APP_DIR/${data_dir#./}" ;;
  esac
  if [ -n "$data_dir" ] && [ "$data_dir" != "/" ] && confirm_yes "Also delete the database (users, VM records, settings), .env and the logs?"; then
    rm -rf -- "$data_dir" "$LOG_DIR" "$ENV_FILE"
    ui_ok "Deleted: database, .env and logs"
  else
    ui_grey "Kept: database, .env and logs (a later install or upgrade uses them)"
  fi

  home_dir="$(node -p "require('os').homedir()" 2>/dev/null || echo "$HOME")"
  vm_dir="$home_dir/vms"
  if [ -d "$vm_dir" ] && confirm_yes "Also delete ALL VM disks, ISOs and cloud images in $vm_dir? This CANNOT be undone."; then
    pkill -f "qemu-system.*${vm_dir}" 2>/dev/null || true
    sleep 2
    rm -rf -- "$vm_dir"
    ui_ok "Deleted: $vm_dir"
  elif [ -d "$vm_dir" ]; then
    ui_grey "Kept: VM disks and images in $vm_dir (running VMs are not stopped by the uninstall)"
  fi

  ui_ok "Uninstall finished."
  ui_info "Install again any time with:  sudo bash ${APP_DIR}/installer.sh"
  return 0
}

# ---------------------------------------------------------------- args -------
while [ $# -gt 0 ]; do
  case "$1" in
    --admin-user)  ADMIN_USER="${2:-}"; shift 2 ;;
    --admin-pass)  ADMIN_PASS="${2:-}"; shift 2 ;;
    --port)        PANEL_PORT="${2:-}"; EXPLICIT_PORT=true; shift 2 ;;
    --skip-system) SKIP_SYSTEM=true; shift ;;
    --no-service)  NO_SERVICE=true; shift ;;
    --yes|-y)      ASSUME_YES=true; shift ;;
    --os-images)   OS_IMAGES="${2:-}"; shift 2
                   case "$OS_IMAGES" in all|none|ask) ;; *) echo "--os-images must be: all, none or ask" >&2; exit 1 ;; esac ;;
    --all-os)      OS_IMAGES=all; shift ;;
    --verbose|-v)  VERBOSE=true; shift ;;
    --install)     MODE="install"; EXPLICIT_MODE=true; shift ;;
    --uninstall)   MODE="uninstall"; EXPLICIT_MODE=true; shift ;;
    --upgrade)     MODE="upgrade"; EXPLICIT_MODE=true; shift ;;
    --no-pull)     NO_PULL=true; shift ;;
    --start)       MODE="start"; EXPLICIT_MODE=true; shift ;;
    --stop)        MODE="stop"; EXPLICIT_MODE=true; shift ;;
    --restart)     MODE="restart"; EXPLICIT_MODE=true; shift ;;
    --status)      MODE="status"; EXPLICIT_MODE=true; shift ;;
    --os-worker)   MODE="os-worker"; shift ;;
    -h|--help)     usage; exit 0 ;;
    *) echo "Unknown option: $1 (see: bash installer.sh --help)" >&2; exit 1 ;;
  esac
done

# internal: the background OS image download (started by the install)
if [ "$MODE" = "os-worker" ]; then
  os_image_worker
fi

case "$MODE" in
  start|stop|restart|status)
    PANEL_PORT="${PANEL_PORT:-$(read_env_value PORT 8080)}"
    [ -t 1 ] && show_logo
    rc=0
    run_control "$MODE" || rc=$?
    exit "$rc"
    ;;
esac

mkdir -p "$LOG_DIR" "$APP_DIR/data"
: >> "$LOG_FILE"
log "===== StarCloud Panel installer started ($(date)) args: $* ====="

PANEL_PORT="${PANEL_PORT:-$(read_env_value PORT 8080)}"
[[ "$PANEL_PORT" =~ ^[0-9]+$ ]] && [ "$PANEL_PORT" -ge 1 ] && [ "$PANEL_PORT" -le 65535 ] || die "Port must be a number from 1 to 65535."

show_logo
# Menu: only when started by hand on a terminal with no options. Any option = no menu.
if [ -z "$MODE" ]; then
  if [ -t 0 ] && [ -t 1 ] && [ "$ASSUME_YES" = false ] && [ -z "$ADMIN_USER" ] && [ -z "$ADMIN_PASS" ]; then
    choose_action
  else
    MODE="install"
  fi
fi
case "$MODE" in
  uninstall) do_uninstall; exit $? ;;
  upgrade)   upgrade_prepare ;;
  start|stop|restart)
    PANEL_PORT="${PANEL_PORT:-$(read_env_value PORT 8080)}"
    rc=0; run_control "$MODE" || rc=$?
    exit "$rc" ;;
esac
log "mode: $MODE"

# =============================================================================
#   PREFLIGHT: check the machine before changing anything
# =============================================================================
section "Checking this machine"

if [ "$SKIP_SYSTEM" = false ]; then
  [ "$(id -u)" -eq 0 ] || die "Run as root:  sudo bash installer.sh     (or use --skip-system for a test install)"
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
ui_ok "Kernel: $(uname -r)"

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
  ui_warn "systemd is not running. The panel will run in the background (survives closing the terminal)."
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
  choose_free_port
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
if [ "$MODE" = upgrade ]; then
  ADMIN_USER="$(read_env_value STARCLOUD_ADMIN_USER admin)"
  ADMIN_PASS="$(read_env_value STARCLOUD_ADMIN_PASSWORD admin)"
  ui_ok "Upgrade keeps the current admin account: ${ADMIN_USER} (password unchanged)"
fi
if [ "$MODE" != upgrade ] && [ -z "$ADMIN_USER" ] && [ -z "$ADMIN_PASS" ] && [ "$ASSUME_YES" = false ] && [ -t 0 ]; then
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
  *)    ui_grey "OS images skipped (download later: sudo bash installer.sh --os-images all)" ;;
esac
log "os images: $OS_IMAGES"

# =============================================================================
#   INSTALL STEPS
# =============================================================================
section "Installing"

# Starts the OS image download in the background, so the install finishes at once. The panel works while
# the images download; a VM can be created from an image once its file is complete. Existing images are
# kept. One failed image never stops the others. Progress: logs/os-images.log.
step_os_images() {
  if os_worker_running; then
    echo "already downloading in the background (pid $(cat "$OS_PID_FILE" 2>/dev/null))"
    return 0
  fi
  mkdir -p "$LOG_DIR"
  echo "$(date '+%F %T') installer started the OS image download" >> "$OS_LOG"
  echo "queued: ${OS_COUNT} images" > "$OS_STATUS_FILE"
  nohup setsid bash "$APP_DIR/installer.sh" --os-worker >> "$OS_LOG" 2>&1 < /dev/null &
  echo "started in the background: ${OS_COUNT} images (progress: ${OS_LOG})"
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
  run_step "Starting OS image download in the background (${OS_COUNT} images)" step_os_images
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
  STATUS="${C_OK}ONLINE${C_RESET}"; STATUS_TEXT="ONLINE"
elif [ "$SKIP_SYSTEM" = true ] || [ "$NO_SERVICE" = true ]; then
  STATUS="${C_WARN}NOT STARTED${C_RESET}"; STATUS_TEXT="NOT STARTED"
else
  STATUS="${C_ERR}OFFLINE${C_RESET}"; STATUS_TEXT="OFFLINE"
fi

printf '\n%s%s%s\n' "$C_LINE" "$(printf '=%.0s' $(seq 1 64))" "$C_RESET"
printf '  %s%s%s\n' "$C_BOLD$C_ACCENT" "StarCloud Panel is installed" "$C_RESET"
printf '%s%s%s\n' "$C_LINE" "$(printf '=%.0s' $(seq 1 64))" "$C_RESET"
printf '   %-16s %b\n' "Status"     "$STATUS"
printf '   %-16s %s\n' "Panel URL"  "$PANEL_URL/login"
printf '   %-16s %s\n' "Admin user" "$ADMIN_USER  (password: the one you chose; 'admin' if you pressed Enter)"
if [ "$STATUS_TEXT" = "NOT STARTED" ]; then SERVICE_SHOW="not started"; else SERVICE_SHOW="$SERVICE_KIND"; fi
printf '   %-16s %s\n' "Service"    "$SERVICE_SHOW"
printf '   %-16s %s\n' "Folder"     "$APP_DIR"
printf '   %-16s %s\n' "Install log" "$LOG_FILE"
os_summary_line
printf '\n   %sCommands%s\n' "$C_BOLD" "$C_RESET"
if [ "$SERVICE_KIND" = "systemd" ]; then
  printf '     start / stop / restart   sudo systemctl start|stop|restart %s\n' "$SERVICE_NAME"
  printf '     live panel log           journalctl -u %s -f\n' "$SERVICE_NAME"
else
  printf '     start                    sudo bash %s/installer.sh --start\n' "$APP_DIR"
  printf '     stop                     sudo bash %s/installer.sh --stop\n' "$APP_DIR"
  printf '     restart                  sudo bash %s/installer.sh --restart\n' "$APP_DIR"
  printf '     status                   bash %s/installer.sh --status\n' "$APP_DIR"
  printf '     live panel log           tail -f %s\n' "$PANEL_LOG"
fi
printf '     menu: install / uninstall / upgrade   sudo bash installer.sh\n'

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
  ui_info "Files and settings are ready. Start the panel with:  sudo bash ${APP_DIR}/installer.sh --start"
else
  ui_warn "Installed, but the panel is not answering yet. Read $PANEL_LOG, then run:  sudo bash ${APP_DIR}/installer.sh --start"
fi
log "installer finished (status: ${STATUS_TEXT})"
