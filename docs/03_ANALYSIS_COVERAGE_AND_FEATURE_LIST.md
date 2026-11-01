# StarCloud Panel: input-file coverage and full feature list (2026-11-01)

Ye file do kaam karti hai:
1. `Analyse-File/` (15 files) aur `All VM Maker PROMPT/` (3 files) mein se **har file ka status** (koi file skip nahi).
2. **Poori feature list**: kya ban chuka hai, kya pending hai, aur sab features ek jagah.

Status legend: ✅ Done (code hai, sandbox par test hua) · 🟡 Partial · ⬜ Pending · 🚫 Removed / out of scope (aapke faisle se).
Har feature ka detail `All VM Maker PROMPT/All Analyse File Detail.txt` ke section 7 mein hai (ID A1–H1 wahin se liye gaye hain).

---

## 1. Input files: coverage

Extraction sirf `/tmp/analysis/x/` mein hua (repo mein koi zip extract nahi hui). File count wahi hai jo extract ke baad mili.

| # | File | Kya hai (short) | Extract | Files | Kahan analyse hua | Status |
|---|---|---|---|---|---|---|
| 1 | `ALTEX-CODE-main.zip` | ALTREX CODE V4 (AI coding workspace, Electron) | ok | 3 | All Analyse §6.6 | ✅ reviewed, not used (StarCloud se unrelated) |
| 2 | `HVM-1.rar` | Python/Flask VPS panel "hvm" family. **File asal mein ZIP hai** (PK header, `.rar` extension). `unrar` ki zaroorat nahi | `unzip` ok | 69 | All Analyse §6.1 family, `docs/00` | ✅ reviewed (reference) |
| 3 | `HVM.zip` | HVM panel (Flask, HVM-8 family), routes + DB | ok | 83 | All Analyse §6.1–6.2 | ✅ reviewed (reference) |
| 4 | `MYRAA-Source-Code-1.5.2.zip` | 3D AI companion (Windows app) | ok (unzip exit 1 = warning, files aaye) | 266 | All Analyse §6.7 | ✅ reviewed, not used (unrelated) |
| 5 | `Mpanel-main.zip` | PHP + JS VM panel (VNC, SFTP, backups, billing, 2FA) | ok | 326 | `docs/00`, All Analyse Part 4 | ✅ reviewed (reference for B/C/D groups) |
| 6 | `NKVM_Panel_v1.zip` | Node + Express + EJS panel, **GPL-3.0** | ok | 84 | All Analyse §6.4 | ✅ reviewed. ⚠️ GPL code copy nahi karenge (StarCloud MIT hai) |
| 7 | `Nobita-Cloud-main.zip` | Pterodactyl-style blueprints (86 blueprint files) + shell | ok | 148 | All Analyse Part 4 (B4, game ports) | ✅ reviewed (reference) |
| 8 | `SKVM-main.zip` | Python + HTML KVM panel (TOTP, billing, Docker) | ok | 119 | All Analyse Part 4 (E1) | ✅ reviewed (reference) |
| 9 | `Svm-v6.zip` | "Svm Panel" Flask (decompiled `.pyc`) | ok | 58 | All Analyse §6.3 | ✅ reviewed, decompiled code = reference only |
| 10 | `ZORIN-M4-source.zip` | Python voice companion (Windows) | ok | 117 | All Analyse §6.8 | ✅ reviewed, not used (unrelated) |
| 11 | `hkvm-2.zip` | **HKVM** (base project; StarCloud isi se bana). Installer, runtime, routes | ok | 2952 | All Analyse Part 2, `docs/HKVM_FEATURE_INVENTORY.md` | ✅ base; installer merge done |
| 12 | `lvm-panel-main.zip` | LXD/LXC panel (LXD container VPS) | ok | 53 | All Analyse Part 4 (A/B), LXD notes | ✅ reviewed (LXD ready badge reference) |
| 13 | `vpanel-pro-main.zip` | vPanel Pro v3.1.1 (Node + MongoDB, VNC, billing, UPI) | ok | 152 | All Analyse §6.5, Part 4 (D6) | ✅ reviewed (reference) |
| 14 | `StarCloud-Logo.png` | Aapka logo (1254px). `public/images/logo.png` (512px) mein use hua | — | 1 | Branding | ✅ used |
| 15 | `StarCloud-Banner.png` | Aapka banner | — | 1 | Branding | ✅ kept (login/banner use) |
| 16 | `All VM Maker PROMPT/All Analyse File Detail.txt` | Poora analysis (glossary, pack-wise, feature groups A1–H1, security, video script) | text | 1537 lines | Yahi file har feature ka source hai | ✅ read (sections 4, 7, 9 mapped below) |
| 17 | `All VM Maker PROMPT/StarCloud VM MAKER WEBSITE MASTER-PROMPT.txt` | Master build spec (theme, roles, owner tier, feature scope, rules) | text | 1181 lines | Scope for Batches 1–6 | ✅ read (scope mapped in §2) |
| 18 | `All VM Maker PROMPT/analyse VM Website detail.txt` | Large patch/diff dump (`--- /dev/null` = new files) | text | 37547 lines | Reference only; no separate feature list | ✅ scanned (new-file list only) |

