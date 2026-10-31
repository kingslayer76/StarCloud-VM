# StarCloud — Feature Status aur Batch Plan

> Tarikh: 29 October 2026 (Asia/Calcutta). Branch: `arena/1bed8e0c-starcloud-vm`.
> Latest pushed commit: `276759e` (KVM lock). Is doc ke saath `LICENSE` (MIT) add hua hai.
> Short forms ka poora matlab `docs/00_DEEP_ANALYSIS_SUMMARY.md` ke Section 0 (Shabdkosh) mein hai.
> Faisle (D-1 se D-26) `docs/00_DEEP_ANALYSIS_SUMMARY.md` Section 7 aur Section 17 mein hain. Yahan wahi faisle lagu hain.

## 0. Legend

| Chinh | Matlab |
|---|---|
| ✅ Done | Code hai aur test ho chuka hai (kaise test hua, wo column mein likha hai) |
| 🟡 Partial | Kuch hissa bana hai, baaki pending hai |
| ⬜ Pending | Abhi nahi bana |
| 🚫 Out of scope | User ke faisle se bahar. Build nahi hoga |

Test ka level:
- **Live** = running panel par `curl` ya browser se check kiya.
- **Syntax** = sirf `node --check` / EJS compile.
- **Sandbox-blocked** = is sandbox mein `/dev/kvm`, QEMU, `genisoimage` nahi hain, isliye real VM test nahi ho sakta. Ye user ke GitHub Codespaces / real server par hoga.

---

## 1. Ek nazar mein (batch-wise)

| Batch | Naam | Status | Kya hai |
|---|---|---|---|
| 0 | Base aur foundation | ✅ | Security fixes, branding, `.env.example`, Discord account pages |
| 1 | Host safety + security | 🟡 | KVM detect + lock, nested KVM, capacity guard, maintenance, emergency, audit log, installer, file manager, nested KVM toggle, CPU model (pehle 3 deep features: 1 poora, 2 partial). Neeche pending list dekho |
| 2 | VM lifecycle + monitoring + promo | ⬜ | Boot log, expiry/renew/suspend, coupons, giveaway, shared IPv4 + auto port block, snapshots, backup/restore, status page, referral, flash sale |
| 3 | Auth, accounts, guest agent | ⬜ | 2FA, lockout, password reset, sessions, owner tier, API keys, sub-users, impersonation, guest agent, sshx, noVNC |
| 4 | Commerce + support | ⬜ | Plans/add-ons, UPI manual confirm, email verify, invoices (pending) |
| 5 | Product lines + networking + API | ⬜ | VDS (CPU pinning, guaranteed RAM), LXD Bot Hosting (Linux only), port-forward manager, rDNS, firewall, bandwidth, public API + CLI |
| 6 | AI + site + UX + deploy | ⬜ | AI assistant (owner/admin poora, customer limited), marketing site, Hindi/English, dashboards, Fun Mode, Docker, auto-update |
| Later | Roadmap | ⬜ | Multi-node cluster, storage VPS, managed DB hosting, one-click apps, reseller |

---

## 2. Batch 0 — Base aur foundation (✅ done, commit `9aba67f`)

| Feature | Test |
|---|---|
| Session secret env se (`SESSION_SECRET`), warna random file mein store (0600) | Live: server log |
| Cookie `httpOnly`, `sameSite`, `secure` (production par) | Live: login 200 |
| Discord unverified email se account match nahi (takeover fix) | Syntax + code review |
| `/link-discord-account`, `/create-account-discord` GET routes + `views/discord-account.ejs` | Live: redirect `/login?error=` (404 nahi) |
| Shell injection fix (`execSync` string → `execFile` argv) | `grep` review |
| Public `/api/settings` se secret keys filter | Live: JSON mein secret nahi |
| VM password required, minimum 8 characters (form + server) (D-24, D-15) | Live: `400` short password par |
| `/favicon.ico` sahi path par | Live: 200 |
| StarCloud logo/banner (512×512, 1600×899, WebP bhi) | Live: images 200 |
| `.env.example`, `.gitignore` mein `.env` | Git status |
| `LICENSE` (MIT) — original HKVM copyright notice + KingSlayer line | File mein; commit pending |

