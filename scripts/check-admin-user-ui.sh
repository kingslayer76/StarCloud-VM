#!/bin/bash
# Usage: bash scripts/check-admin-user-ui.sh   (set B=http://host:port and ADMIN_PW if not default)
# NOTE: creates one test user (vtestNNNN) and toggles show_panel_version on then off.
# Curl checks for the admin/user separation, version toggle, About/System removal and OS logos.
B=${B:-http://localhost:8080}
T=$(mktemp -d)   # cookie jars and temp html
PASS=0; FAIL=0
ok(){ if [ "$1" = "1" ]; then PASS=$((PASS+1)); echo "PASS  $2"; else FAIL=$((FAIL+1)); echo "FAIL  $2  $3"; fi; }
ADM=$T/admin.jar; USR=$T/user.jar
code(){ curl -s -o /dev/null -w '%{http_code}' -b "$1" "$B$2"; }
loc(){ curl -s -o /dev/null -w '%{redirect_url}' -b "$1" "$B$2"; }
# admin login
R=$(curl -s -c $ADM -H 'Content-Type: application/json' -d "{\"username\":\"admin\",\"password\":\"${ADMIN_PW:-admin}\"}" $B/api/login)
ok "$(echo "$R" | grep -c '"role":"admin"')" "admin login returns role admin" "$R"
ok "$([ "$(loc $ADM /dashboard)" = "$B/admin/dashboard" ] && echo 1)" "admin /dashboard -> /admin/dashboard" "$(loc $ADM /dashboard)"
ok "$([ "$(loc $ADM /vms)" = "$B/admin/vms" ] && echo 1)" "admin /vms -> /admin/vms" "$(loc $ADM /vms)"
ok "$([ "$(loc $ADM /profile)" = "$B/admin/settings#security" ] && echo 1)" "admin /profile -> settings security" "$(loc $ADM /profile)"
ok "$([ "$(loc $ADM /vm/1)" = "$B/admin/vm/1" ] && echo 1)" "admin /vm/1 -> /admin/vm/1" "$(loc $ADM /vm/1)"
ok "$([ "$(code $ADM /admin/dashboard)" = "200" ] && echo 1)" "admin dashboard 200" "$(code $ADM /admin/dashboard)"
DASH=$(curl -s -b $ADM $B/admin/dashboard)
ok "$(echo "$DASH" | grep -c 'Welcome to StarCloud Panel. Manage your virtual machines in one place.')" "admin dashboard welcome banner" ""
ok "$(echo "$DASH" | grep -c 'Inspired by HopingBoyz · Built by KingSlayer')" "admin dashboard welcome credit" ""
ok "$([ "$(echo "$DASH" | grep -c 'Panel Version')" = 0 ] && echo 1)" "version hidden on admin dashboard (toggle OFF)" ""
ok "$([ "$(echo "$DASH" | grep -c 'id="notifBtn"\|class="theme-switcher"\|id="darkThemeBtn"')" = 0 ] && echo 1)" "no bell / theme switcher in top bar" ""
SB=$(curl -s -b $ADM $B/admin/dashboard)
ok "$([ "$(echo "$SB" | grep -c 'nav-text">My Profile\|nav-text">My Virtual Machines')" = 0 ] && echo 1)" "admin sidebar has no My Profile / My VMs" ""
ok "$(echo "$SB" | grep -c 'href="/admin/system-info"')" "sidebar System Info links to /admin/system-info" ""
ok "$([ "$(echo "$SB" | grep -c 'V1\.0\|V2\.0')" = 0 ] && echo 1)" "no version text in admin sidebar (toggle OFF)" ""
SET=$(curl -s -b $ADM $B/admin/settings)
ok "$([ "$(echo "$SET" | grep -c 'data-tab="about"\|id="tab-about"\|data-tab="system"\|id="tab-system"')" = 0 ] && echo 1)" "About and System Info tabs removed" ""
ok "$([ "$(echo "$SET" | grep -c 'setting_panel_version')" = 0 ] && echo 1)" "panel version text input removed" ""
ok "$([ "$(echo "$SET" | grep -c 'id=\"setting_show_panel_version\"')" = 1 ] && echo 1)" "show_panel_version toggle present" ""
ok "$([ "$(echo "$SET" | grep -c 'id=\"mtEnabled\"\|id=\"emStop\"\|id=\"auditRows\"')" -ge 3 ] && echo 1)" "maintenance / emergency / audit still in General" ""
ok "$(echo "$SET" | grep -c 'Stop All VMs')" "Stop All VMs (old Danger Zone) removed from settings" "found"
SI=$(curl -s -o $T/sysinfo.html -w '%{http_code}' -b $ADM $B/admin/system-info)
ok "$([ "$SI" = "200" ] && echo 1)" "system-info page 200" "$SI"
ok "$([ "$(grep -c 'Host virtualization (KVM)' $T/sysinfo.html)" -ge 1 ] && echo 1)" "system-info has host virtualization" ""
ok "$([ "$(grep -c 'Panel info' $T/sysinfo.html)" -ge 1 ] && echo 1)" "system-info has panel info" ""
ok "$([ "$(grep -c 'V1\.0' $T/sysinfo.html)" = 0 ] && echo 1)" "system-info hides version (toggle OFF)" ""
ok "$([ "$(code $ADM /api/settings)" = 200 ] && echo 1)" "api settings 200" ""
TPL=$(curl -s -b $ADM $B/admin/templates)
ok "$([ "$(curl -s -o /dev/null -w '%{http_code}' $B/images/os/ubuntu.svg)" = "200" ] && echo 1)" "ubuntu logo served 200" ""
ok "$(curl -s $B/images/os/ubuntu.svg | grep -c '<svg')" "ubuntu logo is svg" ""
ok "$([ "$(curl -s $B/js/os-icons.js | grep -c 'images/os')" -ge 1 ] && echo 1)" "os-icons.js knows /images/os paths" ""
# toggle ON then verify version shows, then OFF again
curl -s -b $ADM -H 'Content-Type: application/json' -X PUT -d '{"show_panel_version":"1"}' $B/api/settings >/dev/null
ok "$([ "$(curl -s -b $ADM $B/admin/dashboard | grep -c 'V1\.0')" -ge 1 ] && echo 1)" "toggle ON -> V1.0 shows on admin dashboard" ""
ok "$([ "$(curl -s -b $ADM $B/admin/system-info | grep -c 'V1\.0')" -ge 1 ] && echo 1)" "toggle ON -> V1.0 shows on system info" ""
curl -s -b $ADM -H 'Content-Type: application/json' -X PUT -d '{"show_panel_version":"0"}' $B/api/settings >/dev/null
ok "$([ "$(curl -s -b $ADM $B/admin/dashboard | grep -c 'V1\.0')" = 0 ] && echo 1)" "toggle OFF -> version hidden again" ""
# signup a normal user and check user flow
UN=vtest$RANDOM
curl -s -c $USR -H 'Content-Type: application/json' -d "{\"username\":\"$UN\",\"password\":\"secret123\"}" $B/api/auth/signup >/dev/null
ok "$([ "$(loc $USR /dashboard)" = "" ] && echo 1)" "user /dashboard 200 (no redirect)" "$(loc $USR /dashboard)"
UD=$(curl -s -b $USR $B/dashboard)
ok "$(echo "$UD" | grep -c 'Welcome to StarCloud Panel')" "user dashboard welcome banner" ""
ok "$([ "$(echo "$UD" | grep -c 'V1\.0')" = 0 ] && echo 1)" "user dashboard hides version (toggle OFF)" ""
ok "$([ "$(code $USR /profile)" = 200 ] && echo 1)" "user profile 200" ""
ok "$([ "$(code $USR /admin/dashboard)" != "200" ] && echo 1)" "normal user cannot open /admin/dashboard" "$(code $USR /admin/dashboard)"
echo; echo "RESULT: $PASS passed, $FAIL failed"
