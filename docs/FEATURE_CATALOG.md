# StarCloud — Feature Catalog (HKVM base par)

> **Base:** repo root (HKVM Panel v2.0.0-free, MIT, Node.js + Express + EJS + SQLite). Sab changes isi repo mein honge (HKVM ke files ab root par hain; `HKVM/` folder hata diya gaya hai).
> **Sales/support:** Discord par. **Website:** admin VPS / VDS / RDP create + manage karega. Look: HKVM premium dark.
> **Source:** `Analyse-File/` ki zips (untouched) + spec `StarCloud VM MAKER WEBSITE MASTER-PROMPT.txt` + analysis `analyse VM Website detail.txt`.
> **Method:** sab reference packs extract karke route / table / file level par verify kiya gaya. Jahan verify nahi hua wahan "spec" likha hai.

## 0. Legend

| Symbol | Matlab |
|---|---|
| ✅ | HKVM mein already hai |
| ⚠️ | Basic / partial hai |
| ❌ | Nahi hai |
| 🔁 | Dusre pack se idea lo, code apna likho (license safe) |
| P0 / P1 / P2 / LATER / SKIP | Priority (P0 = pehle) |

**License rule:** NKVM aur Hex-Mc **GPL-3.0** hain — inka code copy karoge to product bhi GPL hona padega. Kai packs (apanel, vpanel-pro, nobitahost, hosting-website, XRDP, ZORIN, Thame) mein **koi LICENSE file nahi** — copy karna risky hai. HKVM **MIT** hai (copyright notice rakhna hoga). **Rule: sirf idea lo, code apna likho.**

---

## 1. HKVM ka current map (verified)

### 1.1 Files
| File / folder | Kaam | Size |
|---|---|---|
| `app.js` | Poora backend: routes, DB init, QEMU spawn, cloud-init, SSH, WebSocket | 4,912 lines / 176 KB |
| `licenses.js` | License **stub** — free edition mein no-op. Ise hata denge | 213 lines |
| `views/admin/*.ejs` | vms, vm-create, vm-detail, vm-edit, vm-console, vm-ssh, users, users-create/edit, settings, templates, templates-add/edit, dashboard | 13 |
| `views/users/*.ejs` | dashboard, vms, vm-detail, vm-console, vm-ssh, profile, login, 404 | 8 |
| `views/partials/admin/` | sidebar, header, footer | 3 |
| `views/partials/users/` | sidebar | 1 |
| `public/css/admin.css` | Poora theme (87 KB, tokens + glass + keyframes) | 87 KB |
| `data/` | Runtime SQLite (HKVM_DATA_DIR). Git mein nahi (`.gitignore`) | — |