---

## 3. Batch 1 — Host safety + security (🟡)

### 3.1 Ho chuka hai

| Feature | Status | Test |
|---|---|---|
| Host KVM detect (`/dev/kvm`, vmx/svm flag, nested) | ✅ | Live: `/api/admin/operations` → `capabilities.kvmAvailable=false` + reasons |
| Installer KVM report → `data/install-kvm-report.json` | ✅ | `bash install.sh --skip-system` dry run; JSON valid |
| KVM lock UI (locked option par har click warning; 3rd click permanent-block notice) | 🟡 | JS syntax ✅. **Browser click test pending** (Codespaces par) |
| Create 409 `KVM_BLOCKED` (KVM ya nested ON maangne par, no-KVM host) | ✅ | Live curl: `enable_kvm=1` → 409; `nested_kvm=1` → 409; field na dene par KVM check pass |
| Edit 409 `KVM_BLOCKED` | ✅ | Live curl: `PUT /api/vms/:id/edit` `enable_kvm=1` / `nested_kvm=1` → 409; `0` → 200 |
| Nested KVM DB default `0` (purani VMs safe) + form se explicit | ✅ | DB check: `enable_kvm=0, nested_kvm=0` |
| Nested 400 `NESTED_NEEDS_KVM` (KVM OFF par nested ON) | ✅ | Code review (KVM host par test pending) |
| Capacity guard (RAM sab VMs + 1024 MB host; vCPU ≤ logical CPU × 4) | ✅ | Live: 999999 MB → 409 `CAPACITY` |
| Maintenance mode (503 page, admin bypass, JSON 503 for anon API) | ✅ | Live: on → /dashboard 503, /login 200; off → 302 |
| Emergency stop-all / reboot-all (typed confirm "STOP ALL") | ✅ | Live: wrong confirm 400; "STOP ALL" → count=1, audited |
| Audit log (table + page + CSV export) | ✅ | Live: JSON + CSV OK; anon 401 |
| File manager — admin aur customer (sabhi users, D-17) | 🟡 | Live vs test SSH server (chroot): list/read/write/mkdir/rename/chmod/upload/download/delete; permission (customer sirf apna VM) ✅. **Real VM par test pending** |
| Installer admin account setup (Enter = `admin`/`admin`, D-14 — security note) | ✅ | `install.sh` test: exit 0, `.env` mode 600 |
| Installer terminal: sirf StarCloud logo + step status (spinner, ✔/✖); raw output `logs/install.log` mein; `--verbose` se screen par | ✅ | Local test: `script` (TTY) + fake apt-get, `--skip-system` aur full run; failure path: ✖ + log tail + exit code |
| Installer preflight (root, OS, RAM/disk/CPU, KVM, systemd, internet, port 8080 check) + final summary box | ✅ | Sandbox run; real Codespaces/Debian run pending |
| Installer OS images: default `all` (sare 12 OS download); `--os-images none` se skip, `ask` se poochhega; `--all-os` alias; `services/os-templates.js` single source; cache `~/vms/templates/<key>-template.qcow2`; existing files kept, one failure does not stop the rest | 🟡 | Pty run with fake curl: 11 ✔, 1 forced failure reported, summary correct; 'n' path skips. Sandbox ka network cloud hosts tak nahi jaata (real download VPS par verify karna hai) |
| Installer animated StarCloud logo (rainbow repaint every 120 ms in a scroll region; paused during prompts; final colours kept) | ✅ | pyte terminal emulation: banner stays on top, cursor not moved by repaints (0 mismatches), region reset on exit |
| Installer ka panel background service (`install.sh --start/--stop/--status`, `setsid` + PID file) | 🟡 | Sandbox: install ke baad panel pty band hone par bhi chalta hai (pid check + login 200), `--stop`/`--start` cycle ✅. systemd unit file `systemd-analyze` ✅; real `systemctl` start real server par pending |
| `STARCLOUD_DATA_DIR` installer `.env` mein (DB project ke andar) | ✅ | Code + dry run |
| Live: `/api/admin/operations` JSON shape | ✅ | `capabilities`, `maintenance`, `vms` keys |