Rule: koi bhi zip ko uske code ke liye copy nahi kiya gaya. Sirf ideas aur UI/route reference liye gaye. GPL (NKVM) aur vPanel jaise third-party code ka license check user ko CA/legal se karwana chahiye jab ye ship hoga.

---

## 2. Full feature list

### 2.1 Batch 1 — Host safety and security (A-group)

| ID | Feature | Status | Note / check |
|---|---|---|---|
| A1 | KVM capability detection | ✅ | System Info > Host virtualization. Sandbox mein KVM nahi, isliye "not available" dikhta hai (sahi behavior) |
| A2 | Bina KVM ke VPS create block | 🟡 | KVM lock hai; TCG (software) fallback par warning. Real KVM host par test pending |
| A3 | Nested KVM toggle | ✅ | Single "KVM On / Off" switch (aapka faisla) |
| A4 | Custom CPU model | ✅ | Intel Xeon + AMD EPYC 7003 list, search, custom option |
| A5 | Capacity guard | ✅ | Host RAM/disk hisaab; earlier tests PASS |
| A6 | VM password minimum 8 | 🚫 | Aapke kahne par 8-char minimum hataya |
| A7 | Maintenance mode | ✅ | Settings > General |
| A8 | Emergency Stop All / Reboot All | ✅ | Settings > General (System Info se duplicate "Stop All" hata diya) |
| A9 | Audit log | ✅ | Settings > General, latest 200 |
| A10 | Per-VM security scan (miner, failed logins, cron) | ⬜ | Pending |
| A11 | Discord webhook field (settings) | ⬜ | Pending (webhooks ka plan hai, bot nahi) |
| A12 | Installer ek command se | ✅ | `install.sh` menu 1 install / 2 uninstall / 3 upgrade. Real Debian/Ubuntu VPS par test pending |

### 2.2 Batch 2 — VM lifecycle, monitoring, promo

| ID | Feature | Status |
|---|---|---|
| B1 | Expiry, renew, suspend | ⬜ |
| B2 | Coupons (discount codes) | ⬜ |
| B3 | Giveaway codes | ⬜ |
| B4 | Shared public IPv4 + auto port block per VM | ⬜ |
| B5 | Bulk port forward | ⬜ |
| B6 | Boot log viewer | ⬜ |
| B7 | Web SSH terminal (priority 1) | ✅ | Real OpenSSH VM par PASS; wrong-password, stopped-VM messages |
| B8 | Live stats (CPU/RAM/network graphs) | 🟡 | Numbers hain (System Info, dashboard); graphs pending |
| B9 | Snapshots | ⬜ |
| B10 | File manager (priority 2) | 🟡 | Backend 16/16 (list, read, write, upload+SHA, download, rename, chmod, delete, root guard); UI jsdom 4/4. Pending: zip, editor, 200 MB chunked upload, Git |
| B11 | Status page (uptime history) | ⬜ |
| B12 | Referral + flash sale | ⬜ |

### 2.3 Batch 3 — Backup and automatic work (C-group)

| ID | Feature | Status |
|---|---|---|
| C1 | Scheduled power (start/stop/restart) | ⬜ |
| C2 | Scheduled backup | ⬜ |
| C3 | Scheduled snapshot | ⬜ |
| C4 | Backup and restore | ⬜ |

### 2.4 Discord, UPI, email, support (D-group)

| ID | Feature | Status | Note |
|---|---|---|---|
| D1 | Discord bot (tickets, UPI, credentials) | 🚫 | Aapke faisle se bot poori tarah hataya |
| D2 | Discord bot admin page | 🚫 | Same |
| D3 | Discord webhook alerts | ⬜ | Webhook URL field pending |
| D4 | sshx browser terminal share | ⬜ | Pending |
| D5 | Discord OAuth login + signup | ✅ | Login aur signup dono par button. Settings > Discord UI verify pending |
| D6 | UPI manual payment confirm | ⬜ | Batch 4 |
| D7 | Email verification | ⬜ | Batch 4 |

