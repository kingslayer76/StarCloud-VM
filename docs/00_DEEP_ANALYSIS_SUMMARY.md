# StarCloud — Deep Analysis + Full Feature Summary (26 October 2026)

> **Ye file sabse upar maani jayegi.** Isme `Analyse-File/` aur `All VM Maker PROMPT/` ke **saare** files ka deep analysis, saari features ki ek hi list, pichhle docs ki galtiyon ka sudhaar, aur aaj kiye gaye bug fixes ka record hai.
> **Aaj ka kaam:** analysis + puraane adhoore kaam ki jaanch + bug fix. **Naya feature build abhi start nahi hua** — aapke sawaalon ke jawaab ke baad start hoga.
> Branch: `arena/1bed8e0c-starcloud-vm`. Base: **HKVM (hkvm-2)**, jise StarCloud naam diya gaya hai.

---

## 0. Shabdkosh (har chhota shabd ka full form)

| Chhota shabd | Full form | Simple matlab |
|---|---|---|
| VM | Virtual Machine | Computer ke andar bana doosra computer. |
| VPS | Virtual Private Server | Ek server ka private hissa jo customer ko milta hai. |
| VDS | Virtual Dedicated Server | VPS jisme CPU cores pakke (dedicated) hote hain. |
| KVM | Kernel-based Virtual Machine | Linux ka hardware virtualization (tez VM). |
| Nested KVM | Nested Kernel-based Virtual Machine | VM ke andar doosra VM chalana. |
| TCG | Tiny Code Generator | QEMU ka software mode (KVM na ho to, 3–10 guna dheema). |
| QEMU | Quick Emulator | VM chalane wala program. |
| qcow2 | QEMU Copy-On-Write version 2 | VM disk ka file format (snapshot support). |
| cloud-init | Cloud Initialization | Pehli boot par VM ka user, password, network set karna. |
| CPU | Central Processing Unit | Processor. |
| vCPU | Virtual Central Processing Unit | VM ko diya gaya CPU core. |
| RAM | Random Access Memory | Fast memory. |
| SMBIOS | System Management BIOS | VM ko dikhne wala hardware naam/manufacturer. |
| NAT | Network Address Translation | Ek public IP ke peeche kai private VM. |
| SSH | Secure Shell | Remote terminal. |
| SFTP | SSH File Transfer Protocol | SSH ke upar file transfer. |
| VNC / noVNC | Virtual Network Computing / browser VNC | Screen ko browser me dekhna. |
| RDP | Remote Desktop Protocol | Windows ka remote screen (**scope se bahar**). |
| 2FA / TOTP | Two-Factor Authentication / Time-based One-Time Password | Login ke baad 6-digit code. |
| API | Application Programming Interface | Do programs ke beech baat. |
| DB | Database | Data rakhne ki jagah (yahan SQLite). |
| EJS | Embedded JavaScript templates | HTML template system. |
| CSS | Cascading Style Sheets | Website ka rang/layout. |
| CI | Continuous Integration | Push par automatic test. |
| UI / UX | User Interface / User Experience | Screen aur use karne ka feel. |
| i18n | internationalization | Multi-language (English + Hindi). |
| MIT | Massachusetts Institute of Technology License | Permissive open-source license. |
| GPL-3.0 | GNU General Public License version 3 | Copyleft license (code copy karoge to product bhi GPL). |
| CC0 | Creative Commons Zero | Public-domain dedication. |
| P0 / P1 / P2 | Priority 0 / 1 / 2 | Kaam ki tarteeb (ab user ne kaha: sab ek saath). |
| MVP | Minimum Viable Product | Sabse chhota chalne wala version. |

---

## 1. Maine aaj kya-kya check kiya (method)

1. `Analyse-File/` ke **13 archives + 2 images** — sab ko `/tmp/analysis/` me extract karke code padha. Kisi bhi archive ko badla nahi.
2. `All VM Maker PROMPT/` ke **3 text files** — poori padhi (master spec 1,181 lines; detail report 1,537 lines; bada report 37,547 lines).
3. Repo ke **5 puraane docs** — padhe aur unki galtiyan cross-check ki.
4. Base code: `node --check app.js`, 28 EJS templates compile, `npm ci` (254 packages), server start, aur **20+ HTTP endpoints** live test.
5. `git diff` aur `git status` se changes verify.

**Ek important khoj:** `Analyse-File/HVM-1.rar` **RAR nahi, ZIP hai** (galat extension). Isliye wo bhi seedha khul gaya.

---

## 2. Repository ka asli structure

```
StarCloud-VM/
├── Analyse-File/                 # 13 archives + 2 brand images (sirf reference, kabhi edit nahi)
├── All VM Maker PROMPT/          # 3 text files: master spec + 2 analysis reports
├── docs/                         # puraane 5 docs + ye naya master summary
├── app.js                        # poora backend (4,968 lines, 90 routes)
├── licenses.js                   # license no-op stub (free edition)
├── package.json / package-lock.json
├── .env / .env.example           # config (ab secret ka option bhi hai)
├── data/                         # runtime SQLite (Git me nahi)
├── public/
│   ├── css/admin.css             # HKVM pure-black glass theme
│   └── images/                   # logo.png, banner.png, logo.webp, banner.webp  (aaj replace/add kiye)
└── views/
    ├── admin/ (13)  users/ (8)  partials/ (4)  + discord-account.ejs (naya)
```

---

## 3. `Analyse-File/` — verified inventory (13 archives + 2 images)

