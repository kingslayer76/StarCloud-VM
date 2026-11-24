# Panel open karna (phone aur bahar se): Cloudflare Tunnel

## Install command (sahi tarika)
```
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/kingslayer76/StarCloud-VM/refs/heads/StarCloud-VM/installer.sh)"
```
Ya do step:
```
curl -fsSL https://raw.githubusercontent.com/kingslayer76/StarCloud-VM/refs/heads/StarCloud-VM/installer.sh -o installer.sh
sudo bash installer.sh
```
**`sudo bash <(curl ...)` mat chalayein.** sudo `<(...)` wali file band kar deta hai, isliye error aata hai:
`bash: /dev/fd/63: No such file or directory`.

## Pehle samajhiye
- `10.0.2.x` address ek VM ke andar ka NAT address hai. Phone ya kisi dusre device se ye nahi khulega (isliye "took too long to respond" aata hai).
- Panel port `8080` par chalta hai. Dusre device se khulne ke liye do raste hain:
  1. **Cloudflare Tunnel (sabse aasan, sirf ye use karein):** server port kholne ki zaroorat nahi, HTTPS link milta hai.
  2. Port `8080` ko VPS provider ke firewall mein open karna (public IP par).

## Sabse aasan: quick link (koi account nahi)
```
sudo bash installer.sh --cloudflare
```
Ye cloudflared install karega (server ke CPU ke hisaab se: amd64 / arm64), aur ek link dega jaisa
`https://xxxx.trycloudflare.com/login`. Ye link tab tak chalega jab tak tunnel chal raha hai.
Reboot ke baad naya link lene ke liye ye command dobara chalayein.

## Permanent link (apna domain)
1. Cloudflare dashboard > Networks > Tunnels > Create a tunnel > Cloudflared.
2. Tunnel ka naam dein. Operating system: **Debian** (Ubuntu ke liye bhi sahi hai). **Architecture: 64-bit** chunein
   (aapka server x86_64 hai; 32-bit galat package install karega).
3. Dashboard par token wali command dikhegi. Sirf token copy karein (`eyJ...` wala string), command ka baaki hissa nahi.
4. Server par:
   ```
   sudo CF_TUNNEL_TOKEN=<token> bash installer.sh --cloudflare
   ```
   (ya bina token ke command chalayein; installer token poochega, aur input chhupa rahega.)
5. Dashboard > Tunnel > Public Hostname > Add:
   - Subdomain/domain: jo aap chahein
   - Service type: **HTTP**
   - URL: **localhost:8080**
6. Browser mein `https://<aapka-hostname>/login` kholen.

**Security:** agar token kisi screenshot ya chat mein dikh gaya hai, to dashboard mein tunnel delete karke naya banayein.

## Cloudflare apt command mein IPv6 hang
Agar `apt-get update` `pkg.cloudflare.com` par atak raha hai (`Connecting to ... (2606:4700::...)`), to IPv6 ki wajah se hota hai.
Installer ka `--cloudflare` GitHub se IPv4 par download karta hai, isliye ye problem nahi aati. Manual apt use karna ho to:
```
sudo apt-get -o Acquire::ForceIPv4=true update
```

## Panel ka address check
```
bash installer.sh --status
```
Installer ke summary mein ab ye sab dikhta hai: `this machine` (localhost), `same network` (LAN IP), `internet (VPS)` (public IP, agar mila).
