# StarCloud — Final Feature List (2026-10-17, user decisions ke baad)

> ℹ️ **UPDATED 2026-10-26:** Ye list abhi bhi kaam ki hai, lekin iske "Pending" sawaalon ke jawaab mil chuke hain:
> webhook (D-16), file manager (D-17), "Pi S" drop (D-23), Gemini free key (D-20), XRDP remove (D-26),
> password 8 chars (D-24), Python discord.py bot (D-25). Naye sawaal `docs/00_DEEP_ANALYSIS_SUMMARY.md` Section 12 me hain.

Ye list user ke latest decisions ke hisaab se hai. Har feature ka status aur source file likha hai.
Terms ka full form likha hai (short form nahi).

## Decisions (user ne confirm kiye)

| # | Decision | Matlab |
|---|---|---|
| D-1 | Saari features ek saath build hongi | Koi part chhoda nahi jayega |
| D-2 | Discord bot banega | Bot token **website ke settings page** mein dala jayega. Bot ticket, payment ticket aur credentials ka kaam karega |
| D-3 | RDP hataya gaya | Windows RDP, Linux Cloud PC (XRDP), Windows templates — sab scope se bahar |
| D-4 | tmate hataya gaya | Kaam nahi karta. sshx rahega |
| D-5 | "Custom price per order" hataya gaya | |
| D-6 | "Order record" hataya gaya | Order table nahi banega. Discord ticket hi record hoga |
| D-7 | Coupons aur giveaway codes VM management mein | Billing section se VM management section mein shift |
| D-8 | Brand naam | HKVM → **StarCloud**. "hopingboyz" → **KingSlayer** |
| D-9 | Single public IPv4 + port alag | Sab VM ek hi public IPv4 use karenge, har VM ko alag port block milega |
| D-10 | AI assistant website mein built-in | AI ka source: free-claude-code (provider failover), ZORIN (planner/risk/confirm), MYRAA (Hindi voice ideas) |
| D-11 | Custom CPU model | VPS, VDS create form mein same HKVM style, same animation |
| D-12 | Nested KVM | Host par KVM ho to default ON, toggle ke saath. KVM na ho to VPS create block |
| D-13 | Installer | KVM auto-detect (`/dev/kvm`, `vmx`/`svm`) |
| D-14 | Default admin `admin/admin` | User ne accept kiya ("baad mein change karunga") |
| D-15 | VM ka password | User khud create ke waqt dalega (customer se nahi poochna) |

## Batch 1 — Host safety aur base (sabse pehle)

| Feature | Kya karega | Source | HKVM status |
|---|---|---|---|
| KVM capability detect | `/dev/kvm`, `vmx`/`svm`, nested setting, cgroup version check. Capability report page | Master spec §0 (own) | ❌ |
| Block without KVM | KVM na ho to VPS/VDS create block, saaf message ke saath | Master spec §0 | ❌ |
| Nested KVM toggle | Create form mein toggle, default ON (KVM host par) | D-12, master spec §1 | ❌ (implicit `cpu=host` only) |
| Custom CPU model (VPS/VDS) | HKVM wala custom CPU name option, same animation | D-11, HKVM `vm-create.ejs` | ✅ (sirf HKVM create form mein) |
| Capacity guard | "X vCPU/RAM free, Y VM fit honge" + over-allocation limit | Master spec §0 (own) | ❌ |
| Password required | Create form mein password zaroori, template default nahi | D-15 | ❌ (template default `ubuntu/ubuntu` tha) |
| Maintenance mode | Site par maintenance banner, admin bypass | HVM-8 `/admin/maintenance`, Svm-v6, NR-PROTECTION | ❌ |
| Emergency stop-all / reboot-all | Ek click se sab VM stop/reboot | HVM-8 `/admin/emergency-stop-all`, `/admin/emergency-reboot-all` | ⚠️ (Stop All sirf client loop) |
| Audit log | Har mutation ka log (actor, action, target, IP, time). CSV export | apanel `/admin/audit`, vpanel, NKVM | ❌ |
| Security scan (per VM) | Miner process name, failed login count, suspicious cron entries | apanel `akvm.py` `scan_vm_for_threats`, `MINER_PROCESS_NAMES` | ❌ |

## Batch 2 — VM management (coupons aur giveaway bhi yahin)

| Feature | Kya karega | Source | HKVM status |
|---|---|---|---|
| Expiry, renew, suspend | VM ki expiry date, renew button, expire par suspend | HVM-8 `/admin/vps/<id>/expiration`, `/renew`, `/suspend`, `/expiring` | ❌ |
| Coupons | % off, fixed amount, 100% free. Expiry, usage limit, plan-specific | nobitahost (idea), master spec §9 | ❌ |
| Giveaway codes | N codes banaye, har code ek baar use ho, kis ne claim kiya record | master spec §9 (own design) | ❌ |
| Public IPv4 + port pool | Host ka ek IPv4. Port range se har VM ko alag block. Conflict check | apanel `public_ips.html` idea, master spec §6.1 mode A, D-9 | ❌ |
| Port forward (bulk) | Ek saath kai VM ke port add/remove | HVM-8 `/admin/ports/bulk` | ❌ |
| Boot log viewer | QEMU serial log aur cloud-init log, tabs ke saath | NKVM boot-log tab, vpanel `bootLogService` | ❌ |
| Web terminal (SSH) | Customer website se apna VPS terminal khol kar command chala sake | HKVM `vm-ssh.ejs` (xterm) | ✅ |
| Live stats | CPU, RAM, network graphs | HKVM `/api/vms/:id/stats` | ✅ |
| Snapshots | Create, restore, delete | HKVM `vm_snapshots` table | ⚠️ (basic) |