| # | File | Asli format | Tech | Files | License (verified) | Kya hai / kya lena hai | Risk |
|---|---|---|---|---|---|---|---|
| 1 | `hkvm-2.zip` | ZIP | Node.js + Express + EJS + sqlite3 + ssh2 + ws | 2,952 (node_modules sahit) | `package.json` me **MIT**, LICENSE file nahi | **HAMARA BASE.** 4,912-line `app.js`, 87 routes, 8 tables, 10 CPU models, custom CPU name, SMBIOS, KVM Acceleration checkbox, 5-step wizard | Purana `.env` + `data/hkvm.db` zip me the — copy nahi kiya |
| 2 | `HVM.zip` | ZIP | Python Flask + SQLite + LXC + Socket.IO | 83 | LICENSE nahi (`license_client.py` hai) | **HVM-8**: 165+94 routes, 17 tables, file manager (13 routes), maintenance, emergency, expiry/renew, backup, webhooks, 2FA, port pool, nodes/circuit breaker, **Proxmox-like CPU pinning + swap disable**, nested KVM (`/dev/kvm` passthrough) | LXC container panel hai — StarCloud ka VPS/VDS **KVM VM** hoga, isliye sirf ideas lenge. `hvm.db`, `hvm.log`, `.pyc` files hain |
| 3 | `HVM-1.rar` | **ZIP (galat .rar)** | Python Flask | 69 | LICENSE nahi (`license_manager.py` + `license_server.txt`) | **HVM-V8** (HVM-8 ka purana version): 147 routes, systemd installer guide, maintenance/emergency/backup | Hard-coded license server address — kabhi copy nahi karna |
| 4 | `Svm-v6.zip` | ZIP | Python Flask (decompiled) | 58 | LICENSE nahi | Purana SVM panel, `X-API-Key` REST API pattern, port logic | **Decompyle++** se banaya gaya source — sirf reference |
| 5 | `NKVM_Panel_v1.zip` | ZIP | Node.js + Express + EJS + Socket.IO + better-sqlite3 | 84 | **GPL-3.0** (LICENSE file verified) | 12 services, 2FA TOTP, boot logs, file manager (agent + SSH fallback, 200 MB upload, code editor), wallpaper + blur/transparency sliders, cron schedules, subusers, port ranges 25501–25600 | Code copy nahi karna (copyleft). Sirf ideas |
| 6 | `vpanel-pro-main.zip` | ZIP | Node.js + Express + MongoDB + EJS | 152 | README me MIT **badge**, LICENSE file **nahi** | 23 services (audit, billing, backup, schedule, bootLog, aiLog, plugin, mongoManager…), command palette (Ctrl+K), i18n me **Hindi**, noVNC, impersonation, `NO_KVM` mode | License clear nahi — sirf architecture ideas |
| 7 | `Mpanel-main.zip` | ZIP | Node.js + Express + MariaDB + Docker | 326 | README me **MIT**, LICENSE file nahi | **Minecraft/game + app server panel.** Sabse rich **file manager**: `serverFilesRoutes.js` me 26 routes (browse, content editor, upload, download, compress, extract, copy, permissions, search, pull-from-URL, beautify, trash/restore, Git clone/pull). Aur: marketplace, server splitter, auto suspension, playit tunnel, subusers, schedules, auto backup, social login, worlds/players/properties | Game-server oriented hai; **file manager ka design** lena hai, game code nahi |
| 8 | `Nobita-Cloud-main.zip` | ZIP | Shell installers + Pterodactyl/Blueprint | 148 | **CC0 1.0** (LICENSE verified) | Auto-installers: Pterodactyl, Wings, Convoy, Paymenter, WHMCS, Jexactyl, Reviactyl, Mythical, Pteroca. `Extras/` me 60+ Blueprint extensions: monaco editor, auto backups, admin audit logs, announcements, auto suspension, resource alerts, translations, subdomain manager | Sirf installer/extension ideas; `curl | sh` pattern blindly copy nahi karna |
| 9 | `SKVM-main.zip` | ZIP | Python 3.11 + Flask + SQLAlchemy + Docker/KVM node agent | 119 | LICENSE file nahi, README me license ka zikr nahi | **Naya aur bahut kaam ka architecture donor:** driver interface (`backends/base.py`), file manager, metrics, alerting, quotas, audit trail, scoped REST API, 2FA, CSRF, login lockout, maintenance page, status page, docs page, landing page, node agent, demo mode, autosetup, CI (43 route smoke tests), encrypted secrets (Fernet), owner first-run | License clear nahi — sirf architecture ideas |
| 10 | `lvm-panel-main.zip` | ZIP | Python Flask + LXD | 53 | LICENSE nahi | LXD container panel + interactive menu installer (`systemd`, `/etc/lvm-panel.env`, generated admin credentials) | LXD hai, KVM nahi. Bot Hosting / installer idea ke liye |
| 11 | `ZORIN-M4-source.zip` | ZIP | Python (voice assistant) | 113 `.py` | LICENSE nahi | `risk.py` (sensitive words → confirm/deny), `confirmation.py` (60-second nonce gate), `planner.py`, 4 AI providers, Hindi/Hinglish | Voice/desktop control nahi lena. README me "no wake-word gate" — StarCloud me confirm zaroori |
| 12 | `MYRAA-Source-Code-1.5.2.zip` | ZIP | TypeScript + Electron + Python | 266 | LICENSE nahi | `agent/actions/risk.ts` (risk action se decide hota hai, planner se nahi), `audit.ts`, `cancellation.ts`, `api_hub/` adapter registry, prompt-injection defence | Personal memory JSON files hain — copy nahi karna |
| 13 | `ALTEX-CODE-main.zip` | ZIP (andar ek aur ZIP) | Electron + React + TypeScript | 3 (+ nested 286) | LICENSE nahi | AI provider failover, "Verified" truthfulness rule, checkpoint/undo, forbidden-commands list, cloud consent, GitHub Actions CI example | Windows desktop app — sirf AI safety/CI ideas |
| — | `StarCloud-Logo.png` | PNG 1254×1254 | Brand asset | — | — | Asli StarCloud logo (aaj 512×512 optimize karke `public/images/logo.png` me lagaya) | 2.7 MB tha, ab 611 KB (+ WebP 114 KB) |
| — | `StarCloud-Banner.png` | PNG 1673×940 | Brand asset | — | — | Login/pricing hero (aaj `public/images/banner.png` + `banner.webp` banaya) | 2.9 MB tha, WebP 380 KB |

