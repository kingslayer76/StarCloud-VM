# HKVM — Verified Feature Inventory (kya hai, kya nahi hai)

> ℹ️ **UPDATED 2026-10-26:** Ye inventory abhi bhi sach hai, lekin code aaj badal gaya hai.
> Aaj ke fixes ke baad `app.js` = 4,968 lines / **90 routes**, KVM Acceleration toggle ab sach me kaam karta hai,
> VM password min 8 required hai, aur Discord ke 2 missing GET routes add hue.
> Poora update: `docs/00_DEEP_ANALYSIS_SUMMARY.md`.

> Ye document `app.js`, `views/` aur `public/` ko line-by-line grep/read karke banaya gaya hai.
> Jo cheez verify nahi hui, wo yahan nahi likhi.
> Legend: ✅ = poori tarah kaam karta hai · ⚠️ = UI hai lekin backend adhoora / sirf settings form · ❌ = nahi hai

## 1. Ek nazar mein

| Area | Status |
|---|---|
| VM create (KVM/QEMU, cloud image, cloud-init) | ✅ |
| VM start / stop / restart / reinstall / delete / edit | ✅ |
| Custom CPU model (`custom_cpu_name`) | ✅ |
| Nested KVM (explicit toggle) | ❌ (implicit only, see §3) |
| Web SSH terminal (xterm) | ✅ |
| QEMU serial console | ✅ |
| Snapshots (basic) | ⚠️ |
| Logs (VM logs) | ✅ |
| Live stats (CPU / RAM / network) | ✅ route `/api/vms/:id/stats` (data source verify karna) |
| ISO attach / detach | ✅ |
| OS templates (catalog + custom + cache) | ✅ |
| Users admin (CRUD, role, Discord info) | ✅ |
| Discord OAuth login / link / unlink | ✅ |
| Discord bot settings (token, guild, auto-role) | ⚠️ settings save hote hain, **koi bot nahi chalta** |
| Discord webhook | ❌ **HKVM mein webhook code nahi hai** |
| File manager (browse / upload / download / edit) | ❌ **HKVM mein nahi hai** |
| Notifications (bell) | ⚠️ header mein bell hai, backend nahi |
| Command palette (Ctrl+K) | ❌ |
| Fullscreen toggle | ✅ |
| Stop All VMs (Danger Zone) | ⚠️ client-side loop, server endpoint nahi |
| Active sessions list | ⚠️ button hai, route nahi |
| Maintenance mode | ❌ |
| 2FA / TOTP | ❌ |
| Windows guest / RDP | ❌ |
| Coupons / billing / orders | ❌ |
| Backups (real) | ❌ |
| Cron / schedules | ❌ |
| Port forwarding UI | ❌ (NAT SSH port hai, custom port UI nahi) |
| Public IPv4 pool | ❌ (sirf single static IP cloud-init) |
| Cloudflare | ⚠️ sirf DNS dropdown (1.1.1.1), Cloudflare API integration nahi |
| i18n (Hindi) | ❌ (sirf English) |

## 2. Admin side — pages aur kya karta hai

| Page (file) | Kya hai (verified) |
|---|---|
| `views/admin/dashboard.ejs` | Admin dashboard, `/api/admin/dashboard` |
| `views/admin/vms.ejs` | VM list (`/api/admin/vms`) |
| `views/admin/vm-create.ejs` | **Create wizard — 5 steps** (`wizard-step-item` x5). Isme ye options hain: OS template, CPU model + custom CPU name, RAM/CPU/disk, machine type, SMBIOS, network type, DNS, ISO, `enable_kvm` (default checked), extra QEMU args. (Kaunsa option kis step mein hai, ye step-by-step verify nahi kiya) |
| `views/admin/vm-detail.ejs` | 5 tabs: Overview, Network, Hardware, Snapshots, Logs |
| `views/admin/vm-edit.ejs` | Edit CPU/RAM/disk/password (`PUT /api/vms/:id/edit`) |
| `views/admin/vm-console.ejs` | Serial/QEMU console (WebSocket) |
| `views/admin/vm-ssh.ejs` | Web SSH (xterm) — `/api/ssh/connect`, `/api/ssh/command` |
| `views/admin/users.ejs`, `users-create.ejs`, `users-edit.ejs` | User CRUD |
| `views/admin/templates.ejs`, `templates-add.ejs`, `templates-edit.ejs` | OS template CRUD + download + cache |
| `views/admin/settings.ejs` | Tabs: **General, Branding, Security, System, Discord, About**. Danger Zone: **Stop All** |

