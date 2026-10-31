# StarCloud Panel: completed, verified, pending (2026-10-31)

Ye file user ke "sab features ki list" request ke liye hai. Detail `docs/01_FEATURE_STATUS_AND_BATCHES.md` mein hai.

## A. Ho chuka hai (code mein hai)

| Area | Kya hai | Kaise check hua (sandbox) |
|---|---|---|
| Branding | "StarCloud Panel" (S, C, P capital) har jagah; "V2.0 STARCLOUD PANEL" hata diya; sidebar/login par "Starcloud" nahi | Rendered HTML scan: 0 matches (admin + user pages) |
| Login welcome | 2 lines, English: "Welcome to StarCloud Panel. Manage your virtual machines in one place." + "Inspired by HopingBoyz · Built by KingSlayer" | Login HTML |
| Logo | Aapka `StarCloud-Logo.png` (512px `public/images/logo.png`), generated logo hata diya | `/images/logo.png` 200 |
| Dark theme only | Light/theme switch nahi; "shape" option nahi | Header code + HTML |
| Admin sidebar | My Profile, My Virtual Machines hain; "Back to User Panel" nahi | Admin HTML |
| Badges "1" | Sidebar mein koi count badge nahi | Admin HTML |
| Operations | Host virtualization → System Info; Maintenance, Emergency control, Audit log → Settings > General | Settings HTML (tab-general / tab-system) |
| System Settings | Click par General tab khulta hai (Discord nahi) | Code default `general` |
| OS templates | 17 built-in (list neeche), emoji ke saath | `/api/os-templates` = 17 |
| Installer | Default: sare OS download (`--os-images none` se skip); animated multi-color logo | Pehle ke pty/pyte tests |
| VM create password | 8-char minimum hata diya (sirf required) | Create route + form |
| CPU model | Intel Xeon (Broadwell, Skylake, Cascade Lake, Ice Lake, Cooper Lake, Sapphire Rapids, Emerald Rapids) + AMD EPYC (Naples, Rome, Milan, Genoa); sirf wahi dikhte hain jo host QEMU support karta hai; search box; custom CPU name bhi | `/api/cpu-models` filter test; jsdom search test 8/8 PASS |
| CPU bug fix | Preset CPU ka key (`xeon-cascadelake`) QEMU ko ja raha tha (VM start fail hota). Ab QEMU ka model naam (`Cascadelake-Server`) jata hai | Launch args log (fake QEMU) |
| VM create validation | Login username aur hostname server par validate (cloud-init injection rokne ke liye) | Code |
| Cloud-init | Password YAML-safe (pehle `#`, `: ` wale password galat parse hote the); custom user case mein root ka password ab wahi chosen password hai (pehle hardcoded `password` tha) | YAML parse test: 14/14 (root/custom x 7 passwords, NAT + static) |
| SSH (browser) | Panel → VM SSH WebSocket. Sahi password, saved-password fallback, galat password message, VM stopped message | Real OpenSSH (sandbox sshd) PASS; stub guest PASS |
| Console (browser) | Serial console: log replay + live + input | Fake serial socket PASS |
| File manager backend | list, read, write, mkdir, rename, chmod, upload (300 KB + SHA match), download, delete, root guard, relative-path guard | Real OpenSSH: 16/16 PASS |
| File manager UI | Default folder, listing render | jsdom PASS |
| Ownership | Customer sirf apni VM; admin sab | Earlier test PASS |
| Audit, maintenance, emergency, capacity, KVM lock, duplicate name, SSH port check | Pehle se | Earlier tests PASS |

**Note:** Screenshots jo aapne bheje the wo purane build (Oct 30, 18:20–19:20 IST) ke the. Usme SSH UI (`Connecting to SSH Server`) aur Operations page purane the. Current branch mein wo change ho chuke hain. Naya code chalane ke liye `git pull` + panel restart zaroori hai.

## B. Verify nahi ho paaya (real hardware chahiye)