### 3.1 Puraane docs jin packs ka zikr karte hain, wo **is folder me nahi** hain

`apanel-main` (AKVM), `Hex-Mc`, `Template-main`, `XRDP-main`, `NR-PROTECTION`, `free-claude-code`, `hosting-website-main`, `nobitahost-wab-main`, `Thame-main`, `HVM-V8` (alag naam se), `HVM-8` (alag naam se) — inka zikr sirf `analyse VM Website detail.txt` aur `docs/` me hai. **Inka code yahan verify nahi ho sakta.** Isliye in features ko "report me likha hai" maanenge, "zip me dekha" nahi.

**Do packs pichhle docs me "drop" kahe gaye the, lekin ab folder me maujood hain:** `Mpanel-main.zip` aur `Nobita-Cloud-main.zip`. Aaj maine dono khol kar padhe — isliye unki features is summary me shamil hain.

---

## 4. `All VM Maker PROMPT/` — teen files ka kya hai

| File | Lines | Kya hai |
|---|---|---|
| `StarCloud VM MAKER WEBSITE MASTER-PROMPT.txt` | 1,181 | **Asli build spec.** Part 1 = 16 feature areas (0–16) + rules/theme/motion/owner tier; Part 2 = Hinglish explainer; Part 3 = P0/P1/P2 list (A–N); Part 4 = 20 packs ka verified donor mapping. Isme placeholders `{{DOMAIN}}` aur `{{OWNER_EMAIL}}` hain. |
| `All Analyse File Detail.txt` | 1,537 | Pichhle session ka **Hinglish detail report** (25 Oct 2026). Part 1 glossary + decisions D-1…D-26; Part 2 HKVM; Part 3 packs; Part 4 features Group A–H (har feature ka kya/kyun/kaise/source/risk); Part 5 security + licenses + branch state + video script; Part 6 deep verification; Part 7/8 upload guides. |
| `analyse VM Website detail.txt` | 37,547 | Ek **git diff** jisme 5 files hain: `FINAL_KHOKHLA_A_TO_Z_ALL_DETAILS.md` (21,376 lines), `FULL_A_TO_Z_FEATURES_REPORT.md` (569), `TOP5_ULTRA_DEEP.md` (4,765), `ULTRA_DETAILED_KHOKHLA_REPORT.md` (10,810), aur `google_drive/Mpanel-main.zip` (binary marker). Isme 25 common features, 21 pack sections, HKVM ke 87 routes/8 tables, **"File Manager Deep"**, **"Nested KVM / CPU"**, aur HVM-8 ka **Proxmox-like CPU pinning** chhupa hua hai. |

> **Dhyan:** badi file ka bada hissa **duplicate** hai (pehla aur chautha diff same report ke alag versions). Isliye 37,547 lines ka matlab 37,547 alag features nahi — unique content ~21,376 + 569 + 4,765 lines hai.

---

## 5. Aapke bataaye "deep features" — code se verify kiya sach

### 5.1 File manager (Minecraft server jaisa)

| Pack | Evidence (verified) |
|---|---|
| **HKVM (base)** | ❌ **Bilkul nahi hai.** `app.js` me koi `/files` route nahi, `views/` me koi file manager nahi. Customer sirf web SSH use kar sakta hai. |
| **Mpanel** | ✅ Sabse advanced. `src/routes/serverFilesRoutes.js` me **26 routes**: list, content (read/write editor), download, mkdir, rename, delete, upload, compress, extract, copy, properties, permissions (chmod), search, pull-from-URL (query + fetch), beautify, trash list, move-to-trash, restore-from-trash, empty-trash, Git status/clone/pull. Har route `requireServerAccess('files.read' / 'files.write' / 'files.delete')` se protected. Service: `fileManagerService.js`. |
| **HVM-8** | ✅ `templates/vps_files.html` + 13 routes: browse, upload, download, delete, rename, mkdir, read, write, move, chmod, compress, extract, search. Engine: paramiko SFTP. |
| **NKVM** | ✅ Guest agent + SSH fallback, 200 MB+ upload, monospace code editor modal, boot logs. |
| **vPanel Pro** | ✅ `agentService` + `sshService` se SSH-fallback file manager (200 MB upload). |
| **SKVM** | ✅ `routes/files.py` + `templates/files.html` + `static/js/pages/files.js`; backend driver interface me `files` capability flag. |
| **Nobita-Cloud** | ✅ Extension idea: `monacoeditor.blueprint`, `pteromonaco.blueprint`, `pullfiles.blueprint`. |

**StarCloud me kya banana hai:** `services/files.js` (ssh2/SFTP), `routes/files.js`, `views/vm-files.ejs`. Path normalize karke `../` attack rokna, owner check server par, 200 MB tak chunked upload, drag-drop, code editor (Monaco/CodeMirror), zip/unzip, trash, search, Git pull. **Design donor = Mpanel; security donor = SKVM.**

### 5.2 CPU model select karna (create ke waqt)