### Settings tab — detail
- Fields (IDs verified): panel title, panel description, panel version, site name, site description, site icon URL, session timeout, max sessions (`setting_*` IDs). Tabs: `tab-general`, `tab-branding`, `tab-security`, `tab-system`, `tab-discord`, `tab-about`.
- **Security tab**: Change Admin Password (modal `changePasswordModal`), Active Sessions (button — route nahi ⚠️)
- **System tab**: live stats block (`systemLiveStats`)
- Max sessions / session timeout ka server-side enforcement verify karna baaki hai
- **Discord**: Enable Discord Login, OAuth credentials (Client ID, Secret, Redirect URI), **Bot Settings (Bot Token, Guild ID, Auto Role ID)** ⚠️ — ye values DB mein save hoti hain (`discord_settings`), lekin `app.js` mein inka koi use nahi (bot connect code nahi hai)
- **Danger Zone**: **Stop All VMs** — `views/admin/settings.ejs` ka `stopAllVMs()` `/api/vms` fetch karke har VM par `/api/vms/:id/stop` POST karta hai ⚠️

## 3. VM create — advanced options (verified)

| Option | Detail |
|---|---|
| CPU model (`cpu_model`) | 10 models: Host CPU (Native), Maximum Features, QEMU 64-bit, KVM 64-bit, Core 2 Duo, Core i7, Skylake, Cascade Lake, Opteron, EPYC. Default `host` |
| **Custom CPU name** (`custom_cpu_name`) | Checkbox → text field. `-cpu <model>,model-id=<name>` banta hai. Example: `Intel-Xeon-E5-2680v4` |
| Machine type (`machine_type`) | 19 machine types (`pc`, `q35` etc.) |
| SMBIOS | Manufacturer (9 options, default `QEMU`), Product, Board name, custom manufacturer |
| Network type | **NAT (User mode, auto port forward)** · **Static Public IPv4 (bridge)** |
| DNS | Google, Cloudflare, Quad9, OpenDNS, Custom |
| ISO | `ISO_DIR` se list, attach/detach |
| Acceleration | `-machine <type>,accel=kvm:tcg` + `-enable-kvm` hardcoded (`app.js` ~L3987). Agar KVM available nahi ho to QEMU TCG (software) fallback karta hai |
| Nested KVM | **Explicit toggle NAHI hai.** `cpu_model=host` ke saath host ke `vmx/svm` flags pass ho sakte hain, lekin ye automatic nahi hai aur user ko dikhta nahi. ❌ |
| Extra QEMU args | Free text (`extra_args`) |

## 4. User (customer) side

| Page | Kya hai |
|---|---|
| `views/users/dashboard.ejs` | User dashboard |
| `views/users/vms.ejs` | Apni VMs ki list |
| `views/users/vm-detail.ejs` | Tabs: Overview, Network, Hardware, Snapshots, Logs (switchTab) |
| `views/users/vm-console.ejs` | Serial console |
| `views/users/vm-ssh.ejs` | Web SSH (xterm) |
| `views/users/profile.ejs` | Profile + password change (`/api/user/profile`, `/api/user/password`) |
| `views/users/login.ejs`, `404.ejs` | Login, 404 |

**Customer ke paas File Manager nahi hai** (❌). Customer sirf web SSH se VM mein kaam kar sakta hai.

## 5. Routes (grep se verified; `app.get/post/put/delete` ki list)

- **Auth**: `/api/login`, `/api/logout`, `/api/auth/check`, `/logout`, `/login`, `/profile`, `/dashboard`, `/vms`
- **Discord**: `/api/discord-enabled`, `/api/discord-auth-url`, `/auth/discord/callback`, `/api/link-discord-account` (POST), `/api/unlink-discord-account` (POST), `/api/discord-account-info`, `/api/admin/discord-settings` (GET/PUT)
- **Templates**: `/api/os-templates`, `/api/admin/templates` (GET/POST), `/api/admin/templates/:id` (PUT/DELETE), `/api/admin/templates/builtin/:key` (PUT), `/api/admin/templates/:key/download` (POST), `/api/admin/templates/cache/info` (GET), `/api/admin/templates/cache/clear` (POST)
- **Create helpers**: `/api/cpu-models`, `/api/smbios`, `/api/network-types`, `/api/dns-providers`, `/api/iso-list`
- **VM**: `POST /api/vms` (create), `GET /api/vms`, `GET /api/vms/:id`, `POST /api/vms/:id/start|stop|restart|reinstall`, `DELETE /api/vms/:id`, `GET|PUT /api/vms/:id/edit`, `GET /api/vms/:id/stats`, `GET /api/vms/:id/logs`, `GET|POST /api/vms/:id/snapshots`, `POST /api/vms/:id/iso/attach|detach`, `GET /api/vms/:id/iso/status`
- **Console**: `GET /api/vms/:id/console`, `POST /api/vms/:id/console/command`, `POST /api/ssh/connect`, `POST /api/ssh/command`, plus `ws` WebSocket server (`app.js` L54)
- **Admin**: `/api/admin/users` (GET/POST, GET/PUT/DELETE `/:id`), `/api/admin/users/:id/discord-info`, `/api/admin/vms`, `/api/admin/dashboard`, `/api/settings` (GET/PUT), `/api/settings/:key` (POST)
- **User**: `/api/users/list`, `/api/user/profile` (GET/PUT), `/api/user/password` (PUT)
- **License (no-op stub)**: `/license_activation`, `POST /api/license/activate`

