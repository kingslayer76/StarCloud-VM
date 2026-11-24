// Batch 3: two-factor login (TOTP + backup codes), session list and revoke, API keys,
// public API v1 (/api/v1, Bearer key), admin impersonation, admin reset of sessions, and the /security page.
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const totp = require('../services/totp');
const { logAudit } = require('../services/audit');

const hashId = (s) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
const hashKey = (k) => crypto.createHash('sha256').update(String(k)).digest('hex');

module.exports = function registerSecurity(app, deps) {
  const { db, checkAuth, checkAdmin, power } = deps;

  const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { if (e) rej(e); else res(this); }));
  const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
  const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
  const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error('[security]', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  });

  db.run(`CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT,
    key_prefix TEXT,
    key_hash TEXT UNIQUE NOT NULL,
    scope TEXT DEFAULT 'read',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME
  )`);

  // ---------- Two-factor authentication ----------
  app.post('/api/user/2fa/setup', checkAuth, h(async (req, res) => {
    const user = await get(`SELECT username, totp_enabled FROM users WHERE id = ?`, [req.session.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.totp_enabled) return res.status(409).json({ error: '2FA is already on. Turn it off first to set it up again.' });
    const secret = totp.newSecret();
    await run(`UPDATE users SET totp_secret = ? WHERE id = ?`, [secret, req.session.userId]);
    const otpauth = totp.otpauthUrl(secret, user.username, 'StarCloud Panel');
    const qr = await QRCode.toDataURL(otpauth, { margin: 1, width: 220 });
    res.json({ secret, otpauth, qr });
  }));

  app.post('/api/user/2fa/enable', checkAuth, h(async (req, res) => {
    const code = String(req.body && req.body.code || '');
    const user = await get(`SELECT totp_secret, totp_enabled FROM users WHERE id = ?`, [req.session.userId]);
    if (!user || !user.totp_secret) return res.status(400).json({ error: 'Start the setup first' });
    if (user.totp_enabled) return res.status(409).json({ error: '2FA is already on' });
    if (!totp.verifyTotp(user.totp_secret, code)) {
      return res.status(400).json({ error: 'Wrong code. Check the time on your phone and try again.' });
    }
    const codes = totp.makeBackupCodes(8);
    await run(`UPDATE users SET totp_enabled = 1, totp_backup = ? WHERE id = ?`,
      [JSON.stringify(codes.map((c) => bcrypt.hashSync(c, 10))), req.session.userId]);
    res.json({ success: true, backup_codes: codes, note: 'Save these backup codes now. Each works once if you lose your phone.' });
  }));

  app.post('/api/user/2fa/disable', checkAuth, h(async (req, res) => {
    const password = String(req.body && req.body.password || '');
    const code = String(req.body && req.body.code || '');
    const user = await get(`SELECT password, totp_secret, totp_enabled FROM users WHERE id = ?`, [req.session.userId]);
    if (!user || !user.totp_enabled) return res.status(400).json({ error: '2FA is not on' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Password is wrong' });
    if (!totp.verifyTotp(user.totp_secret, code)) return res.status(400).json({ error: 'Wrong 2FA code' });
    await run(`UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_backup = NULL WHERE id = ?`, [req.session.userId]);
    res.json({ success: true });
  }));

  app.get('/api/user/2fa', checkAuth, h(async (req, res) => {
    const u = await get(`SELECT totp_enabled FROM users WHERE id = ?`, [req.session.userId]);
    res.json({ enabled: !!(u && u.totp_enabled) });
  }));

  // ---------- Sessions ----------
  const userSessions = (req, cb) => {
    req.sessionStore.all((err, sessions) => {
      if (err) return cb(err);
      const mine = Object.keys(sessions || {}).filter((sid) =>
        sessions[sid] && Number(sessions[sid].userId) === Number(req.session.userId));
      cb(null, mine.map((sid) => ({ sid, id: hashId(sid), current: sid === req.sessionID, expires: sessions[sid].cookie && sessions[sid].cookie.expires })));
    });
  };

  app.get('/api/user/sessions', checkAuth, (req, res) => {
    userSessions(req, (err, list) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(list.map(({ sid, ...rest }) => rest));
    });
  });

  app.post('/api/user/sessions/revoke', checkAuth, (req, res) => {
    const id = String(req.body && req.body.id || '');
    userSessions(req, (err, list) => {
      if (err) return res.status(500).json({ error: err.message });
      const hit = list.find((s) => s.id === id);
      if (!hit) return res.status(404).json({ error: 'Session not found' });
      req.sessionStore.destroy(hit.sid, () => res.json({ success: true, logged_out_current: hit.current }));
    });
  });

  app.post('/api/user/sessions/revoke-others', checkAuth, (req, res) => {
    userSessions(req, (err, list) => {
      if (err) return res.status(500).json({ error: err.message });
      const others = list.filter((s) => !s.current);
      let left = others.length;
      if (!left) return res.json({ success: true, revoked: 0 });
      others.forEach((s) => req.sessionStore.destroy(s.sid, () => { if (--left === 0) res.json({ success: true, revoked: others.length }); }));
    });
  });

  app.post('/api/admin/users/:id/revoke-sessions', checkAuth, checkAdmin, (req, res) => {
    const uid = Number(req.params.id);
    req.sessionStore.all((err, sessions) => {
      if (err) return res.status(500).json({ error: err.message });
      const sids = Object.keys(sessions || {}).filter((sid) => sessions[sid] && Number(sessions[sid].userId) === uid);
      sids.forEach((sid) => req.sessionStore.destroy(sid, () => {}));
      res.json({ success: true, revoked: sids.length });
    });
  });

  // ---------- Impersonation (admin logs in as a customer; audited) ----------
  app.post('/api/admin/users/:id/impersonate', checkAuth, checkAdmin, h(async (req, res) => {
    const target = await get(`SELECT id, username, role, is_active FROM users WHERE id = ?`, [req.params.id]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin') return res.status(400).json({ error: 'Admins cannot be impersonated' });
    if (!target.is_active) return res.status(400).json({ error: 'This account is disabled' });
    const adminId = req.session.impersonatorId || req.session.userId;
    req.session.impersonatorId = adminId;
    req.session.userId = target.id;
    req.session.username = target.username;
    req.session.role = target.role;
    logAudit(db, { actorId: adminId, actorName: null, action: 'impersonate', target: `user:${target.id}`, result: 'started', details: target.username, ip: req.ip });
    res.json({ success: true, redirect: '/dashboard' });
  }));

  app.post('/api/user/stop-impersonating', checkAuth, h(async (req, res) => {
    if (!req.session.impersonatorId) return res.status(400).json({ error: 'You are not impersonating anyone' });
    const admin = await get(`SELECT id, username, role FROM users WHERE id = ?`, [req.session.impersonatorId]);
    delete req.session.impersonatorId;
    if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Original admin no longer valid' });
    req.session.userId = admin.id;
    req.session.username = admin.username;
    req.session.role = 'admin';
    logAudit(db, { actorId: admin.id, actorName: admin.username, action: 'impersonate', target: 'end', result: 'ended', details: '', ip: req.ip });
    res.json({ success: true, redirect: '/admin/users' });
  }));

  // ---------- API keys ----------
  app.get('/api/user/api-keys', checkAuth, h(async (req, res) => {
    res.json(await all(`SELECT id, name, key_prefix, scope, created_at, last_used FROM api_keys WHERE user_id = ? ORDER BY id DESC`, [req.session.userId]));
  }));

  app.post('/api/user/api-keys', checkAuth, h(async (req, res) => {
    const count = await get(`SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ?`, [req.session.userId]);
    if (count && count.n >= 10) return res.status(400).json({ error: 'You can have up to 10 API keys. Delete one first.' });
    const name = String(req.body && req.body.name || '').trim().slice(0, 40) || 'API key';
    const scope = req.body && req.body.scope === 'write' ? 'write' : 'read';
    const key = 'sc_' + crypto.randomBytes(24).toString('hex');
    const r = await run(`INSERT INTO api_keys (user_id, name, key_prefix, key_hash, scope) VALUES (?, ?, ?, ?, ?)`,
      [req.session.userId, name, key.slice(0, 10), hashKey(key), scope]);
    res.json({ success: true, id: r.lastID, key, scope, note: 'Copy this key now. It is not shown again.' });
  }));

  app.delete('/api/user/api-keys/:id', checkAuth, h(async (req, res) => {
    await run(`DELETE FROM api_keys WHERE id = ? AND user_id = ?`, [req.params.id, req.session.userId]);
    res.json({ success: true });
  }));

  // ---------- Public API v1 (Authorization: Bearer sc_...) ----------
  function apiKeyAuth(req, res, next) {
    const m = /^Bearer\s+(sc_[a-f0-9]{48})$/i.exec(req.headers.authorization || '');
    if (!m) return res.status(401).json({ error: 'Missing API key. Send the header: Authorization: Bearer sc_...' });
    db.get(`SELECT k.id AS kid, k.scope, u.id AS uid, u.role, u.is_active
            FROM api_keys k JOIN users u ON u.id = k.user_id WHERE k.key_hash = ?`, [hashKey(m[1])], (err, row) => {
      if (err || !row || !row.is_active) return res.status(401).json({ error: 'Invalid API key' });
      if (req.method !== 'GET' && row.scope !== 'write') return res.status(403).json({ error: 'This key is read-only' });
      req.apiUser = { id: row.uid, role: row.role };
      db.run(`UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?`, [row.kid]);
      next();
    });
  }
  app.use('/api/v1', apiKeyAuth);

  const VM_COLS = `vm_id, vm_name, status, memory, cpus, disk_size, os_type, owner_id, suspended, suspend_reason, expires_at, hostname, ssh_port`;
  const ownVm = (req, id) => get(`SELECT ${VM_COLS} FROM vms WHERE vm_id = ?${req.apiUser.role === 'admin' ? '' : ' AND owner_id = ?'}`,
    req.apiUser.role === 'admin' ? [id] : [id, req.apiUser.id]);

  app.get('/api/v1/vms', h(async (req, res) => {
    const isAdmin = req.apiUser.role === 'admin';
    res.json(await all(`SELECT ${VM_COLS} FROM vms ${isAdmin ? '' : 'WHERE owner_id = ?'} ORDER BY vm_id`, isAdmin ? [] : [req.apiUser.id]));
  }));

  app.get('/api/v1/vms/:id', h(async (req, res) => {
    const vm = await ownVm(req, req.params.id);
    if (!vm) return res.status(404).json({ error: 'VM not found' });
    res.json(vm);
  }));

  app.post('/api/v1/vms/:id/:action(start|stop|restart)', h(async (req, res) => {
    const vm = await ownVm(req, req.params.id);
    if (!vm) return res.status(404).json({ error: 'VM not found' });
    const r = await power(vm.vm_id, req.params.action);
    if (!r.ok) return res.status(409).json({ error: r.error });
    res.json({ success: true, action: req.params.action, note: r.note });
  }));

  // ---------- /security page (2FA, sessions, API keys) ----------
  app.get('/security', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'security.html'));
  });
};