#### 3.1a Fix round (user screenshots, 2026-10-30)

| Item | Status | Kya badla / test |
|---|---|---|
| **KVM ek hi switch** (user ka decision): "KVM On / Off" ke saath state text On/Off; "Nested KVM" toggle hata diya (create + edit). Nested ab KVM ke saath chalta hai (ON = VM ke andar VM). DB `nested_kvm` = `enable_kvm` (same value). | ✅ | Create/edit pages 200, nested toggle HTML mein nahi; inline JS `node --check` OK; API: no-KVM host par `enable_kvm=1` → 409 `KVM_BLOCKED`, `0` → 200. Browser click test pending |
| Duplicate VM name → raw SQLite error hata kar saaf message (409 `NAME_TAKEN`), create + rename dono | ✅ | Live: `taken` naam par create 409; rename `other`→`taken` 409 |
| Failed create ka row rollback (template download fail → row delete, naam free) | ✅ | Live: download fail (sandbox network) → 500, `newvm` list mein nahi, dubara same naam pe bhi naam ka error nahi |
| SSH port validation: 1024–65535 aur kisi aur VM ka port nahi (400 `SSH_PORT_RANGE` / 409 `SSH_PORT_TAKEN`) | ✅ | Live: port 77 → 400; port 2222 (dusri VM par) → 409 |
| Installer: user ke `hkvm-master-fix.sh` ke steps (libvirt + helper services, swap 4 GB sirf jab koi swap na ho, swappiness 10, `genisoimage` / `cloud-localds` / `qemu-img` check) | ✅ | Fake apt + fake tools run: 12/12 ✔; apt-fail path: ✖ + log tail; sandbox mein `mkswap` nahi → warning, swap skip (installer nahi ruka) |

| **Installer ek hi file:** `start-panel.sh` hata kar `install.sh` mein merge. Modes: `install` (default), `--start`, `--stop`, `--status`. Install ke baad panel turant chalta hai | ✅ | Full install under pty: 12/12 ✔, panel ONLINE; terminal band hone ke baad bhi RUNNING; `--stop` → `--start` → `--status` RUNNING, login 200 |
| **Panel install ke baad band ho jata tha** (root cause: `nohup` bina `setsid` ke terminal band hone par process mar jata) | ✅ | `setsid nohup node app.js` ke saath survive karta hai (ppid 1); test: pty close ke baad login 200 |
| **VM ownership (security):** customer doosre user ke VM ke `/api/vms/:id/*` aur `/vm/:id/*` (stats, logs, console, ssh, snapshots, ISO, command POST) dekh/chala sakta tha | ✅ | Global guard `app.js` (`VM ownership guard`): admin sab, customer sirf apna VM; non-owner → 404. Test: cust1 → admin VM 404 (11 routes + POST), own VM 200, admin 200, anon login redirect |
| Admin + customer GET routes smoke test (sab pages/API) | ✅ | 34 admin pages 200; VM detail/edit/console/files/ssh 200; customer dashboard/vms/profile 200; `/api/discord-auth-url` 400 `Discord auth not configured` (Discord setup nahi hai, expected) |

**User ko Codespaces/VPS par:** jo purana VM `test` (4096 MB) dikh raha tha, usko **All VMs** se delete karein, phir naya VM banayein. Guest RAM host RAM ka aadha rakhein (4 GB VPS par ~2048 MB guest).

### 3.2 Pending (Batch 1 ke andar hi baaki)

| # | Feature | Kaam | Faisla / reference |
|---|---|---|---|
| 1 | **Per-VM security scan** | Miner process, failed login count, suspicious cron check; admin VM detail page par | Master spec §12, SKVM alerts |
| 2 | **Discord webhook field** | Settings mein ek field, default khali; khali ho to kuch nahi bheja jayega | D-16 |
| 3 | **CPU model select — HKVM style animation** | Preset dropdown + custom CPU name base mein hai. Animation/tilt style aur custom name ka live check pending | D-11 |
| 4 | **Installer real test** | Debian + root + systemd + apt. Sandbox mein `/dev/kvm` nahi, isliye Codespaces par test | Pterodactyl-style installer (user ka faisla) |
| 5 | **Real QEMU boot test** | VM create → boot → SSH. Nested guest test bhi | Sandbox-blocked |
| 6 | **Cloud-init ISO tool** | Installer mein `genisoimage` ensure karna (sandbox mein missing) | Live log se pata chala |
| 7 | **Known bug: edit 200 par seed fail** | Edit ne `200 success` diya, lekin cloud-init seed ISO nahi bana (tool missing). Edit ko warning dena chahiye | Batch 2 mein fix |