## 6. Database (8 tables)

`users`, `vms`, `vm_logs`, `vm_snapshots`, `os_templates`, `settings`, `discord_settings`, `user_discord_accounts`.
- `discord_settings` mein `bot_token`, `guild_id`, `auto_role_id` columns hain (⚠️ unused).
- `settings` table key-value hai (columns `setting_key`, `setting_value`). Panel ki settings (title, description, version, site name, icon, session timeout, max sessions) isi mein save hoti hain.
- `vms` table ke baad ke migrations (app.js ~L430–460): `custom_cpu_name`, `machine_type`, `board_name`, `product_name`, `custom_smbios_manufacturer`, `dns_primary`, `dns_secondary`, `iso_attached`, `boot_from_iso`, `bridge_device`.

## 7. Security issues (verified, fix pehle)

| # | Issue | Kahan (line) | Fix |
|---|---|---|---|
| S1 | Default admin `admin/admin` auto-create | `app.js` ~L564–569 | First-run setup, owner email/password `.env` se |
| S2 | Hardcoded session secret `hopingboyz-secret-key-change-in-production` | `app.js` ~L326 | `SESSION_SECRET` env, startup par check |
| S3 | Cookie `secure: false` | `app.js` ~L329 | `secure` (prod), `httpOnly`, `sameSite` |
| S4 | Shell injection risk (`execSync` + template string + disk path) | `app.js` ~L2059–2094, 2517–2525, 2868–2883, 3897–3910 | `execFile`/`spawn` argv array |
| S5 | Default VM password: `custom_password || template.password` (`ubuntu`/`ubuntu`, `debian`/`debian`, ...) and fallback `'password'` | `app.js` ~L992, 1623, 2390, 2412, 2646, 2667, 3442, 3535 | Har VM ka random strong password generate, one-time show |
| S6 | Login rate limit / lockout nahi | — | `express-rate-limit` + lockout table |
| S7 | CSRF protection nahi | — | CSRF token middleware |
| S8 | Input validation (zod) nahi | — | Har route par validation |
| S9 | `app.js` 4,912 lines (monolith) | — | `routes/`, `services/`, `lib/`, `drivers/` |

## 8. Jo cheez HKVM mein NAHI hai (aap ne jo mention kiya tha, uska sach)

| Aapne bataya | Sach (verified) |
|---|---|
| "Webhook settings mein milega" | ❌ Webhook code koi nahi. Settings mein **Discord Bot Settings** hai (token/guild/auto-role) jo save hota hai lekin koi bot nahi chalta. Real webhook (Discord notifications) naya banana hoga. |
| "File manager HKVM mein hai" | ❌ Koi file manager route ya view nahi. File manager **apanel (AKVM)** mein hai (`/vm/<id>/files/*`, 16 routes). Usko idea lekar HKVM mein banayenge. |
| "Nested KVM HKVM mein hai" | ⚠️ Explicit toggle nahi. `cpu=host` se implicitly pass ho sakta hai. Explicit toggle banayenge. |
| "Custom CPU model HKVM mein hai" | ✅ Haan. `custom_cpu_name` + 10 CPU models. |
| "RDP / Windows" | ❌ Koi Windows template ya RDP support nahi. |
| "Notifications" | ⚠️ Bell UI hai, backend nahi. |

## 9. Packs mein file manager / notifications / webhooks kahan hain (verified)

- **File manager**: `apanel-main` (`/vm/<id>/files`, `list`, `mkdir`, `delete`, `rename`, `read`, `write`, `upload`, `download`) — ✅ routes verified. NKVM (`files.ejs`, agent based) bhi.
- **Webhooks**: `vpanel-pro-main` (`pluginManager` — Discord rich embeds, signed webhooks), `HVM-8` (`/webhooks`, `/webhooks/<id>`) — ✅ verified.
- **Notifications**: `apanel-main` (`/notifications`, `/notifications/read/<id>`, `/notifications/read-all`) — ✅ verified.