1. Real VM boot (KVM host par). Sandbox mein `/dev/kvm` nahi hai.
2. Cloud-init first boot ke baad real Ubuntu/Debian VM mein SSH login. Sandbox mein cloud image hosts reachable nahi.
3. Real OS image download (cloud hosts sandbox se band hain).
4. Installer real Debian/Ubuntu VPS par (systemd, apt, libvirt).
5. KVM ON path mein `-cpu <model>` (host KVM par). Sandbox mein sirf TCG (`qemu64`) path test hua.

**Purani VMs:** jo VM is fix se pehle bane hain, unka cloud-init purana hai. Root password unme `password` ho sakta hai (custom username wali VMs). Unhe delete karke naya banayein ya VM ke andar `passwd root` chalayein.

## C. Pending: abhi nahi bana

### Batch 1 (baki)
- Per-VM security scan (miner, failed logins, cron)
- Discord webhook field (settings mein)
- CPU model select ki HKVM-style animation/tilt
- Installer real test (Debian + systemd)
- Real QEMU boot test
- `genisoimage`/cloud-localds check installer mein (sandbox mein missing tha)
- Edit par seed fail hone par warning (edit ab bhi 200 deta hai)

### LXD (user ki request: VPS ke andar `lxd init` chale)
- Sold product hamesha KVM VM rahega (HARD RULE). LXD guest ke andar chalega.
- Abhi nahi bana: LXD install + `lxd init --auto` cloud-init se, LXD-ready badge, quickstart box.
- Sawaal: neeche dekhein.

### Gentoo / other OS
- Gentoo: admin custom URL se add kar sakta hai, par official image UEFI hai. UEFI boot support abhi nahi hai.
- Slackware: skip (official cloud image nahi).

### Batch 2 (VM lifecycle, monitoring, promo) — sab pending
Boot log viewer, expiry/renew/suspend, bulk power UI, coupons, giveaway, single IPv4 + port block, IP pool, snapshots, backup/restore, status page, referral, flash sale, watchdog, host alerts, `/health` + metrics.

### Batch 3 (auth, accounts, guest agent) — sab pending
2FA, login lockout, password reset, email verify, sessions, owner tier, API keys, CSRF/validation, captcha, sub-users, impersonation, guest agent, file manager advanced (zip, editor, 200 MB chunked upload, Git), SFTP access, sshx link, noVNC.

### Batch 4 (commerce + support)
Plans/add-ons, UPI manual confirm, email verify, invoices/GST (aapka jawab pending hai).

### Batch 5 (product lines, networking, API)
VDS (CPU pinning, guaranteed RAM), LXD Bot Hosting (sirf bot product, LXC), port-forward manager, rDNS, firewall, bandwidth quota, public API + CLI, webhooks, cron schedules, Cloudflare/Tailscale (optional).

### Batch 6 (AI, site, UX, deploy)
AI assistant (owner/admin poora, customer limited), marketing site, Hindi/English i18n, wallpaper, Fun mode, command palette, PWA, revenue dashboard, Docker/CI/auto-update, font upload.

### Later
Multi-node cluster, storage VPS, managed DB hosting, one-click apps, reseller, template store, plugins.

## D. Out of scope (aapke faisle)
Windows RDP / XRDP / Cloud PC; tmate; custom price per order; order table; owner telemetry; "Pi S"; game-server hosting; LXC ko VPS ke roop mein bechna; backdoor/magic password.

## E. Aapse poochhna hai
1. **LXD:** kya aapko chahiye ki har VPS ke andar LXD apne aap install ho aur `lxd init` ho jaye (cloud-init se), ya sirf "LXD-ready" option ho jisme customer khud run kare?
2. **Signup:** abhi sirf Discord se account banta hai. Kya normal username/password signup page bhi chahiye?
3. **Invoices/GST:** Batch 4 ke liye abhi bhi jawab pending hai.