### 2.5 Security, branding, UX (E-group)

| ID | Feature | Status | Note |
|---|---|---|---|
| E1 | 2FA (TOTP + backup codes) | ⬜ | Batch 3 |
| E2 | Wallpaper, blur, transparency | ⬜ | Batch 6 |
| E3 | Hindi + English | ⬜ | Batch 6 |
| E4 | Custom branding (logo, name, banner) | 🟡 | Logo, name, Branding tab ✅; wallpaper/Hindi pending |
| E5 | Notification bell | 🚫 | Aapke kahne par top bar se hataya |
| E6 | Command palette (Ctrl+K) | ⬜ | Batch 6 |

### 2.6 AI assistant, later items, owner tier (F, G, H)

| ID | Feature | Status |
|---|---|---|
| F1–F10 | AI chat, provider failover, risk gate, log doctor, action audit, default OFF, owner/admin AI, customer AI (support-only), secrets rule, public-apis knowledge | ⬜ (Batch 6) |
| G | Later: multi-node cluster, storage VPS, managed DB, one-click apps, reseller, template store, plugins | ⬜ |
| H1 | Owner "Remote Support Mode" + telemetry | 🚫 | Out of scope (aapke faisle; `docs/02` D) |

### 2.7 Features added in this round (not in the A–H list)

| Feature | Status | Where |
|---|---|---|
| Admin lands on admin pages only; My Profile / My VMs removed for admin; `/dashboard`, `/vms`, `/vm/:id`, `/profile` admin ko redirect | ✅ | `app.js`, `login.ejs`, admin sidebar |
| Panel version V1.0, hidden everywhere; General tab toggle "Show panel version" (default OFF) | ✅ | Settings > General |
| About tab removed; System Info tab removed from Settings; System Info is its own page (`/admin/system-info`) | ✅ | Settings, sidebar |
| "Online" pill and bell removed from top bar; dark theme only | ✅ | admin header |
| Welcome banner on admin and user dashboards (two lines, same as login) | ✅ | `views/partials/welcome-banner.ejs` |
| OS template icons: official distro logos (Ubuntu, Debian, CentOS, AlmaLinux, Rocky, Fedora, openSUSE, Alpine, Arch) replace emoji | ✅ | `public/images/os/`, `services/os-templates.js`, `public/js/os-icons.js` |
| Built-in OS list: 17 templates | ✅ | `services/os-templates.js` |
| LXD ready badge + quickstart (no auto-install) | ✅ | VM detail |
| Public sign-up (username/password) with on/off in Settings > Security | ✅ | `/signup`, `/api/auth/signup` |

---

## 3. Totals (A–H list + 2.7 round items)

- ✅ Done: 19 (A1, A3, A4, A5, A7, A8, A9, A12, B7, D5, plus the 9 items in 2.7)
- 🟡 Partial: 4 (A2, B8, B10, E4)
- ⬜ Pending: 34 (A10, A11, B1–B6, B9, B11, B12, C1–C4, D3, D4, D6, D7, E1, E2, E3, E6, F1–F10, G)
- 🚫 Removed or out of scope: 5 (A6, D1, D2, E5, H1)

## 4. What you can run to check

Pehle panel start karein (`node app.js` ya installer ke baad apne aap chalta hai).

```bash
# Admin/user separation, version toggle, About/System removal, OS logos (34 checks)
bash scripts/check-admin-user-ui.sh          # uses http://localhost:8080 by default; B=http://host:port to change
```

Browser par check:
- `admin / admin` se login → admin dashboard khulna chahiye; sidebar mein My Profile / My VMs nahi.
- Settings > General → "Show panel version" OFF; ON karke save karein → sidebar aur dashboard par V1.0 dikhega.
- Settings tabs: General, Branding, Security, Discord (About aur System Info nahi).
- Sidebar bottom > System Info → `/admin/system-info` (host virtualization, panel info, live stats).
- Templates page: har OS ke saath uska official logo.

Sandbox limits (real host par verify karna baki): real KVM boot, cloud-image download, Debian installer, file manager real VM par.

---

## 5. Questions for you

1. **OS logos:** Abhi logos *Simple Icons* (CC0 license, official brand marks) se liye gaye hain. Agar aap apne original logo files dena chahte hain (kisi bhi size mein), to bataiye; wo `public/images/os/` mein replace ho jayenge.
2. **Version toggle:** default OFF hai. Kya aap chahte hain ki ye default ON ho?