## Batch 3 — Backup aur automation

| Feature | Kya karega | Source | HKVM status |
|---|---|---|---|
| Scheduled power | Cron se start/stop/restart | NKVM, vpanel | ❌ |
| Scheduled backup | Cron se backup | NKVM, vpanel, HVM-8 | ❌ |
| Scheduled snapshot | Cron se snapshot | HVM-8 `/vps/<id>/snapshots/schedule` | ❌ |
| Real backup and restore | Disk image ka backup, restore, download | HVM-8 `/backups/create|restore|download`, vpanel | ❌ |

## Batch 4 — Discord aur support

| Feature | Kya karega | Source | HKVM status |
|---|---|---|---|
| Discord bot (token website se) | Ticket channel, UPI payment ticket, credentials DM, auto role | D-2, HKVM `discord_settings` (token columns) | ⚠️ (settings save hote hain, bot code nahi) |
| Discord bot admin page | Bot status, token (website se), commands on/off | apanel `/admin/discord-bot` | ❌ |
| Discord webhook alerts | VM crash, expiry, new ticket ki alert | vpanel `pluginManager` | ❌ (confirm pending) |
| sshx support link | Customer ke terminal ka temporary public link (sshx) | apanel `sshx` code | ❌ |
| tmate | **Hataya gaya** (D-4) | — | — |

## Batch 5 — Customer aur premium look

| Feature | Kya karega | Source | HKVM status |
|---|---|---|---|
| 2FA (TOTP) + backup codes | Google Authenticator wala login, QR, 10 backup codes | NKVM, nobitahost (`otplib`) | ❌ |
| Wallpaper + blur + transparency sliders | Dashboard background, blur aur opacity slider | NKVM, vpanel | ❌ |
| Hindi and English (i18n) | Settings se language switch | NKVM, vpanel | ❌ |
| Custom branding | Logo, name, banner (`StarCloud-Logo.png`, `StarCloud-Banner.png`) | apanel, vpanel | ⚠️ (site name settings hai) |
| Notification bell (functional) | Unread count, mark read | apanel `/notifications/*`, HVM-8 | ⚠️ (static UI) |
| Command palette (Ctrl+K) | Page aur action search | vpanel, HVM-8, master spec §15 | ❌ |

## Batch 6 — AI assistant (website ke andar)

| Feature | Kya karega | Source |
|---|---|---|
| AI chat (Hindi, Hinglish, English) | "ek 4GB Ubuntu VM bana do" jaisi command | ZORIN (planner pipeline), master spec §8 |
| Provider failover | Gemini, OpenAI, Groq, Ollama — ek ke baad doosra | free-claude-code (provider registry + failover) |
| Risk gate + Confirm | Destructive action (delete, stop-all) se pehle plan dikhe, confirm ke baad hi chale | ZORIN `risk.py` + `confirmation.py` |
| AI log doctor | VM crash ka reason aur fix (serial log + cloud-init log) | master spec §8 |
| AI action audit | Har AI action ka log | master spec §8 |
| AI default OFF | Owner enable kare, API key ke saath | master spec §8 |

## Later (abhi nahi)

| Feature | Source |
|---|---|
| Multi-node, live migration, circuit breaker | HVM-8, Hex-Mc |
| Sub-users | NKVM, vpanel |
| Admin impersonation | vpanel (sirf consent-based, hidden access nahi) |
| Firewall UI (per VM) | NR-PROTECTION, nobitahost |
| Blog and changelog | nobitahost |
| Currency selector, invoice text | nobitahost, vpanel |
| Plugin system | vpanel |

## Pending (user se confirm chahiye)

1. **Discord webhook** Batch 4 mein rakhein ya nahi?
2. **File manager** (apanel, NKVM ka) — list mein nahi hai. Add karna hai?
3. **"Pi S"** ka matlab kya hai? Kisi bhi file mein nahi mila.
4. **Public IPv4**: single IP + port block model (D-9) confirm?
5. **AI provider**: pehle kaun sa? (Gemini free key, OpenAI, Groq, Ollama local)

## Spec ke saath conflict (owner ka hi spec)

Master spec ki **OUT OF SCOPE** list kehti hai: "default/weak credentials in any product". Isliye default `admin/admin` aur VM default password ko owner ne accept kiya hai. Ye doc mein record hai, lekin spec ke hisaab se ye sirf owner ki marzi se hai.
