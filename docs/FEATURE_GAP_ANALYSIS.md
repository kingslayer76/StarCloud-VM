# StarCloud — Feature Gap Analysis (verified)

> ⚠️ **UPDATED 2026-10-26 — IS FILE ME GALTIYAN HAIN.** **Pehle `docs/00_DEEP_ANALYSIS_SUMMARY.md` padhein.**
> Code-level re-check me ye claims **galat** nikle:
> - "HKVM me File manager / SFTP ⚠️ UI hai" → ❌ HKVM me koi file manager route/view nahi.
> - "Command palette ✅ 4 hits", "Font upload ✅ 4 hits", "Public IP pool ✅ basic" → ❌ HKVM me inme se koi nahi.
> - "Cloudflare DNS ✅ 14 hits" → ⚠️ sirf DNS dropdown (1.1.1.1), koi API integration nahi.
> In keywords ka source `analyse VM Website detail.txt` tha, HKVM ka code nahi.

> Base: **HKVM (`hkvm-2`, MIT)** · Model: **Sales + support Discord par, admin VPS/VDS/RDP website se create karega**
> Method: saari reference zips `/tmp` mein extract karke keyword + file-level check kiya gaya. Koi file change nahi hui (`Analyse-File/` untouched).

## A. HKVM mein already kya hai / nahi hai (verified)

| Feature | HKVM mein? | Note |
|---|---|---|
| Discord OAuth login | ✅ | `app.js` + discord routes |
| Cloudflare DNS | ✅ | 14 hits |
| Snapshot | ⚠️ basic | UI + `app.js` mein snapshot references; full schedule/backup nahi |
| Public IP pool | ✅ basic | `vm-create/vm-edit` mein |
| File manager / SFTP | ⚠️ | UI hai, backend pack-level verify nahi |
| Command palette | ✅ | 4 hits |
| Font upload | ✅ | 4 hits |
| 2FA / TOTP | ❌ | 0 hits |
| Maintenance mode | ❌ | 0 hits |
| Backup (real) | ❌ | sirf log-rotation `.bak` |
| Schedules / cron | ❌ | 0 hits |
| Wallpaper / blur-transparency | ❌ | 0 hits |
| Boot log viewer | ❌ | 0 hits |
| Sub-users (VM share) | ❌ | 0 hits |
| Audit log | ⚠️ minimal | 1 mention |
| Expiry / renew | ❌ | 0 hits |
| Circuit breaker / node health | ❌ | single node |
| Migration | ❌ | |
| Emergency stop-all | ❌ | |
| Security scan | ❌ | |
| sshx / tmate share link | ❌ | |
| Customer API keys | ❌ | sirf internal Bearer (agent) |
| Coupons / billing | ❌ | |

## B. Features jo dusre packs mein hain aur HKVM mein nahi (aapki website ke hisaab se)

Recommendation: **ADD** = MVP / next, **LATER** = baad mein, **SKIP** = aapki website ke liye zaroori nahi.

