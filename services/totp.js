// TOTP (RFC 6238) two-factor codes and one-time backup codes. No external service.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error('invalid base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

function newSecret() { return base32Encode(crypto.randomBytes(20)); }

function hotp(secretB32, counter) {
  const key = base32Decode(secretB32);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(buf).digest();
  const o = h[h.length - 1] & 0x0f;
  const code = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

// Accepts the current 30 s step and one step either side (clock drift).
function verifyTotp(secretB32, token, window = 1, now = Date.now()) {
  const t = String(token || '').replace(/\s/g, '');
  if (!secretB32 || !/^\d{6}$/.test(t)) return false;
  const c = Math.floor(now / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    if (hotp(secretB32, c + w) === t) return true;
  }
  return false;
}

function otpauthUrl(secret, account, issuer) {
  return `otpauth://totp/${encodeURIComponent(issuer + ':' + account)}?secret=${secret}` +
    `&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function makeBackupCodes(n = 8) {
  const plain = [];
  for (let i = 0; i < n; i++) {
    const hex = crypto.randomBytes(4).toString('hex');
    plain.push(`${hex.slice(0, 4)}-${hex.slice(4)}`);
  }
  return plain;
}

// Checks a 6-digit TOTP code, or a backup code (which is then used up).
function checkSecondFactor(db, user, code) {
  if (verifyTotp(user.totp_secret, code)) return true;
  let stored = [];
  try { stored = JSON.parse(user.totp_backup || '[]'); } catch (e) { stored = []; }
  const c = String(code || '').trim().toLowerCase();
  const idx = stored.findIndex((h) => bcrypt.compareSync(c, h));
  if (idx < 0) return false;
  stored.splice(idx, 1);
  db.run(`UPDATE users SET totp_backup = ? WHERE id = ?`, [JSON.stringify(stored), user.id]);
  return true;
}

module.exports = { newSecret, verifyTotp, otpauthUrl, hotp, base32Encode, base32Decode, makeBackupCodes, checkSecondFactor };