Pehle 3 deep features ka status:
1. **File manager** — ✅ backend + pages; 🟡 real VM test pending.
2. **Nested KVM toggle** — ✅ (create/edit, DB, 409 lock). Host par KVM ho to ON test pending.
3. **CPU model select (VPS + VDS, same create form)** — 🟡 preset + custom name base mein hai; HKVM animation pending.

---

## 4. Batch 2 — VM lifecycle + monitoring + promo (⬜)

| # | Feature | Source / faisla |
|---|---|---|
| 2.1 | Boot log viewer (serial + cloud-init, live) | Master §3 |
| 2.2 | VM expiry, renew, expiring list | Master §9 |
| 2.3 | Suspend / unsuspend with reason | Master §3 |
| 2.4 | Bulk power ops UI (server endpoint, Batch 1 ke emergency ke saath) | Master §3 |
| 2.5 | Coupons (percent / fixed / 100% free, expiry, usage count; **order table nahi**) | D-7, D-6 |
| 2.6 | Giveaway codes (N codes, one-time claim) | D-7 |
| 2.7 | Single public IPv4 + har VM ko automatic alag port block | D-9, D-18 |
| 2.8 | IP pool page (basic: add IP/CIDR, free/assigned/reserved) | Master §6.1 |
| 2.9 | Snapshots: restore, delete, schedule; safety snapshot before risky op | Master §3, §13 |
| 2.10 | Backup (local) + restore + download | Master §4 |
| 2.11 | Public status page + uptime history | Master §11, SKVM `status.html` |
| 2.12 | Referral program | Master §9 |
| 2.13 | Flash-sale / event banner + countdown | Master §9 |
| 2.14 | VM watchdog, crash-loop detect, boot order after host reboot | Master §13 |
| 2.15 | Host protection alerts (RAM < 10%, disk < 5%) | Master §0 |
| 2.16 | `/health` + Prometheus `/metrics` | Master §12 |

Note: Batch 1 pending #7 (edit 200 par seed fail) bhi yahin fix hoga.

---

## 5. Batch 3 — Auth, accounts, guest agent (⬜)

| # | Feature | Source |
|---|---|---|
| 3.1 | 2FA TOTP + QR + backup codes | Master §2 |
| 3.2 | Login lockout, rate limit, optional IP ban | Master §2 |
| 3.3 | Password reset (expiring token) + email verify (toggle, Brevo SMTP) | Master §2 |
| 3.4 | Session list (device info) + remote revoke | Master §2 |
| 3.5 | Owner tier (owner > admin > user) + owner console | Master §2, Phase 2 |
| 3.6 | API keys with scopes + last-used | Master §2 |
| 3.7 | CSRF, input validation (zod), Helmet | Master §16 |
| 3.8 | Captcha (Turnstile) + disposable-email block | Master §2 |
| 3.9 | Sub-users / per-VM permissions | Analysis (Mpanel, NKVM) |
| 3.10 | Admin impersonation (customer consent + audit) | Master §12 |
| 3.11 | Guest agent (Python, cloud-init se install) + SSH fallback | Master §4, NKVM |
| 3.12 | File manager advanced: zip/unzip, search, code editor, chunked 200 MB upload, pull-from-URL, trash, Git clone | D-17, Mpanel, HVM-8 |
| 3.13 | SFTP access to guest | Mpanel, Nobita |
| 3.14 | sshx shareable terminal link (tmate nahi) | D-4, master §3 |
| 3.15 | noVNC graphical console, xterm multi-tab, session recording | Master §3 |

**Owner remote support aur telemetry: 🚫 (D-23).** Owner tier mein ye feature nahi hoga.

---