| Cheez | Sach |
|---|---|
| HKVM `app.js` line ~95 | `CPU_MODELS` = **10 models**: Host CPU (Native), Maximum Features, QEMU 64-bit, KVM 64-bit, Core 2 Duo, Core i7, Skylake, Cascade Lake, Opteron, EPYC. Default `host`. |
| `GET /api/cpu-models` | Ye list frontend ko deta hai. |
| `views/admin/vm-create.ejs` line ~289 | Dropdown `cpu_model`; line ~298 "Use Custom CPU Name" checkbox + text field (example `Intel-Xeon-E5-2680v4`). |
| `app.js` line ~3967 | QEMU arg: `-cpu <model>,model-id=<custom name>` (spawn argv array, safe). |
| Line ~4886 | Startup par invalid CPU model ko `host` par reset karta hai. |

**Matlab:** ye feature HKVM me **pehle se hai** ✅. Bas ise VPS aur VDS dono create forms me same style/animation ke saath repeat karna hai (D-11).

### 5.3 Nested KVM (VM ke andar VM)

| Cheez | Sach |
|---|---|
| HKVM | ❌ **Explicit toggle nahi hai.** Sirf implicit `-cpu host` + `-enable-kvm`. Na DB column, na UI, na host check. |
| Bada report (line 7223) | "Nested KVM on → `-cpu host,+vmx,+svm`", "Nested off + host KVM → `-cpu kvm64`", "No host KVM → TCG `-cpu qemu64`". Ye **apanel/AKVM ke README** se aaya hai (wo zip folder me nahi). |
| HVM-8 (`hvm.py` line ~4257) | LXC container ko `/dev/kvm` device + `security.nesting=true` deta hai — nested virtualization ka real code. Lekin ye container ke liye hai, KVM VM ke liye nahi. |
| Master spec | Host capability report me nested support batana, aur `-cpu host,+vmx` / `+svm` + `kvm=on` expose karna. |

**StarCloud me banana hai (naya feature):** `services/capabilities.js` (`/dev/kvm`, `vmx`/`svm`, `/sys/module/kvm_intel/parameters/nested`), `vms.nested_kvm` column, create form me toggle (host KVM ho to default ON), QEMU CPU flag, aur KVM na ho to VPS create block (D-12, D-13).

### 5.4 KVM Acceleration (sirf HKVM me hai)

| Cheez | Sach |
|---|---|
| `views/admin/vm-create.ejs` line ~649 | Checkbox ka label **"KVM Acceleration"**, default checked. Ye label **sirf HKVM me** mila — baaki kisi pack me nahi. |
| `app.js` line ~415 | `vms.enable_kvm` column save hota hai. |
| **Gadbadi (aaj mili)** | Frontend `collectFormData()` me `data.enable_kvm = 1;` **hardcoded** tha. Edit form me bhi `data.enable_kvm = 1; // Always enable KVM (removed toggle)`. Aur `startQemuVM()` hamesha `-machine ...,accel=kvm:tcg` + `-enable-kvm` lagata tha. **Matlab toggle ka koi asar hi nahi tha.** |
| **Aaj ka fix** | Toggle ab checkbox se padha jata hai (create + edit), string `"0"` bhi sahi se 0 banta hai, aur QEMU args ab `accel=kvm:tcg` + `-enable-kvm` tabhi lagate hain jab toggle ON ho. OFF par `accel=tcg` + `-cpu qemu64` (kyunki `host` TCG me kaam nahi karta). |

### 5.5 Bonus deep khoj — Proxmox-like CPU pinning

`HVM-8/hvm/hvm.py` me `apply_proxmox_like_resources()` (line ~2782):

- `limits.cpu <core list>` se **CPU pinning** (dedicated cores) — VDS ke liye seedha idea.
- Swap **teen layers** par band: LXC config + cgroup + systemd service (line ~4148).
- `security.nesting=true`, `linux.kernel_modules`, `/dev/fuse`, `/dev/net/tun`, `/dev/kvm` passthrough — "sab kuch install karo" wala Proxmox feel.

Ye sab LXC par hai; StarCloud me KVM/QEMU ke liye alag implementation hogi (`-cpu host`, `taskset`/cgroups v2, hugepages).

---

## 6. Poori feature universe (ek hi jagah)

**Status:** ✅ = base me hai · 🔧 = aaj fix hua · ⚠️ = adhoora · ❌ = nahi hai · 🆕 = naye packs se mila idea.

### A. Host / hypervisor / safety
| Feature | Status | Source |
|---|---|---|
| KVM/TCG/LXC/Docker auto-detect + capability report | ❌ | Master spec §0, SKVM backends |
| `/dev/kvm` + `vmx`/`svm` + nested check | ❌ | D-13 |
| KVM na ho to VPS create block (server-side) | ❌ | D-12 |
| Capacity guard ("2 aur 4GB VM fit honge") | ❌ | Master spec §0 |
| Nested KVM toggle (default ON) | ❌ | D-12, bada report |
| KVM Acceleration toggle (sach me kaam kare) | 🔧 | HKVM |
| CPU model (10 presets) + custom CPU name | ✅ | HKVM |
| CPU topology (sockets/cores/threads) | ✅ | HKVM |
| SMBIOS spoofing, machine type, ACPI, extra QEMU args | ✅ | HKVM |
| UEFI/OVMF, virtio, ISO boot order | ⚠️ (ISO hai, UEFI nahi) | HKVM |
| VDS: CPU pinning, hugepages, guaranteed RAM | ❌ 🆕 | Master spec, HVM-8 Proxmox-like |
| Guest agent (qemu-guest-agent) readiness probe | ❌ | Master spec §13 |
| Safety snapshot before risky op | ❌ | Master spec §13 |
| VM watchdog + crash-loop detect | ❌ | Master spec §13 |
| Boot ordering after host reboot | ❌ | Master spec §13 |
| Auto config repair (bridge/tools missing) | ❌ | Master spec §13 |
| Host protection (RAM <10%, disk <5%) | ❌ 🆕 | Master spec, SKVM alerts |