### 1.2 Database (8 tables)
`users`, `vms`, `vm_logs`, `vm_snapshots`, `os_templates`, `settings`, `discord_settings`, `user_discord_accounts`.
Migration style: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN` (console mein "Added column: ..." dikhta hai). Naye features ke liye yahi style follow karenge.

### 1.3 Routes (sab `app.js` mein)
- **Auth:** `/api/login`, `/api/logout`, `/api/auth/check`, `/logout`, `/api/discord-*`, `/auth/discord/callback`, `/api/link-discord-account`, `/api/unlink-discord-account`
- **OS templates:** `/api/os-templates`, `/api/admin/templates` (CRUD + builtin + download + cache info/clear)
- **VM create helpers:** `/api/cpu-models`, `/api/smbios`, `/api/network-types`, `/api/dns-providers`, `/api/iso-list`
- **VM lifecycle:** `POST /api/vms` (create), `start`, `stop`, `restart`, `reinstall`, `DELETE`, `GET/PUT /api/vms/:id/edit`, `/stats`, `/logs`, `/snapshots` (GET/POST), `/iso/attach|detach|status`
- **Console:** `/api/vms/:id/console`, `/console/command`, `/api/ssh/connect`, `/api/ssh/command`, WebSocket (`ws`)
- **Admin:** `/api/admin/users` (CRUD), `/api/admin/vms`, `/api/admin/dashboard`, `/api/admin/discord-settings`, `/api/settings`
- **User:** `/api/user/profile`, `/api/user/password`, `/api/users/list`
- **License:** `/license_activation`, `/api/license/activate` (stub)
- **Pages:** `/login`, `/dashboard`, `/admin/*`, `/vm/:id/*`, `/vms`, `/profile`

### 1.4 Security issues (features se pehle fix karne hain)
| # | Issue | Kahan | Fix |
|---|---|---|---|
| S1 | **Default admin `admin/admin`** auto-create hota hai | `app.js` ~L564–569 | First-run installer: owner email + strong password `.env` / prompt se. Default creds hatao. |
| S2 | **Hardcoded session secret** `hopingboyz-secret-key-change-in-production` | `app.js` ~L326 | `.env` se `SESSION_SECRET` (min 32 char), startup par check |
| S3 | Cookie `secure: false` | `app.js` ~L329 | Production mein `secure: true`, `httpOnly`, `sameSite: 'lax'` |
| S4 | **Shell command injection risk**: `execSync` mein template string se disk path (`qemu-img resize "${path}"`) | `app.js` ~L2059, 2083, 2094, 2522, 2868, 2883, 3897–3910 | `execFile`/`spawn` ke argv array use karo, shell nahi |
| S5 | Monolithic `app.js` (4,912 lines) | — | `routes/` (thin) → `services/` → `lib/` → `drivers/` (qemu, ssh). ~300 lines/file |
| S6 | Login rate-limit / lockout nahi | — | `express-rate-limit` + `login_attempts` table |
| S7 | CSRF protection nahi | — | `csurf` ya double-submit token |
| S8 | Input validation (zod) nahi | — | Har route par validation |

---

## 2. Feature catalog (area-wise)

Columns: **Feature** · **Source (pack / file)** · **HKVM status** · **HKVM mein kahan add** · **Priority**

### A. Auth & accounts

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| Admin/owner first-run setup (no default creds) | spec Part1 §2 | ❌ (S1) | `app.js` init → `/setup` page | **P0** |
| 2FA TOTP + QR + backup codes | NKVM `authService.js`, nobitahost (`otplib`), vpanel | ❌ | `users` table + `totp_secret`, `views/admin/profile`, login step | **P0** |
| Login lockout + IP ban list | vpanel, Hex-Mc (rate limit idea), spec §2 | ❌ | `login_attempts` table + middleware | **P0** |
| Password reset (expiring token) + email verify (toggle) | NKVM `authService`/`mailService`, vpanel `mailService` | ❌ | `reset_tokens` table, `lib/mailer.js` (SMTP), toggle in `settings` | **P0** (D-13) |
| Session list + remote revoke | spec §2 | ❌ | `sessions` table | P1 |
| Roles: owner / admin / user | vpanel `root_admin` + "last admin can't be suspended" | ⚠️ (admin/user) | `users.role`, owner guard | **P0** |
| Discord OAuth login / link | apanel (`/login/discord`), HKVM already | ✅ | — | ✅ |
| Customer API keys (scopes + last-used) | HVM-8 `api_keys`, apanel `/api/v1/keys`, Hex-Mc | ❌ | `api_keys` table + Bearer middleware | P1 |
| Captcha / Turnstile on signup | vpanel (captcha) | ❌ | `/register` | P2 |
| Avatar / profile upload | HVM-8, vpanel | ⚠️ | `views/admin/profile` | P2 |

### B. VM lifecycle (VPS / VDS / RDP)

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| Create wizard (steps + live preview) | HKVM ✅, NKVM (`create.ejs`, blueprint card) | ✅ | `views/admin/vm-create.ejs` | ✅ |
| Start / stop / restart / reinstall / delete | HKVM ✅ | ✅ | `app.js` → move to `services/vmService.js` | ✅ |
| Edit (CPU/RAM/disk/password) + disk grow | HKVM ✅ (`/api/vms/:id/edit`) | ✅ | — | ✅ |
| ISO attach / detach / boot order | HKVM ✅ | ✅ | — | ✅ |
| Nested KVM toggle (`-cpu host,+vmx`) — **D-4/D-11** | Spec §1 | ❌ explicit toggle nahi (`-enable-kvm` hardcoded, `-cpu host` se vmx implicit) — verified | `vm-create.ejs` + driver flag, default ON | **P0** |
| Host KVM detect + block VPS create if no KVM — **D-5/D-12** | Spec §0 | ❌ | `lib/capability.js` (`/dev/kvm`, `vmx/svm`), block in `POST /api/vms` | **P0** |
| Capacity guard ("2 more 4GB VMs fit") | Spec §0 (pack mein nahi) | ❌ | `services/capacity.js` | **P0** |
| Suspend / unsuspend with reason | HVM-8 `/vps/<id>/suspend`, `suspended.html` | ❌ | `vms.suspended`, `suspended_reason` cols | **P0** |
| Expiry + renew + expiring list | HVM-8 `/vps/<id>/expiration`, `/renew`, `/vps/expiring`; Svm-v6; HVM-V8 | ❌ | `vms.expires_at` + daily job (`services/expiry.js`) | **P0** |
| Bulk start / stop | HVM-8 `/vps/bulk/start|stop` | ❌ | `POST /api/vms/bulk` | P1 |
| Safety snapshot before risky op | Spec §13 | ❌ | `services/snapshot.js` hook | P1 |
| Auto-restart watchdog (crash loop → stop + notify) | Spec §13 | ❌ | `services/watchdog.js` | P1 |
| Hostname change | apanel `/vm/<id>/hostname` | ❌ | VM detail page + cloud-init/ssh | P2 |
| Tags / favorites / saved filters | Spec §15 | ❌ | `vms.tags` + UI | P2 |
| Migration between nodes | HVM-8 `/vps/<id>/migrate`, Hex-Mc | ❌ | Roadmap (multi-node) | LATER |
| Clone VM | — (spec mein nahi) | ❌ | — | LATER |

### C. Console & access

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| Web SSH terminal (xterm) | HKVM ✅ (`/api/ssh/*`, ssh2) | ✅ | `views/admin/vm-ssh.ejs` | ✅ |
| QEMU serial / WebSocket console | HKVM ✅ (`ws`) | ✅ | `vm-console.ejs` | ✅ |
| Boot log viewer (serial + cloud-init, live stream) | NKVM `/vms/:id/bootlog/stream`, vpanel bootlog | ❌ | `services/bootlog.js` + tab in `vm-detail` | **P0** |
| AI boot-log diagnose | vpanel `/bootlog/diagnose` | ❌ | LATER (AI) | LATER |
| Shareable terminal link (sshx primary, tmate secondary) — opt-in, time-limited | apanel `setup_sshx` / `setup_tmate` (`/vm/<id>/sshx`, `/tmate`), HVM-8 tmate | ❌ | `services/share.js` (audit + revoke). ⚠️ apanel `curl sshx.io/get \| sh` ka pattern mat lena | **P1** (Discord support ke liye useful) |
| noVNC graphical console | spec §3, NKVM `vncService` idea | ❌ | QEMU VNC port + noVNC static | P1 |
| Session recording (owner/admin) | spec §3 | ❌ | LATER | LATER |

### D. Files

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| File manager: list / mkdir / delete / rename / read / write / upload / download | apanel `/vm/<id>/files/*` (16 routes), NKVM (agent), spec §4 | ❌ HKVM mein file manager nahi hai (koi route/view nahi, verified). Sirf apanel/NKVM mein hai | `services/files.js` (ssh/sftp via ssh2) — naya banana hoga | P1 |
| Zip / unzip, chmod, code editor | spec §4 | ❌ | — | P2 |
| Guest agent (python) | spec §4, NKVM/vpanel `vpanel-agent.py` idea | ❌ | LATER | LATER |

### E. Monitoring

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| Live stats (CPU/RAM/network charts) | HKVM ✅ (`/api/vms/:id/stats`), NKVM, vpanel (2.5s charts) | ✅ | — | ✅ |
| Host capability report page | Spec §0 | ❌ | `views/admin/capability.ejs` | **P0** |
| Metrics history | HVM-8 `vps_metrics` | ❌ | `vm_metrics` table | P1 |
| Prometheus `/metrics`, health endpoint | spec §12 | ❌ | `/health` (uptime monitor) | P1 |
| Status page (public uptime) | spec §11 (pack mein nahi) | ❌ | `/status` page | P2 |

### F. Backups, snapshots, schedules

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| Snapshots (create / restore / delete) | HKVM `vm_snapshots` ✅ (basic), HVM-8 `/vps/<id>/snapshots/*` | ⚠️ | `vm_snapshots` + restore route | P1 |
| Snapshot schedule + retention | HVM-8 `/vps/<id>/snapshots/schedule`, NKVM schedules | ❌ | `snapshot_schedules` table | P1 |
| Full backup + restore + download | HVM-8 `/backups/*`, vpanel `backupService`, NKVM `/vms/:id/backups` | ❌ | `backups` table + `services/backup.js` (S3 later) | P1 |
| Cron schedules (power / backup / command / restart) | NKVM `/vms/:id/schedules`, vpanel scheduleService, HVM-8 | ❌ | `services/scheduler.js` (node-cron) | P1 |
| Panel self-backup (DB + config) | HVM-8 `/admin/backup`, vpanel `/api/backups/export|import` | ❌ | `/admin/backup` | P1 |

### G. Networking

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| NAT port forwarding (per VM) | HVM-8 `/ports/add|remove`, `/ports/custom` | ⚠️ (`public IP`/port fields) | `port_forwards` table + iptables driver | P1 |
| Bulk port forward (range) | HVM-8 `/admin/ports/bulk` | ❌ | `POST /api/ports/bulk` | P1 |
| Port hit counter | HVM-8 `/ports/hit/<port>` | ❌ | LATER | LATER |
| Public IPv4 pool (add IP/CIDR, assign/release, status) | apanel `/admin/public-ips` + `/api/v1/admin/public-ips`, vpanel | ⚠️ (VM create mein field) | `ip_pool` table + admin page | **P0** (dedicated IP sale) |
| IPv6 per VM | spec §6.1, HKVM (`ipv6` field) | ⚠️ | — | P1 |
| rDNS / PTR editor | spec §6.1 (pack mein nahi) | ❌ | LATER | LATER |
| Firewall rules UI (nftables) | NR-PROTECTION (idea), nobitahost (`firewall`) | ❌ | `services/firewall.js` | P2 |
| Cloudflare DNS | HKVM ✅ (14 hits) | ✅ | — | ✅ |
| Cloudflare Tunnel / Tailscale / Playit | spec §6; Hex-Mc (Playit = out of scope) | ❌ | LATER | LATER |

### H. Nodes & cluster (roadmap)

| Feature | Source | HKVM | Pri |
|---|---|---|---|
| Node register + heartbeat API | apanel `/api/node/register`, `/api/node/heartbeat`, `node.py` | ❌ | LATER |
| Circuit breaker + reset | HVM-8 `/nodes/<id>/circuit-breaker/reset` | ❌ | LATER |
| Node health / live stats per node | HVM-8, NKVM `/admin/nodes/status` | ❌ | LATER |
| Live migration with progress | HVM-8 `/vps/<id>/migrate`, `/migration-progress` | ❌ | LATER |
| Auto-placement (least loaded) | spec §5 | ❌ | LATER |

### I. Admin & operations

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| **Maintenance mode** (site-wide page) | HVM-8 `/maintenance/enable|disable`, Svm-v6, NR-PROTECTION, nobitahost | ❌ | middleware + `views/maintenance.ejs` | **P0** |
| **Emergency ops**: stop-all, reboot-all, clear-suspensions, reset-ports | HVM-8 `/emergency/*` | ❌ | `services/emergency.js` + confirm modal | **P0** |
| Activity / audit log + CSV export | apanel `/admin/audit` + `/api/v1/admin/audit`, vpanel auditService, NKVM | ⚠️ (minimal) | `activity_logs` table + `/admin/audit` | **P0** |
| Notifications (bell, unread, mark read) | apanel `/notifications/*`, HVM-8 | ⚠️ (HKVM header bell static "No new notifications", backend nahi — verified) | `notifications` table + header bell | P1 |
| Webhooks (signed, retries) | HVM-8 `/webhooks`, vpanel plugins (Discord/Telegram) | ❌ (HKVM mein webhook code nahi — verified; settings mein sirf Discord *bot* fields hain jo unused hain) | `webhooks` table + HMAC signing | **P0** (Discord alerts) |
| **Discord bot admin page** (bot token, status, commands) | apanel `/admin/discord-bot` + `/admin/settings/discord-bot/status` (discord.py style, prefix `akvm!`) | ⚠️ (HKVM settings mein Bot Token / Guild ID / Auto Role fields hain, save hote hain, lekin bot connect code nahi — verified) | `views/admin/discord-bot.ejs` + `services/discordBot.js` (discord.js) | **P0** (Discord-centric) |
| **Security scan per VM** (miner processes, failed logins, suspicious cron) | apanel `vm_security_scan`, `scan_vm_for_threats` | ❌ | `services/securityScan.js` (SSH argv, no shell) | P1 |
| Branding: logo, favicon, sidebar icon, fonts | apanel `/admin/settings/icon-upload`, `/admin/fonts`; HVM-8 favicon/header icon | ⚠️ (`DEFAULT_LOGO_URL`) | `settings` + upload (multer) | P1 |
| OS icons manager | HVM-8 `/admin/os-icons/*`, Svm-v6, HVM-V8 | ❌ | `os_icons` table | P2 |
| OS templates (catalog) | `Template-main/images.json` — **16 templates** (AlmaLinux 8/9/10, Debian 11/12/13, Rocky 8/9/10, Ubuntu 22.04/24.04/25.10/26.04, Windows Server 2019/2022/2025). ⚠️ Ye links **`.vma.zst` (Proxmox VMA format)** hain — QEMU/qcow2 mein seedha nahi chalenge. | HKVM ✅ (apne cloud-image URLs hain: Ubuntu, Debian, Fedora, CentOS, AlmaLinux qcow2) | `os_templates` seed. Pack ki list ka naam/version use karenge, lekin image source official qcow2 cloud images honge (HKVM style). | P0 |
| Users admin (CRUD) | HKVM ✅ | ✅ | — | ✅ |
| Sub-users (VM access share) | NKVM `/vms/:id/subusers`, vpanel subuser | ❌ | `vm_subusers` table | P2 |
| Admin impersonation (support, consent + audit) | vpanel `/admin/users/:id/impersonate` | ❌ | — | LATER |
| License system | HKVM stub, HVM-8 license server (hardcoded IP — ❌ NEVER) | stub | **Remove** | — |

### J. Theme & UX (premium look)

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| Pure-black glass theme tokens | HKVM `admin.css` ✅ | ✅ | `public/css/admin.css` | ✅ |
| Motion keyframes (count-up, shimmer, toast, ripple, pulse) | HKVM ✅ | ✅ | — | ✅ |
| Command palette (Ctrl+K) | vpanel, HVM-8 (HKVM mein nahi — verified) | ❌ | `public/js/palette.js` naya | P1 |
| Global search (VMs / users / actions) | Hex-Mc `GlobalSearchModal` idea | ❌ | header search | P1 |
| Wallpaper browser + apply | NKVM `/admin/wallpapers`, `/wallpapers/apply`, vpanel | ❌ | `public/wallpapers` + `views/admin/settings` | P1 |
| Blur (0–40px) + transparency (0–100%) sliders | NKVM, spec | ❌ | CSS vars `--panel-blur`, `--panel-transparency` | P1 |
| Fun Mode (confetti / success) toggle | spec §17, hosting-website (`react-confetti` idea) | ❌ | vanilla confetti (own code) | P1 |
| Tutorial / onboarding overlay | Hex-Mc `TutorialOverlay` idea | ❌ | LATER | LATER |
| Fullscreen toggle | HKVM ✅ | ✅ | — | ✅ |
| i18n English + हिंदी | NKVM (13), vpanel (22) idea; HKVM (3) | ⚠️ | `locales/en.json`, `locales/hi.json` | P1 |
| Reduced-motion support | spec §8 | ❌ | CSS `prefers-reduced-motion` | P0 |

### K. Business (Discord-centric)

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| **Coupon engine** (%, fixed, 100% free, expiry, usage limit, per-user, plan-specific, first-order-only) | nobitahost (`coupons` page, PHP), vpanel billingService — 🔁 idea | ❌ | `coupons` + `coupon_redemptions` tables, `services/coupons.js`, admin page | **P0** |
| **Giveaway codes** (N codes, one-time redeem, claim log) | — (pack mein nahi, apna) | ❌ | `coupons` with `batch_id` | **P0** |
| **Order record** (Discord ticket ID, product, cycle, price, status) | — (apna) | ❌ | `orders` table + `views/admin/orders.ejs` | **P0** |
| Plans (VPS / VDS / RDP-note, cycles, add-ons) | nobitahost plans (idea), spec §9 | ❌ | `plans` table | **P0** |
| Invoice text (GST fields, plain) | vpanel invoice (5 files) idea | ❌ | LATER (PDF) | P2 |
| Currency INR/USD | nobitahost, vpanel, hosting-website | ❌ | `settings.currency` | P2 |
| Free trial / free-period grant with reason | spec §9 | ❌ | `grants` table | P1 |
| Flash-sale / event banner + countdown | spec §9 (pack mein nahi) | ❌ | `events` table + banner | P1 |
| Referral code | — (pack mein nahi) | ❌ | LATER | LATER |
| Capacity-vs-revenue dashboard | spec §9 | ❌ | LATER | LATER |

### L. Marketing site (same app, built-in)

| Feature | Source | HKVM | Kahan add | Pri |
|---|---|---|---|---|
| Landing page (hero, features, FAQ) | apanel `landing.html`, hosting-website pages | ❌ | `views/public/landing.ejs` | P1 |
| Pricing page (product tabs, cycles, "slots left") | hosting-website `/vps` `/dedicated` `/webhosting` (idea) | ❌ | `views/public/pricing.ejs` | P1 |
| Blog / changelog | nobitahost blog (34 files), vpanel changelog | ❌ | LATER | LATER |
| ToS / privacy / refund pages | hosting-website legal pages | ❌ | static EJS | P1 |
| Cookie banner | nobitahost, hosting-website | ❌ | — | P2 |
| Trustpilot-style review stars | nobitahost | ❌ | — | SKIP |
| Anti-adblock notice | nobitahost, Thame | ❌ | — | SKIP |
| SEO (`sitemap.xml`, `robots.txt`, OG/JSON-LD) | spec §14 | ❌ | `/sitemap.xml` | P2 |

### M. AI assistant (owner/admin, OFF by default)

| Feature | Source | HKVM | Pri |
|---|---|---|---|
| Provider registry + automatic failover | free-claude-code (MIT — idea) | ❌ | LATER |
| Planner → executor → verifier + risk + confirmation | ZORIN-M4 (idea, no license) | ❌ | LATER |
| Tool allowlist by role + immutable action log | spec §8 | ❌ | LATER |
| Log doctor (boot/serial/cloud-init → cause + fix) | vpanel `aiLogService` idea, spec | ❌ | LATER |

### N. Desktop / Windows RDP

| Feature | Source | HKVM | Pri |
|---|---|---|---|
| Windows Server 2019/2022/2025 templates | `Template-main/images.json` | ⚠️ (list add karni hai) | P1 |
| virtio driver injection, unattended install, RDP ready probe | spec §1 | ❌ | P1 |
| Browser RDP (Guacamole-style) | spec §1 | ❌ | LATER |
| Linux Cloud PC (XRDP + XFCE, hardened) | XRDP-main (root/root default — FIX) | ❌ | LATER |

### O. Installer, DevOps, quality

| Feature | Source | HKVM | Pri |
|---|---|---|---|
| `install.sh` (deps, KVM check, first-run, systemd) | apanel `install.sh`, NKVM, vpanel | ❌ | **P0** |
| Docker + compose | apanel `Dockerfile`, NKVM `docker-compose.kvm.yml` | ❌ | P1 |
| GitHub Actions CI (lint → test → build) | ALTEX-CODE (CI example) | ❌ | P1 |
| Tests (Vitest/Jest + Supertest) | spec §16 | ❌ | **P0** |
| Auto-updater with backup + rollback | vpanel `updateService` | ❌ | LATER |
| `.env.example`, `SECURITY.md`, README | spec §16 | ❌ | **P0** |

---

## 3. Recipe: HKVM mein naya feature kaise add karein (har feature ke liye same steps)

1. **DB:** `app.js` ke init mein `CREATE TABLE IF NOT EXISTS` ya `ALTER TABLE ADD COLUMN` (idempotent). Kabhi `DROP TABLE` nahi.
2. **Service:** logic `services/<feature>.js` mein (command args argv array mein, shell nahi).
3. **Route:** `routes/<feature>.js` mein thin handler — validation → service → response.
4. **Auth:** role check (`admin` / `owner` / `user`) + ownership check (user sirf apni VM).
5. **View:** `views/admin/<page>.ejs` ya `views/users/<page>.ejs` + partial ka sidebar link.
6. **Style:** `public/css/admin.css` ke tokens use karo (naye colors nahi).
7. **Activity log:** har write action `activity_logs` mein.
8. **Test:** ek test jo feature ko pakde (supertest).
9. **Doc:** `docs/` mein 3-line note.

---

## 4. Build order (suggestion, 7 din ke andar)

1. **Day 1:** HKVM rename → `StarCloud`, S1–S4 security fixes, LICENSE copy, `.gitignore`, `.env.example`.
2. **Day 2:** 2FA, lockout, roles, activity log, maintenance mode.
3. **Day 3:** capability (KVM detect) + nested KVM toggle + capacity guard + block-without-KVM, OS templates seed (16).
4. **Day 4:** boot log, expiry/renew/suspend, emergency ops, public IP pool.
5. **Day 5:** coupons, giveaway codes, plans, orders (Discord ticket ID). (Custom price per order hata diya gaya hai.)
6. **Day 6:** webhooks + Discord bot page, security scan, sshx/tmate share, branding, i18n en/hi, premium motion/wallpaper sliders.
7. **Day 7:** tests, CI, install.sh, docs, QA on KVM server.

LATER: multi-node, migration, AI, Windows RDP, XRDP Cloud PC, sub-users, impersonation, referral.