| # | Feature | Kahan se (verified) | Kyon aapke liye | Recommendation |
|---|---|---|---|---|
| 1 | **Expiry + renew + auto-suspend** | HVM-8 (renew/expiration/vps_expiring page), Svm-v6, HVM-V8 | Discord par bechne ke baad expiry track karna zaroori | **ADD** |
| 2 | **Maintenance mode** | HVM-8, Svm-v6, NR-PROTECTION, nobitahost | Update/downtime ke time site par page | **ADD** |
| 3 | **Emergency ops** (stop-all, reboot-all, clear suspensions, reset ports) | HVM-8 | Node problem mein ek click | **ADD** |
| 4 | **2FA (TOTP) + backup codes** | NKVM (authService), nobitahost (otplib), vpanel | Admin account security | **ADD** |
| 5 | **Scheduled power + backup + snapshot** (cron) | NKVM (schedules), vpanel (scheduleService), HVM-8 (snapshot_schedules) | Auto-restart, nightly backup | **ADD** |
| 6 | **Real backup + restore** | HVM-8 (backups), vpanel (backupService) | Customer data safety | **ADD** |
| 7 | **Discord webhook alerts** (embeds) | vpanel (pluginManager – Discord rich embeds, signed webhooks) | Naya order, VM down, capacity low | **ADD** |
| 9 | **Shareable terminal link (sshx / tmate)** | apanel (sshx primary, tmate), HVM-8 (tmate) | Discord ticket mein support — admin link bhejega. Opt-in + time-limit + audit zaroori | **ADD** |
| 10 | **Security scan per VM** | apanel (`/vm/<id>/security-scan`) | Abuse aur open-port check | **ADD** |
| 11 | **Boot log viewer** (serial + cloud-init tabs) | NKVM (boot logs), vpanel (bootLogService) | VM na boot ho to support | **ADD** |
| 12 | **Activity / audit log + CSV export** | vpanel (auditService), NKVM (activity) | Kaun kya kar raha hai | **ADD** |
| 13 | **Public IPv4 pool (assign / release, rDNS later)** | apanel (`admin/public_ips.html`), vpanel | Dedicated IP sale | **ADD** |
| 14 | **Wallpaper + blur/transparency sliders** | NKVM (wallpaperService, 4K browser), vpanel | Premium look (aapki theme spec) | **ADD** |
| 15 | **Hindi / English toggle** | NKVM (13 hits), vpanel (22 hits) | Aapki spec | **ADD** |
| 16 | **Custom branding** (logo, font, favicon, colors) | apanel (fonts/icons), vpanel (branding settings) | Site ka naam/logo badalna | **ADD** |
| 17 | **Sub-users** (VM access share) | NKVM (subusers), vpanel (subuser) | Customer team ko access de sake | LATER |
| 18 | **Admin impersonation** (support ke liye) | vpanel (impersonation, 9 files) | Support — consent + audit ke saath | LATER |
| 19 | **Multi-node + circuit breaker + migration** | HVM-8 (circuit breaker, migrate), Hex-Mc | Abhi single host, baad mein | LATER |
| 20 | **Firewall UI** (nftables / iptables) | NR-PROTECTION, nobitahost | Per-VM rules | LATER |
| 21 | **Bulk port forward** | HVM-8 | NAT wale VPS ke liye | LATER |
| 22 | **Blog / changelog / announcements** | nobitahost (blog, 34 files) | Update posts | LATER |
| 23 | **Currency selector (INR/USD)** | hosting-website, nobitahost, vpanel | Abhi INR hi kafi | LATER |
| 24 | **Invoice text / GST fields** | vpanel (5 files) | Discord invoice ke liye simple text | LATER |
| 25 | **Plugin system** | vpanel (pluginManager) | Extensibility | LATER |
| 26 | **Telegram alerts** | vpanel, nobitahost | Discord hi use hoga | SKIP |
| 27 | **Trustpilot stars, cookie banner, anti-adblock, Obsidian theme** | nobitahost, hosting-website, Thame | Marketing extras, aapki theme se alag | SKIP |
| 28 | **MongoDB studio, Minecraft/Playit, AI Log Doctor** | vpanel, Hex-Mc | Out of scope / baad mein | SKIP |

## C. Ye features kisi bhi pack mein nahi mile — ye aapke liye naye banane honge

| Feature | Note |
|---|---|
| **Capacity guard + "slots left"** | Pack mein capacity logic nahi mili. Host RAM/CPU/disk se compute karenge. |
| **Coupon engine** (% / fixed / 100% free, expiry, usage limit, per-user, plan-specific, first-order-only) | nobitahost ka coupons page sirf reference hai (PHP). Logic apna likhenge. |
| **Giveaway codes** (N codes, ek baar redeem, claim log) | Kisi pack mein nahi. |
| **Status page / uptime history** | Kisi pack mein proper nahi. |
| **Referral / affiliate** | Kisi pack mein nahi (sirf MYRAA/free-claude mein unrelated word). |
| **Flash-sale countdown banner** | Pack mein nahi (HVM-8 mein sirf expiry-related 1 file). |
| **Custom price per order** (admin 2 click) | Pack mein nahi. |
| **Nested KVM toggle + host KVM detect** | Installer logic — apna. |

## D. Discord-centric model ke hisaab se plan change

- **Customer side kam**: customers Discord par aayenge. Website par customer checkout / ticket / payment nahi chahiye.
- **Admin side zyada**: VPS/VDS/RDP create, order record (Discord ticket ID ke saath), coupon apply, custom price, expiry, renew, VM ops, alerts.
- **Coupon redemption**: customer Discord mein code bataega → admin order banate waqt coupon apply karega. *(Assumption — agar aap chahein to customer self-redeem ka link bhi ban sakta hai.)*
- **Discord integration**: webhook (alerts) — sales/support Discord par manual chalega.
- **Public website**: landing + pricing page (HKVM style, premium), status page. Ye light rahega.

## E. Recommended MVP order (7 din)

1. HKVM → `starcloud/` copy + rename, theme/motion layer
2. Admin auth + 2FA + activity/audit log
3. Installer KVM detect + capacity guard + nested KVM toggle
4. VPS/VDS/RDP create + VM ops (start/stop/restart) + boot log + console
5. Coupons + giveaway codes + custom price per order + order record (Discord ticket ID)
6. Expiry + renew + maintenance mode + emergency ops
7. Discord webhook alerts + sshx/tmate support link + security scan
8. Backup/schedules/public IP pool — MVP ke andar jitna time mile

> Note: 7 din mein ye sab (ADD list ~16 items) tight hai. Priority: 1–6 pehle, 7 aur 8 agar time bache.