### B. VM lifecycle
| Feature | Status |
|---|---|
| 5-step create wizard + live blueprint/preview | ✅ |
| Create / start / stop / restart / reinstall / delete / edit | ✅ |
| Disk grow (`qemu-img resize`) — ab shell-safe | 🔧 |
| ISO attach / detach / status | ✅ |
| Snapshots (basic create/list) | ⚠️ (restore/delete/schedule nahi) |
| Suspend / unsuspend with reason | ❌ |
| Expiry + renew + expiring list | ❌ |
| Bulk start/stop/reboot + emergency stop-all/reboot-all | ⚠️ (sirf client loop; server endpoint nahi) |
| Maintenance mode | ❌ |
| Safety snapshot, watchdog, tags, favorites, clone, migration | ❌ |
| VM password required (min 8 chars) — weak defaults hataye | 🔧 |

### C. Console / access
| Feature | Status |
|---|---|
| Web SSH terminal (xterm) | ✅ |
| QEMU serial / WebSocket console | ✅ |
| noVNC graphical console | ❌ |
| Boot log viewer (serial + cloud-init, live) | ❌ |
| Shareable terminal link (**sshx** only; tmate hata diya gaya) | ❌ |
| Session recording | ❌ |
| Multi-tab terminal, themes | ❌ |

### D. File manager
| Feature | Status |
|---|---|
| List / read / write / mkdir / rename / delete / upload / download | ❌ |
| Zip / unzip / copy / move / chmod / search | ❌ |
| Code editor (Monaco/CodeMirror) + beautify | ❌ |
| Drag-drop chunked 200 MB upload + progress | ❌ |
| Pull-from-URL, trash/restore, Git clone/pull | ❌ 🆕 (Mpanel) |
| SFTP access to guest | ❌ 🆕 (Mpanel/Nobita) |
| Guest agent + SSH fallback | ❌ 🆕 (NKVM/SKVM) |

### E. Monitoring / observability
| Feature | Status |
|---|---|
| Live stats (CPU/RAM/network) | ✅ |
| Metrics history | ❌ |
| Alert rules + incidents + acknowledgement | ❌ 🆕 (SKVM) |
| Quotas (servers/CPU/RAM/disk) | ❌ 🆕 (SKVM) |
| `/health`, Prometheus `/metrics` | ❌ |
| Public status page + uptime history | ❌ 🆕 (SKVM `status.html`) |
| Activity/audit log + CSV export | ❌ 🆕 (SKVM/vPanel/Mpanel) |
| Notifications bell (backend) | ⚠️ (sirf icon) |
| Capacity-vs-revenue dashboard | ❌ |

### F. Backups / schedules
| Feature | Status |
|---|---|
| Snapshot schedule + retention | ❌ |
| Real full/incremental backup + restore + download | ❌ |
| Offsite backup (S3/Wasabi), AES-256 encryption | ❌ |
| Cron schedules (power/backup/snapshot/command) | ❌ |
| Panel self-backup (DB + config + secrets) | ❌ |

### G. Networking
| Feature | Status |
|---|---|
| NAT + SSH port forward | ✅ (basic) |
| Static public IPv4 / bridge / IPv6 fields | ✅ (form me) |
| Single public IPv4 + auto port pool (D-9, D-18) | ❌ |
| Port-forward manager + bulk ranges | ❌ |
| IP pool page (assign/release/reserve, CSV, conflict) | ❌ |
| rDNS/PTR editor, per-VM firewall UI | ❌ |
| Bandwidth metering + quota + throttle | ❌ |
| Reverse proxy for HTTP + Let's Encrypt (Pterodactyl-style ports) | ❌ 🆕 |
| Cloudflare Tunnel / Tailscale / Playit | ❌ 🆕 (Mpanel playit, Nobita) |
| DNS providers dropdown | ✅ |

### H. Auth / users / security
| Feature | Status |
|---|---|
| Login/logout, admin + user roles, user CRUD | ✅ |
| Discord OAuth login / link / unlink (bugs theek) | 🔧 |
| Session secret env se + httpOnly/SameSite/secure cookies | 🔧 |
| Shell command injection (execSync → execFile argv) | 🔧 |
| Public `/api/settings` se secrets filter | 🔧 |
| 2FA TOTP + QR + backup codes | ❌ |
| Login lockout + rate limit + IP ban | ❌ |
| Password reset (expiring token) + email verify (toggle) | ❌ |
| Session list + remote revoke | ❌ |
| Owner tier (owner > admin > user), owner guard | ⚠️ (sirf admin/user) |
| API keys with scopes + last-used | ❌ |
| CSRF protection, input validation (zod), Helmet | ❌ |
| Captcha/Turnstile, disposable-email block | ❌ |
| Sub-users / per-VM permissions | ❌ 🆕 (Mpanel/NKVM) |
| Admin impersonation (consent + audit) | ❌ |
| **Owner remote support + telemetry** | ❌ — **D-23/2026-10-25 faisla: dono hatao** |

### I. Admin / ops
| Feature | Status |
|---|---|
| OS templates (built-in + custom + download + cache) | ✅ |
| Admin settings (General/Branding/Security/System/Discord/About) | ✅ |
| Settings me Discord bot token/guild/auto-role | ⚠️ (save hota hai, bot nahi chalta) |
| Discord webhook field (optional, khali default) | ❌ |
| Audit log page | ❌ |
| Per-VM security scan (miner/failed logins/cron) | ❌ |
| OS icons / font upload / sidebar icons | ❌ 🆕 |
| Command palette (Ctrl+K), global search | ❌ |
| Branding (logo/banner/name/favicon) | 🔧 (aaj asli logo/banner lagaye) |
| Installer (`install.sh` + systemd + KVM check) | ❌ |
| Docker + compose, CI, tests, `.env.example` | 🔧 (`.env.example` aaj bana; CI/test abhi nahi) |