## 6. Batch 4 — Commerce + support (⬜)

| # | Feature | Faisla |
|---|---|---|
| 4.1 | Plans (VPS / VDS), billing cycles, add-ons (dedicated IPv4, extra RAM/CPU/disk, ports) | Master §9 |
| 4.2 | UPI manual confirmation (admin confirm karega; website par payment gateway nahi) | User ka faisla: manual UPI |
| 4.3 | Support: Discord par manual (website par ticket system nahi) | User ka faisla (29 Oct) |
| 4.4 | Email verification (Brevo SMTP, toggle) | Master §2 |
| 4.5 | Invoices / GST | Master §9 — user se poochhna hai (Q1) |

Hata diya gaya: custom price per order (D-5), order record table (D-6), Razorpay / website payment gateway.

## 7. Batch 5 — Product lines, networking, API (⬜)

| # | Feature | Note |
|---|---|---|
| 5.1 | VDS: CPU pinning (vcpupin), guaranteed RAM, hugepages optional, host-passthrough, CPU overallocation nahi | Master §1, §9.1 |
| 5.2 | LXD Bot Hosting (Linux LXC containers, sirf Bot Hosting product mein) | Master §1.1B; **HARD RULE: sold VPS/VDS hamesha KVM VM, kabhi LXC nahi** |
| 5.3 | Bot templates (eggs): Discord.js, Discord.py, Node, Python, n8n; auto-restart, GitHub deploy | Master §1.1B |
| 5.4 | LXD-ready badge + quickstart box (VPS/VDS ke andar LXD, optional) | Master §1.1A |
| 5.5 | Port-forward manager (visual, bulk ranges) | Master §6 |
| 5.6 | rDNS / PTR editor | Master §6 |
| 5.7 | Per-VM firewall UI (nftables) | Master §6 |
| 5.8 | Bandwidth metering + quota + throttle | Master §6 |
| 5.9 | Public API `/api/client` + `/api/application`, CLI, OpenAPI doc | Master §7 |
| 5.10 | Webhooks with HMAC signing + retries (events) | Master §7 |
| 5.11 | Cloudflare Tunnel / Tailscale / Playit (optional) | Master §6 |
| 5.12 | Cron schedules (power / backup / snapshot / command) | Master §7 |

**RDP / Windows / XRDP: 🚫 (D-3, D-26).** Master spec ke product list mein ye hai, par user ne bahar kiya hai.

---

## 8. Batch 6 — AI, marketing site, UX, deploy (⬜)

| # | Feature | Faisla |
|---|---|---|
| 6.1 | AI assistant built-in (website ke andar), default OFF | D-10 |
| 6.2 | Do tier: owner/admin poora; customer sirf support + apna VM start/stop (confirm ke saath) | D-19 |
| 6.3 | Provider: Google AI Studio ka free Gemini key, sirf `.env` mein | D-20 |
| 6.4 | Customer passwords/secrets AI ko kabhi nahi | D-21 |
| 6.5 | `public-apis/public-apis` catalog as knowledge | D-22 |
| 6.6 | AI Log Doctor, risk gate + 60-second confirmation, immutable AI action audit | Master §8 |
| 6.7 | Marketing site: landing, pricing, blog, ToS, status, SEO | Master §14 |
| 6.8 | Hindi / Hinglish / English (i18n) + dark/light switch | Master §15 |
| 6.9 | Wallpaper browser + blur/transparency | HKVM base feature, Analysis |
| 6.10 | Fun Mode (confetti, 3D tilt, sounds) + reduced-motion | Master §15 |
| 6.11 | Command palette (Ctrl+K), onboarding, skeleton loaders | Master §15 |
| 6.12 | PWA + push | Master §15 |
| 6.13 | Revenue dashboard (MRR, ARR, churn), capacity vs revenue | Master §12 |
| 6.14 | Docker + compose, CI, tests, auto-update + rollback | Master §16, Phase 10 |
| 6.15 | Font upload, OS icons | Analysis (SKVM, lvm-panel) |

---

## 9. Later / roadmap (⬜)

