#!/usr/bin/env bash
# Start the StarCloud panel in the background.
#
# Use this on hosts where systemd is not running (for example GitHub Codespaces,
# Docker containers, WSL). The installer calls it automatically in that case.
#
#   bash start-panel.sh      start the panel (safe to run again; does nothing if it is already up)
#
# After a Codespace restart the panel is stopped, so run this command again.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

ENV_FILE="$APP_DIR/.env"
PID_FILE="$APP_DIR/data/panel.pid"
LOG_FILE="$APP_DIR/logs/panel.log"

PORT_VALUE="$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2 || true)"
PORT_VALUE="${PORT_VALUE:-8080}"

NODE_BIN="$(command -v node || true)"
[ -n "$NODE_BIN" ] || { echo "[error] Node.js is not installed. Install Node.js 18 or newer, then run this again."; exit 1; }
[ -d "$APP_DIR/node_modules/express" ] || { echo "[error] Node packages are missing. Run: npm ci --omit=dev"; exit 1; }
[ -f "$ENV_FILE" ] || echo "[warn] $ENV_FILE is missing. Run the installer first (bash install.sh) so the admin account is created."

# Quick check: does something already answer on the panel port?
is_up() {
  "$NODE_BIN" -e "require('http').get('http://127.0.0.1:${PORT_VALUE}/login', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))" >/dev/null 2>&1
}

if is_up; then
  echo "[ok] The panel is already running on port ${PORT_VALUE}."
  exit 0
fi

# Stop a stale process from an earlier start, if its PID file is still there
if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[info] Stopping old panel process $OLD_PID first."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
  fi
  rm -f "$PID_FILE"
fi

mkdir -p "$APP_DIR/logs" "$APP_DIR/data"
echo "--- Starting the StarCloud panel on port ${PORT_VALUE} (log: logs/panel.log) ---"
nohup "$NODE_BIN" "$APP_DIR/app.js" >> "$LOG_FILE" 2>&1 < /dev/null &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

for _ in $(seq 1 40); do
  if is_up; then
    echo "[ok] The panel is up on port ${PORT_VALUE} (process ${NEW_PID})."
    echo "     Codespaces: open the PORTS tab, and make port ${PORT_VALUE} Public (or Private + your login) before opening the link."
    exit 0
  fi
  if ! kill -0 "$NEW_PID" 2>/dev/null; then
    echo "[error] The panel process stopped right after start. Last log lines:"
    tail -n 40 "$LOG_FILE" || true
    exit 1
  fi
  sleep 1
done

echo "[error] The panel did not answer on port ${PORT_VALUE} within 40 seconds. Last log lines:"
tail -n 40 "$LOG_FILE" || true
exit 1