### J. Premium look (HKVM theme)
| Feature | Status |
|---|---|
| Pure-black glassmorphism tokens, Inter + JetBrains Mono | ✅ |
| Motion (count-up, shimmer, toast, ripple, pulse, stagger) | ✅ |
| Sidebar/header/breadcrumb/fullscreen/login animation | ✅ |
| Wallpaper browser + blur (0–40px) + transparency sliders | ❌ |
| Fun Mode (confetti, 3D tilt, sounds), reduced-motion | ❌ |
| Dark/light switch, i18n English + Hindi | ❌ |
| Onboarding overlay, skeleton loaders, empty states | ❌ |
| PWA + push | ❌ |

### K. Business (Discord-centric)
| Feature | Status |
|---|---|
| Coupons (percent / fixed / 100% free, expiry, usage count) | ❌ |
| Giveaway codes (N codes, one-time claim) | ❌ |
| Referral, flash-sale/event banner + countdown | ❌ |
| Plans (VPS/VDS), cycles, add-ons, custom price per order | ❌ (custom price **D-5 se hata diya gaya**) |
| Order record table | ❌ (**D-6 se hata diya gaya** — Discord ticket hi record) |
| Discord bot (Python discord.py): ticket, UPI ticket, credentials DM | ❌ |
| Discord bot admin page (status/start/stop) | ❌ |
| Discord webhook alerts | ❌ |
| UPI manual confirmation (bot payment verify nahi kar sakta) | ❌ |
| Email verification (Brevo free SMTP, toggle) | ❌ |
| Revenue dashboard (MRR/ARR, churn) | ❌ |
| Marketing site (landing, pricing, blog, ToS, status, SEO) | ❌ |
| Razorpay / payment gateway | ❌ (**faisla: website par payment nahi**) |

### L. AI assistant (Batch 6)
| Feature | Status |
|---|---|
| AI chat Hindi/Hinglish/English + streaming | ❌ |
| Tool allowlist by role (owner/admin full; customer support + apna VM start/stop) | ❌ |
| Risk gate + 60-second confirmation (ZORIN design) | ❌ |
| Provider failover (Gemini free key first, `.env` me) | ❌ |
| AI Log Doctor (boot log redaction ke baad) | ❌ |
| Immutable AI action audit | ❌ |
| AI default OFF, secrets kabhi AI ko nahi | ❌ |
| `public-apis` catalog ingestion | ❌ |
| Command palette with natural language | ❌ |

### M. Later / roadmap
Multi-node cluster + circuit breaker + live migration · auto-placement · plugin system · per-VM firewall UI · blog/changelog · currency selector · template store (Proxmox `.vma.zst` → qcow2 conversion) · MongoDB/MySQL hosting · one-click apps · reseller/white-label · PWA.

---

## 7. Sare faisle (D-1 … D-26) — ek hi table

| # | Faisla |
|---|---|
| D-1 | Saari features ek hi install me; P0/P1/MVP ka split nahi |
| D-2 | Discord **bot** banega; token website ke Settings page se |
| D-3 | RDP / Windows / Linux XRDP — sab scope se bahar (D-26 me XRDP bhi confirm hata) |
| D-4 | tmate hatao, **sshx** rakho |
| D-5 | "Custom price per order" hatao |
| D-6 | "Order record" table hatao; Discord ticket hi record |
| D-7 | Coupons aur giveaway codes **VM management** section me |
| D-8 | HKVM → **StarCloud**, "hopingboyz" → **KingSlayer** |
| D-9 | Single public IPv4 + har VM ko alag port block |
| D-10 | AI assistant website me built-in |
| D-11 | Custom CPU model har VPS/VDS create form me (same HKVM style/animation) |
| D-12 | Nested KVM: host par KVM ho to default ON + toggle; KVM na ho to VPS create block |
| D-13 | Installer KVM auto-detect karega |
| D-14 | Default admin `admin/admin` accept (baad me badlenge) — **ek line ka note, security risk hai** |
| D-15 | VM ka password admin khud dale; template default nahi |
| D-16 | Webhook ek setting, default khali (khali ho to kuch na bheje) |
| D-17 | **File manager ADD** |
| D-18 | IPv4 shared, port automatic allocate |
| D-19 | AI do tier: owner/admin poora website; customer sirf support + apna VM start/stop (confirm ke saath) |
| D-20 | AI provider = Google AI Studio ka free Gemini key, sirf `.env` me |
| D-21 | Customer passwords/secrets AI ko kabhi nahi |
| D-22 | `public-apis/public-apis` repo AI ka knowledge |
| D-23 | "Pi S" drop — ab na poochha jaye; owner remote support + telemetry bhi **nahi** |
| D-24 | VM password minimum 8 characters |
| D-25 | Discord bot **Python (discord.py)** me, Node.js nahi |
| D-26 | XRDP / Linux desktop remote bhi hatao |

**Standing rules:** har jawab detail me, har short form ka full form pehle, `Analyse-File/` me kabhi change nahi, code packs se **sirf ideas** (license safe), koi hidden backdoor/magic password/license-bypass nahi.

---

## 8. Aaj ki "gadbadi" — kya mila aur kya theek kiya