Multi-node cluster + node agent + circuit breaker + live migration + auto-placement (Master Phase 11) · storage VPS (HDD pool) · managed MongoDB / MySQL hosting · one-click apps · reseller / white-label · template store (Proxmox `.vma.zst` → qcow2) · plugin system.

---

## 10. Out of scope (🚫) — user ke faisle

| Cheez | Faisla |
|---|---|
| Windows RDP (Create RDP option) | 🚫 Cancel (user ka faisla, 29 Oct) — D-3 |
| Linux XRDP / Cloud PC (desktop in browser) | 🚫 D-26 |
| tmate | D-4 (sshx rakha hai) |
| Custom price per order | D-5 |
| Order record table | D-6 (Discord ticket hi record) |
| Owner remote support + telemetry | D-23 |
| "Pi S" product | D-23 |
| Minecraft / game-server hosting | Master spec out-of-scope |
| LXC container ko "VPS" bana kar bechna | Master spec HARD RULE |
| Hidden backdoor, magic password, license bypass | Standing rule |

---

## 11. Known issues / limits (abhi)

1. Edit route 200 deta hai, bhale cloud-init seed na bane (Batch 1 pending #7).
2. Sandbox mein: `/dev/kvm` nahi, QEMU nahi, `genisoimage` nahi, template download network par depend karta hai. Ye sab user ke Codespaces / real server par test hoga.
3. Server restart par session memory store reset ho jata hai (login dobara karna padega). Batch 3 mein persistent session store.
4. Default admin `admin/admin` (installer Enter par) — security risk hai (D-14). User ne ye rakhne ko kaha hai; baad mein badal sakte hain.
5. `HVM-1.rar` ka extension galat hai (asli ZIP hai). Archive ko chheda nahi gaya (Analyse-File read-only hai).

---

## 12. User ke liye Codespaces test guide

```bash
git clone -b arena/1bed8e0c-starcloud-vm https://github.com/kingslayer76/StarCloud-VM.git
cd StarCloud-VM
sudo bash install.sh
```

Panel control (install ke baad): `sudo bash install.sh --status` (chal raha hai ya nahi), `sudo bash install.sh --start`, `sudo bash install.sh --stop`. Server restart ke baad panel phir se chalane ke liye `sudo bash install.sh --start`. Panel log: `logs/panel.log`.

Installer terminal par sirf StarCloud logo aur step ka status dikhayega (raw output `logs/install.log` mein jayega; `--verbose` se sab screen par). Last mein summary box mein Panel URL aayega (Codespaces mein `https://<codespace>-8080.app.github.dev/login`). Ports tab mein port 8080 ko Public karein agar browser se khulna band ho.

Installer admin username/password puchega. Enter dabane par `admin` / `admin` rahega (test ke liye). Phir:

1. Browser mein panel kholen, login karein.
2. **Admin → Operations** page: KVM status dikhna chahiye (Codespaces par aksar KVM nahi hota).
3. **Create VM**: ek hi switch **KVM On / Off** dikhna chahiye (state text On/Off). Host par KVM na ho to switch locked OFF: ek click par warning, teesri click par permanent-block notice.
4. **Maintenance mode**, **Audit log** (CSV download), **File manager** (koi VM ho to) check karein.
5. Feedback mein batayein: kaun sa step fail hua, screenshot ke saath.

---

## 13. Questions jo user se pending hain

| # | Sawaal | Kyon | Jawab (user, 2026-10-29) |
|---|---|---|---|
| Q1 | Invoices / GST chahiye? | Master spec §9 | **Abhi nahi.** Invoice page skip. Baad mein (Phase 7 ke saath) decide. Note: GST invoice ke liye sale record chahiye, jo "order record table NAHI" rule se takrata hai. Woh tab decide hoga. |
| Q2 | Bot Hosting product mein ready templates (Discord.py, Discord.js, Node.js, Python)? | Ye panel ka Discord bot nahi. Customer ke apne bot ka environment hai. | **Koi template nahi.** Customer khud setup karega. |
| Q3 | Bot Hosting (LXD containers) ka poora product build karna hai? | Master spec §1.1B, scope confirm nahi tha | **Baad mein.** Pehle VPS/VDS poora karein. Bot Hosting scope abhi pending list mein rahega. |