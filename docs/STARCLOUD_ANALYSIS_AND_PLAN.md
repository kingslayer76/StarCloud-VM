# StarCloud — Analysis & 7-Day Plan

> ⚠️ **UPDATED 2026-10-26:** Ye **purana 7-din wala plan** hai (branch `arena/410d8fbd-...`, October 15).
> User ke D-1 faisle ke baad ab "MVP split" nahi — saari features ek hi build me aayengi.
> Naya plan aur naye packs: `docs/00_DEEP_ANALYSIS_SUMMARY.md` (Section 11).

> Status: **Analysis complete — build abhi start nahi hua.**
> Date: 2026-10-15 · Target: 7 din (~21/22 Oct 2026) · Branch: `arena/410d8fbd-all-vm-panel`

## 0. Confirmed decisions (user ke jawab se)

| # | Decision | Matlab |
|---|---|---|
| D-1 | **Scope = MVP** | 7 din mein MVP; baaki features roadmap mein |
| D-2 | **Base codebase = HKVM (`hkvm-2`)** | StarCloud ko naye stack se shuru nahi karenge. HKVM ko hi extend/rename karke **StarCloud** banayenge. Analysis se nikle features HKVM ke andar add honge. Theme HKVM jaisa hi rahega. |
| D-3 | **Installer auto KVM-detect karega** | Host par `/dev/kvm` + `vmx/svm` check. |
| D-4 | **Host par KVM hai** → har VPS ke andar **nested KVM** available. | VPS create karte waqt HKVM jaisa **option**: "VPS ke andar VM (nested KVM) chahiye ya nahi". |
| D-5 | **Host par KVM nahi hai** → website se banne wale VPS mein **KVM nahi hoga**. | Installer ye saaf batayega. |
| D-6 | **Koi bhi apne KVM-capable VPS par is website ko install karke** apni marzi se VPS bana sakta hai. | Yahi ek "self-host" option hai. |
| D-7 | **Payment website par nahi** — Discord ticket se hoga (UPI). | Website mein payment gateway ya UPI upload nahi. Order = Discord ticket. |
| D-8 | **Coupons admin-controlled** — % discount, fixed, ya **100% free**; kab bhi create/disable kar sakte ho. | Giveaway/experiment ke liye bhi. |
| D-9 | **Signup = Open** (email verify ke saath). | — |
| D-10 | Theme: HKVM dark-black, **UI/UX premium + smooth** (motion spec). | — |
| D-11 | **Nested KVM default = ON** (host par KVM ho to). User VPS create karte waqt OFF kar sakta hai. | — |
| D-12 | **Host par KVM nahi → VPS create BLOCK** + saaf warning. Nested-KVM toggle sirf tab enable jab host par KVM ho. | Installer panel install hone dega, lekin VPS create ka button band rahega. |
| D-13 | **Email verification = toggle.** SMTP configure ho to ON (6-digit OTP email), nahi to auto-OFF with warning (HKVM jaisa). | Free SMTP: Brevo free plan **300 emails/day** ([brevo.com free SMTP](https://www.brevo.com/blog/free-smtp-servers/)). Gmail app-password bhi chal sakta hai (chhoti limit). |

> ⚠️ Pending clarification: user ne "Pi S" likha tha (payment ke baare mein) — samajh nahi aaya, confirm karna hai.

> Note: Email aur payment alag cheezein hain. Email OTP ke liye SMTP chahiye; payment Discord ticket se hoga, isliye koi payment gateway integration nahi.

Ye document do main files ko analyse karke banaya gaya hai:

1. `analyse VM Website detail.txt` — ~37,500 lines ka "A to Z" feature report (18 zip packs + Google Drive ke 2 packs ka scan).
2. `StarCloud VM MAKER WEBSITE MASTER-PROMPT.txt` — 1,181 lines ka **build spec** (Part 1 spec, Part 2 Hinglish explainer, Part 3 P0/P1/P2 features, Part 4 verified reference analysis).

---

## 1. Maine khud kya verify kiya (sirf padhna nahi, check bhi kiya)

| Claim | Verification | Result |
|---|---|---|
| HKVM theme tokens (`:root`) master prompt me hain | `(Nissalop22)hkvm-2.zip` extract karke `public/css/admin.css` ka `:root` padha | ✅ Exact match (bg `#000000`, card `rgba(18,18,18,.85)`, accent white `#ffffff`, etc.) |
| Fonts | `admin.css` me grep | ✅ `Inter` (UI) + `JetBrains Mono` (code/numbers) |
| Motion | `@keyframes` grep | ✅ `count-up`, `shimmer`, `ripple`, `toast-in/out`, `fadeInUp`, `pulse-glow`, `status-pulse`, `skeleton-wave`, `soft-bounce`, etc. ~30 `backdrop-filter` uses |
| HKVM route count (87) | `app.js` me `app.get/post/put/delete` count | ✅ 87 (`app.js` = 4,912 lines, single file) |
| HKVM license system (analysis file me "HMAC-SHA256 license" likha hai) | `licenses.js` padha | ⚠️ **Galat.** Free edition me license middleware **no-op** hai (`// Completely silent — no license checks injected`, `verifySignedResponse() { return true; }`). Iska pattern **copy mat karna.** |
| HKVM zip me secrets | zip ke andar dekha | ⚠️ `.env` aur `data/hkvm.db` (+ wal/shm) zip ke andar hain. `.env` me sirf `PORT`, `HKVM_DATA_DIR`, `PANEL_NAME`, `DEFAULT_LOGO_URL` hain (koi password nahi), lekin repo me DB file committed hai — review karna chahiye. |
| Mpanel-main.zip & Nobita-Cloud-main.zip | Google Drive me search kiya | ✅ Mil gaye (Mpanel 27.9 MB, Nobita-Cloud 34.9 MB) — ❌ **Dono kholne nahi ja sake** (25 MB extraction cap; `download_file` base64 me poora zip context me dump karega). Inka analysis purani scan se aaya hai, **unverified** hai. Nobita-Cloud ka analysis khud file me "inferred" likha hai. |
| Sandbox me KVM / QEMU / Docker | `/dev/kvm`, `qemu-system-x86_64`, `docker` check | ❌ Nahi hain. Sandbox: 2 vCPU, ~3.9 GB RAM, Debian 12. **Real VM create/boot yahan test nahi ho sakta** — aapke KVM server par hi test hoga. |
| Outbound network | Allowlist | Sirf `github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org` etc. **Razorpay API, Ubuntu/Debian cloud-image mirrors, Let's Encrypt yahan se reach nahi honge.** |

---

## 2. StarCloud kya hai (spec ka short version)

**StarCloud** — self-hosted **VPS / VDS / Windows RDP** selling + control panel website.

- **Design:** HKVM pure-black glassmorphism (white accent, Inter + JetBrains Mono), logo/banner repo me already hain.
- **Stack (spec):** Node.js 20 + Express + EJS + better-sqlite3 + Socket.IO + xterm.js + noVNC.
- **Hypervisor:** auto-detect — `KVM` (full speed) → `TCG` (software, slow) → `LXC`/`Docker` (sirf Bot Hosting). Installer kabhi fail nahi hona chahiye.
- **Hard rule:** VPS/VDS hamesha **real KVM VM** (Proxmox jaisa). LXC/LXD sirf cheap **Bot Hosting** product me.
- **Business:** Razorpay/UPI primary, coupons (100% free / % / fixed), giveaway codes, half-price events, custom price per invoice, GST invoice, reseller (later).
- **Customer features:** 5-step VM create wizard, start/stop/restart/reinstall, noVNC + SSH console, file manager, snapshots/backups, port-forward (NAT) + IP pool, 2FA, API keys.
- **Admin/Owner:** nodes, users, IP pool, plans/coupons, revenue dashboard, activity/audit logs, safety snapshot, watchdog, emergency ops.
- **AI assistant:** Gemini / OpenAI / Groq / Ollama switch, tool-allowlist by role, destructive actions ke liye confirm gate, OWNER-only destructive tools. **AI default OFF.**
- **Languages:** English + हिंदी (UI).
- **Marketing site:** same app ke andar (landing, pricing, blog, status page, ToS/privacy).

---

## 3. Donor mapping — kis repo se kya lena hai

| Donor | Kya lena hai | Kya NAHI lena |
|---|---|---|
| **HKVM (hkvm-2)** | Theme tokens, sidebar/header/breadcrumb, login page, badges, buttons, VM create advanced options (CPU topology, SMBIOS, bridge/NAT/static/IPv6) | License stub, hardcoded remote calls, single 4.9k-line `app.js` |
| **VPanel Pro (v3.1.1)** | Architecture: services/routes split, `root_admin` + "last admin can't be suspended" guard (owner base), billing/audit/storage/template/update services | MongoDB dependency (spec me SQLite chahiye) |
| **NKVM v1.0** | Blur/transparency sliders, wallpaper browser, hardware presets, deployment blueprint card, boot-log tabs | — |
| **HVM-8** | Node circuit breaker, port pool, expiration/renew, emergency ops, webhooks, API keys, OS icon manager | **Hardcoded license server IP** (`18.176.215.109`) — bad practice |
| **AKVM (apanel-main)** | Public IPv4 pool, NAT-vs-public per VM, cloud-init root+sudo+FS resize, sshx/tmate share links, security scan, Discord OAuth | — |
| **Template-main** | `images.json` — 16 OS templates (Alma 8/9/10, Debian 11/12/13, Rocky 8/9/10, Ubuntu 22.04/24.04/25.10/26.04, Windows Server 2019/2022/2025) | Hotlink blindly — checksum verify karke self-host option rakhna |
| **hosting-website-main (Nova)** | Marketing page structure (`/`, `/vps`, `/dedicated`, `/webhosting`, `/discord`, legal), animation vocabulary (confetti, snow, globe, dotted map) | Next.js stack (spec: no second deployment) |
| **nobitahost-wab-main** | Blog + markdown, mailer, otplib 2FA, settings, validation | Cloudflare/YouTube/GitHub integrations (MVP ke baad) |
| **XRDP-main** | Linux Cloud PC (XFCE + XRDP) idea | `root/root` default password, `--privileged` — hardening mandatory |
| **free-claude-code** | Provider registry + automatic failover pattern (AI) | Coding-agent features |
| **ZORIN-M4** | `intent → planner → executor → verifier` + `risk` + `confirmation` (AI agent loop) | Voice features |
| **Thame-main** | Cookie banner, review stars, credit-section ideas | Laravel/Livewire code (Pterodactyl theme) |
| **Hex-Mc** | Pterodactyl-style API split (`/api/client`, `/api/application`), JWT/CORS/upload hardening | Minecraft (OUT OF SCOPE) |
| **MYRAA** | Voice + screen vision ideas (P2) | Desktop control, 3D character (OUT OF SCOPE) |
| **ALTEX-CODE** | GitHub Actions CI example | — |
| **Mpanel / Nobita-Cloud (Drive)** | ⚠️ Verify nahi ho sake — zip repo me daalo ya skip karo | — |

---

## 4. Spec me risks / conflicts (honest)

1. **Scope bahut bada hai.** Master prompt me 11 phases + 5b + marketing site + billing + AI + reseller + affiliate + multi-node. **7 din me sab "production + no stubs" ke saath build karna realistic nahi hai.** Recommended: **MVP** (neeche Section 5).
2. **"No stubs" vs environment.** Real VM ops ke liye **KVM wala Ubuntu 22.04/24.04 server** chahiye. Ye sandbox me nahi hai. Code likha ja sakta hai, lekin end-to-end verification aapke server par hi hogi.
3. **Owner tier.** Spec me `users.is_visible = 0` (owner user list me hidden) + "Remote Support Mode" hai. Spec khud bolta hai: **documented, consent-based, audit-logged** hona chahiye, koi hidden/magic access nahi. Main ye hi implement karunga aur `SECURITY.md` me saaf likhunga. Owner hidden rakhna ho to ye customer ko disclose karna hoga.
4. **Windows RDP.** Windows ISO/license customer ka ya aapka responsibility hai. Panel sirf BYOL note store karega; Windows image ship nahi karega.
5. **sshx / tmate share links.** Ye third-party relay se shell expose karte hain. Spec ke hisaab se opt-in + time-boxed + revocable + audit rakhenge.
6. **Payments.** Razorpay live keys + KYC aapke account se aayenge. Sandbox se Razorpay API reachable nahi. MVP me **manual UPI + screenshot approval** + **coupons/giveaway** se business shuru ho sakta hai.
7. **Public selling = fraud risk.** Signup verification, Turnstile, disposable-email block, abuse heuristics — ye MVP me basic hona chahiye.
8. **Repo hygiene.** Repo me 18 zip packs committed hain (kuch me `.env` + SQLite DB). StarCloud ka code `starcloud/` folder me rakhenge; reference zips ko hum delete nahi karenge jab tak aap na kaho.

---

## 5. Proposed 7-day MVP (Day 1 = 15 Oct, Day 7 = 21 Oct) — **HKVM base par**

Code location: HKVM codebase ko repo mein `starcloud/` folder mein copy karke rename karenge (original zip untouched rahega). Stack HKVM ka hi rahega (Node + Express + EJS + SQLite); spec ke Socket.IO / xterm / noVNC HKVM ke console code ke saath integrate honge.

| Day | Kaam | Deliverable |
|---|---|---|
| **D1** | HKVM ko `starcloud/` me copy + rename (StarCloud branding, logo/banner), HKVM ka 4.9k-line `app.js` ko modules me todna (routes / services / lib), license stub hatana, `.env.example`, CI skeleton | HKVM rename ho ke chal raha ho |
| | **Theme** tokens (HKVM) + premium motion layer: sidebar, sticky header (breadcrumb, search, Online dot, notifications, fullscreen, avatar), login (animated grid, shake, show/hide password), glass cards, buttons/badges | Dark-black premium UI |
| **D2** | Auth: HKVM users + roles (`owner` / `admin` / `user`), owner first-run via `.env`, open signup + email verify, reset password, 2FA TOTP + backup codes, login lockout, activity logs | Login → dashboard flow |
| **D3** | **Installer KVM-detect** (`installer.sh`): host `/dev/kvm` + `vmx/svm` check → `host_capabilities`; Capability Report page; capacity guard; OS templates (16 from `Template-main`); VPS create wizard (HKVM ke 5-step) + **"nested KVM ON/OFF" option** (host KVM ho to hi dikhega) | Installer + wizard |
| **D4** | VM ops (QEMU/KVM): create (qcow2 + cloud-init), start/stop/restart/force-stop, status, live stats (Socket.IO), console (xterm SSH + noVNC), KVM-less host par honest message | VM ops (KVM server par verify) |
| **D5** | Plans & pricing page (VPS / Windows RDP-note), **Discord ticket order flow** (website par payment nahi), **coupons** (admin: %, fixed, 100% free, expiry, usage limit, enable/disable), giveaway codes (N codes), basic invoice text | Order → coupon → VM |
| **D6** | Admin: users, VMs, nodes (single), IP/port pool (NAT), tickets (lite), notifications, owner console (read-only + emergency stop-all), i18n en/हिंदी (UI strings), motion pass + `prefers-reduced-motion` | Admin + owner pages complete |
| **D7** | Tests (Vitest/Jest + Supertest), GitHub Actions CI, README + `SECURITY.md` (owner tier/telemetry honest), demo seed mode, polish & handover | Deployable MVP |

### Deferred (Phase 2 / roadmap — MVP ke baad)
AI assistant (ZORIN-style agent loop) · Windows RDP web client (Guacamole) · VDS CPU pinning/hugepages · Bot Hosting (LXD/egg/GitHub deploy) · Linux Cloud PC (XRDP hardened) · Razorpay automation + subscriptions · reseller/white-label · affiliate · multi-node + live migration · offsite backups (S3) · public status page · PWA push · Prometheus.

---

## 6. Open items

1. ~~Server kaisa hai~~ → Installer auto-detect karega (D-3 to D-6).
2. ~~Payments~~ → Discord ticket (D-7). "Pi S" wali baat clarify karni hai.
3. ~~Signup~~ → Open (D-9).
4. **VPS create par nested-KVM option ka default** (ON / OFF) — confirm karna hai.
5. **KVM-less host par VPS**: TCG (slow software mode, warning ke saath) allow karein ya block?
6. Domain (`{{DOMAIN}}`) aur owner email (`{{OWNER_EMAIL}}`) — placeholder rakhenge, baad mein bataye.
7. Mpanel + Nobita-Cloud zip repo me upload kar sakte ho? (Warna ye dono skip honge.)
8. HKVM zip ke andar `.env` aur `data/hkvm.db` hain — StarCloud ke copy me ye saaf kar dene chahiye (sirf code rahega). Theek hai?

---

## 7. Extra features — suggestions (aap approve karo to add honge)

Priority: **P0** = MVP mein · **P1** = MVP ke turant baad · **P2** = roadmap

| Priority | Feature | Kya karega |
|---|---|---|
| P0 | **Coupon engine** | Admin % / fixed / 100% free; expiry; usage limit (total + per user); plan-specific; enable/disable. |
| P0 | **Giveaway codes** | N codes ek saath banao (Discord/YouTube giveaway ke liye); har code ek baar redeem. |
| P0 | **Discord order ticket** | "Buy" button → Discord ticket khulega (webhook/link). Order status website par dikhega. |
| P0 | **Discord notifications** | Naya user, naya order, VM create/suspend → Discord webhook. |
| P0 | **Email OTP (toggle)** | Verify + password reset; SMTP off ho to auto-skip. |
| P1 | **Free trial / grant** | Admin kisi user ko X din free VPS de sake (reason logged). |
| P1 | **Event / flash-sale banner** | "Diwali 50% off 14–18 Nov" — auto apply + countdown banner. |
| P1 | **VPS expiry + reminder mail** | Expiry se pehle email/Discord reminder; expire par auto-suspend. |
| P1 | **Maintenance mode** | Ek switch se site par "maintenance" page. (HKVM mein already hai — reuse.) |
| P1 | **Ticket support (lite)** | Website se support ticket, admin reply, VM se link. |
| P1 | **Login lockout + IP ban** | Brute-force se bachav (HKVM mein basic hai — strengthen). |
| P2 | **Referral / affiliate** | Referral code se commission ledger. |
| P2 | **Status page + changelog** | Public "system status" + update list. |
| P2 | **Disposable-email block** | Fake/temp-mail signup rokna (fraud control). |
| P2 | **Hindi UI** | en + हिंदी toggle (MVP mein sirf menu/labels, baad mein full). |

**Free-hosting notes:** Email OTP ke liye Brevo free (300/day) kaafi hai shuru mein. Discord notifications/tickets ke liye sirf webhook URL chahiye — koi paid service nahi.

---

## 8. Latest update (user ke jawab ke baad)

| Item | Status |
|---|---|
| Mpanel-main.zip + Nobita-Cloud-main.zip | ❌ **Drop.** Repo mein upload nahi ho sakte (size bahut bada). Inka analysis is plan mein shamil nahi hai. |
| Saari uploaded files | ✅ `Analyse-File/` folder mein move ho gayi hain (content bina change kiye). Ye folder sirf reference ke liye hai — isme kuchh edit nahi hoga. |
| `docs/` | Ye plan aur analysis ka folder hai. |
| HKVM license | ✅ `hkvm-2` ka `package.json` me **MIT** license hai → base ke roop mein use karna legal hai (copyright notice rakhna hoga). |
| Hidden / chhupi cheezein in source packs | Owner ne bataya ki ye sirf analysis ke liye hain. StarCloud mein hidden access, magic password, ya license-bypass nahi jayega (ye spec ka hard rule hai). |
| Naya StarCloud copy | HKVM ka `.env` aur purana `hkvm.db` StarCloud mein **nahi** jayenge — fresh database banega. |

### Analysis-File mein kya hai
- `(Nissalop22)HVM-8.zip`, `(PapiaGamerz)HVM-V8.zip`, `(Nissalop22)Svm-v6.zip` — LXC panels (reference)
- `(Nissalop22)hkvm-2.zip` — **THEME + BASE** (MIT)
- `(Nissalop22)NKVM_Panel_v1.zip`, `apanel-main.zip`, `vpanel-pro-main.zip` — KVM panels (features reference)
- `(Nissalop22)Hex-Mc-main.zip` — Minecraft (out of scope)
- `(Nissalop22)NR-PROTECTION-V1.0.zip` — security layer reference
- `Template-main.zip` — OS templates (16)
- `Thame-main.zip`, `hosting-website-main.zip`, `nobitahost-wab-main.zip` — marketing/website reference
- `XRDP-main.zip` — Linux Cloud PC reference
- `ZORIN-M4-source.zip`, `free-claude-code-main.zip`, `MYRAA-Source-Code-1.5.2.zip` — AI reference (MYRAA sirf reference)
- `ALTEX-CODE-main.zip` — CI reference
- `StarCloud-Logo.png`, `StarCloud-Banner.png` — brand assets
- `StarCloud VM MAKER WEBSITE MASTER-PROMPT.txt`, `analyse VM Website detail.txt` — spec + analysis

## 9. User decisions (2026-10-17) — ye sab se upar maante hain

Short forms ka use mat karo. Har term ka full form likho. (User ko short form samajh nahi aata.)

1. **Scope**: Saari features ek saath install hongi. Koi bhi part chhoda nahi jayega. 7 din ki deadline "zaroori nahi" hai, lekin jaldi karni hai. "MVP" ka matlab = Minimum Viable Product (sabse chhota version jo kaam kare). Priority 0 aur Priority 1 dono isi build mein aayenge.
2. **Discord**: sales aur support Discord par manual chalega. Webhook ka sawal abhi clear nahi hai. Confirm karna hai.
3. **RDP / Windows**: User ne RDP hatane ko kaha. Is turn ke baad sirf Virtual Private Server (VPS) aur Virtual Dedicated Server (VDS) par kaam hoga. RDP (Remote Desktop Protocol) aur Windows guest abhi scope se bahar hain. Confirm karna hai.
4. **"Pi S"**: meaning abhi clear nahi hai. User ne full form maanga hai.
5. Custom price per order: removed (user ne kaha).
6. Har VPS/VDS create form mein custom CPU model option same HKVM style mein hona chahiye (animations aur style same).
7. Nested KVM: host par KVM ho to default ON, toggle ke saath. Host par KVM na ho to VPS create block.
8. Naye HKVM inventory ke liye `docs/HKVM_FEATURE_INVENTORY.md` dekhein.