| # | Problem | Kahan tha | Fix | Verify |
|---|---|---|---|---|
| 1 | Session secret hard-coded `KingSlayer-secret-key-change-in-production` | `app.js` session block | `SESSION_SECRET` env (32+), na ho to random generate karke `data/session_secret` me 0600 par store | Server log me warning + file mode `-rw-------` |
| 2 | Cookie me `secure:false`, `httpOnly` nahi, `sameSite` nahi | wahi | `httpOnly`, `sameSite:'lax'`, `secure` = `COOKIE_SECURE` ya production | Login + pages 200 |
| 3 | Discord unverified email se existing account auto-match (account takeover) | `app.js` callback | Sirf `discordUser.verified === true` par email use; warn log | Code + `node --check` |
| 4 | `/link-discord-account` aur `/create-account-discord` GET routes **missing** (redirect 404) | `app.js` | Dono GET pages + naya `views/discord-account.ejs` + `POST /api/discord-create-account` | Dono URL ab `/login?error=...` par redirect hote hain (404 nahi) |
| 5 | KVM Acceleration toggle **no-op** (hardcoded `1`, QEMU hamesha KVM) | `vm-create.ejs`, `vm-edit.ejs`, `app.js` | Checkbox se value, string `"0"` handling, QEMU `accel=tcg` + `qemu64` jab OFF | Code review + syntax |
| 6 | `enable_kvm ? 1 : 0` — string `"0"` ko `true` maanta tha | edit API | `toggleFlag()` helper | Code review |
| 7 | VM ka weak default password (`ubuntu/ubuntu`, `'password'`) | create/edit/reinstall | Password required + min 8 (form + server), reinstall me stored password ya random fallback | `POST /api/vms` bina/short password par **HTTP 400** (live test) |
| 8 | **Shell injection**: `execSync` me `"${path}"` ke saath shell commands | 9 jagah (`qemu-img`, `cp`, `genisoimage`, `taskkill`, `ps`) | `execFileSync`/`execFile` argv arrays + `fs.copyFile` — koi shell nahi | `grep` me ab sirf `ssh2 client.exec` bacha |
| 9 | `/favicon.ico` → `/public/images/logo.png` (galat path, 404) | `app.js` | `/images/logo.png` | HTTP 200, 611 KB |
| 10 | Public `/api/settings` sab keys return karta tha (aage secret leak ka khatra) | `app.js` | `secret/token/password/api_key/webhook/private` keys filter | JSON me koi secret nahi |
| 11 | Logo purana HKVM "HK" tha; banner bilkul missing | `public/images/` | Asli StarCloud logo 512×512 + banner 1600×899; WebP versions bhi | Images serve 200 |
| 12 | Startup banner "KingSlayer VM MANAGEMENT PANEL V1.0" | `app.js` | "StarCloud VM MANAGEMENT PANEL V2.0" | Server log |
| 13 | `.env.example` nahi tha; `.gitignore` me generated secret nahi tha | root | Dono add/fix | Git status |
| 14 | `HVM-1.rar` galat extension (asli ZIP) | `Analyse-File/` | **Archive ko chheda nahi** — sirf report me note kiya (aap chahein to rename kar denge) | ZIP magic bytes |

**Live test results (aaj):** `npm ci` ✅ · `node --check app.js` ✅ · 28/28 EJS compile ✅ · server port 8080 ✅ · `/login`, `/dashboard`, `/admin/dashboard`, `/admin/vm-create`, `/admin/vms`, `/admin/settings`, `/profile`, `/vms`, `/api/vms`, `/api/admin/users`, `/api/settings`, `/api/cpu-models`, `/images/*`, `/favicon.ico` — sab **HTTP 200** · login `admin/admin` ✅ · password validation **HTTP 400** ✅.

---

## 9. Puraane docs ki galtiyan (corrected)

| Puraana claim (doc) | Ab sach |
|---|---|
| `FEATURE_GAP_ANALYSIS.md`: "HKVM me File manager / SFTP ⚠️ UI hai" | ❌ HKVM me **koi** file manager route/view nahi. File manager Mpanel/HVM-8/NKVM/vPanel/SKVM me hai. |
| Wahi: "Command palette ✅ 4 hits", "Font upload ✅ 4 hits", "Public IP pool ✅ basic" | ❌ HKVM me command palette, font upload, IP pool page — koi nahi. Ye keywords docs/analysis file se aa rahe the. |
| Wahi: "Cloudflare DNS ✅ 14 hits" | ⚠️ Sirf DNS dropdown (1.1.1.1); Cloudflare API integration nahi. |
| `FEATURE_CATALOG.md`: "RDP / Windows" abhi bhi P1 me | ❌ D-3/D-26 ke hisaab se RDP/Windows/XRDP **scope se bahar**. |
| `STARCLOUD_ANALYSIS_AND_PLAN.md`: "7 din MVP, branch `arena/410d8fbd-...`" | Purana plan hai; D-1 ke hisaab se sab features ek saath, deadline flexible. Nayi branch `arena/1bed8e0c-starcloud-vm`. |
| `All Analyse File Detail.txt`: "Mpanel aur Nobita dropped, zip nahi hai" | ✅ Ab dono `Analyse-File/` me hain aur aaj verify hue. |
| Wahi: "Analyse-File me 9 zip packs" | ✅ Asli me **13 archives** (12 ZIP + 1 galat-naam RAR jo ZIP hai) + 2 images. |
| Wahi: "repo me `app.js` 4,912 lines, 87 routes" | ✅ Ab 4,968 lines, **90 routes** (3 Discord routes add hue). |
| `STARCLOUD_FEATURE_LIST.md`: pending "Discord webhook?", "File manager?", "Pi S?", "AI provider?" | D-16 (webhook optional), D-17 (file manager ADD), D-23 (Pi S drop), D-20 (Gemini free) — sab jawab mil chuke. Neeche Section 12 me **naye** sawaal hain. |
| Bada report: "HKVM me HMAC-SHA256 license hai" | ⚠️ `licenses.js` **no-op stub** hai (free edition). Koi license check nahi. |

---

## 10. Environment ki sachai (honest)

- Is sandbox me **KVM nahi** (`/dev/kvm` nahi), **QEMU nahi**, Docker nahi. Isliye **asli VM create/boot yahan test nahi ho sakta** — wo aapke KVM server par hoga.
- Outbound internet sirf `github.com`, `api.github.com`, `codeload.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`. Isliye Razorpay, Discord, Ubuntu cloud-image mirrors, Let's Encrypt yahan se reach nahi hote. `npm ci` ✅ hua.
- `sqlite3` native module build ho gaya (`npm_config_nodedir=/usr/local` ke saath) — 254 packages install hue.
- `Analyse-File/` ke archives me kuch **live data** hai (`hvm.db`, `hvm.log`, backups, `.pyc`, MYRAA memory JSON). Inhe kabhi copy nahi karna, values check nahi ki.
- **License rule:** HKVM sirf MIT (`package.json`) — base ke liye theek, lekin LICENSE file add karni hogi. NKVM **GPL-3.0** hai. Baaki packs me LICENSE file nahi (Mpanel README MIT bolta hai, Nobita-Cloud CC0). **Rule: sirf idea lo, code apna likho.**

---

## 11. Build ka suggested order (aapke jawaab ke baad)

| Batch | Kaam | Donor |
|---|---|---|
| **1 — Host safety + base** | Capability engine, KVM detect + block, nested KVM toggle, capacity guard, KVM Acceleration (aaj fix), password rule, maintenance, emergency stop/reboot-all, audit log, per-VM security scan, webhook field, installer + systemd, `.env.example`, LICENSE | Master spec §0, SKVM backends, HVM-8 |
| **2 — VM management** | File manager (Minecraft-style), VDS create form with same CPU model component, boot log viewer, expiry/renew/suspend, coupons, giveaway codes, shared IPv4 + auto port pool + bulk ports, snapshots restore/schedule, real backup/restore, status page, referral, flash sale | Mpanel, HVM-8, SKVM |
| **3 — Automation** | Scheduled power/backup/snapshot, cron scheduler, metrics history, alerts/incidents, quotas, notifications bell | SKVM, NKVM, vPanel |
| **4 — Discord + support** | Python discord.py bot (token settings se), ticket + UPI ticket + credentials DM, bot admin page, webhook alerts, sshx link, email verification (SMTP toggle) | User design, D-25 |
| **5 — Premium look + security** | 2FA TOTP + backup codes, login lockout, password reset, Hindi/English i18n, wallpaper + blur/transparency sliders, command palette (Ctrl+K), Fun Mode + reduced-motion, custom branding, landing/pricing page | NKVM, vPanel, Mpanel |
| **6 — AI** | Gemini free provider + failover, tool allowlist by role, risk gate + 60s confirm, AI Log Doctor, AI action audit, default OFF, public-apis catalog, natural-language command palette | ZORIN, MYRAA, ALTEX |
| **Later** | Multi-node + migration, plugin system, firewall UI, blog/changelog, currency, template store, reseller | HVM-8, vPanel, Hex-Mc (docs only) |

---

## 12. Aapse poochhne hain ye sawaal (jawaab ke baad build start)

1. **KVM server:** kya aapke paas abhi ek KVM-capable Ubuntu/Debian server hai jahan hum test kar sakte hain? Agar haan, to OS version aur RAM/disk kitni hai? (Real VM test wahi hoga.)
2. **Domain + owner email:** `{{DOMAIN}}` aur `{{OWNER_EMAIL}}` kya honge? Ya pehle placeholder rakhein?
3. **Nested KVM + KVM-less host:** master spec kehta hai "panel bina KVM ke bhi chale (TCG)", lekin D-12 kehta hai "KVM na ho to VPS create block". Confirm: **panel chalega, par VPS create block rahega** — sahi hai na?
4. **File manager scope:** kya file manager **customer** ko bhi milega ya sirf admin ko? Aur kya VM ke andar guest agent install karna manzoor hai (SSH fallback ke saath)?
5. **Discord bot:** Python `discord.py` bot ko website ke saath kaise chalayenge — alag process/service (systemd) ya website se spawn? Aur UPI ID / QR image kaun dega?
6. **Batch order:** upar wala Batch 1→6 order theek hai, ya pehle **file manager + nested KVM + CPU model** (aapke teen deep features) chahiye?
7. **Mpanel/Nobita:** pichhle docs ne inhe "drop" kaha tha; ab ye folder me hain. Inhe **reference** rakhein (maine aaj verify kiya), ya phir bhi ignore karein?
8. **Default admin `admin/admin`:** D-14 ne accept kiya tha. Kya ab bhi waise hi rakhein, ya first-run setup me strong password maangein?
9. **Brand images:** maine logo 512px aur banner 1600px optimize karke `public/images/` me daal diya (PNG + WebP). Kya aap chahte hain ki purane 1254px wale bhi rakhein?
10. **AI key:** Gemini free key kab milegi? (Batch 6 tab tak design-only rahega, key `.env` me.)

---

## 13. Verification log (commands)

```
node --check app.js                       → OK
ejs.compile() on 28 templates            → 0 errors
npm_config_nodedir=/usr/local npm ci     → 254 packages added
node app.js                              → port 8080, 0.0.0.0
curl /login /dashboard /admin/* /api/*   → HTTP 200
curl POST /api/vms (no password)         → HTTP 400 "VM password is required..."
curl POST /api/vms (password "123")      → HTTP 400
grep 'execSync|execPromise' app.js       → 0 shell-string usages left
ls -l data/session_secret                → -rw------- (0600)
unzip -l Analyse-File/*.zip              → 12 archives; HVM-1.rar = ZIP magic
```

---

*Is file ko padhne ke baad aapko pura feature map, sari galtiyan aur aage ka plan ek hi jagah mil jata hai. Agla kadam: Section 12 ke jawaab → Batch 1 start.*
