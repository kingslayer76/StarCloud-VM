// Batch 5: outgoing webhooks (HMAC-SHA256 signed, retried) and VM schedules (daily start / stop / restart).
const crypto = require('crypto');

const DELAYS_MS = [0, 5000, 30000];   // 3 attempts in total

module.exports = function registerIntegrations(app, deps) {
  const { db, checkAuth, checkAdmin, power } = deps;
  const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { if (e) rej(e); else res(this); }));
  const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
  const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
  const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error('[integrations]', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  });

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS webhooks (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT NOT NULL, secret TEXT NOT NULL,
      events TEXT DEFAULT '*', enabled INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS webhook_deliveries (id INTEGER PRIMARY KEY AUTOINCREMENT, webhook_id INTEGER, event TEXT,
      attempts INTEGER, last_status TEXT, ok INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS vm_schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, vm_id INTEGER NOT NULL, action TEXT NOT NULL,
      hhmm TEXT NOT NULL, enabled INTEGER DEFAULT 1, last_run_date TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  });

  // ---------- Webhook delivery ----------
  function sign(secret, ts, body) {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
  }

  async function deliver(hook, event, body, attempt = 0) {
    const ts = Math.floor(Date.now() / 1000).toString();
    let status = 'error', ok = false;
    try {
      const r = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StarCloud-Webhook/1.0',
          'X-StarCloud-Event': event,
          'X-StarCloud-Timestamp': ts,
          'X-StarCloud-Signature': sign(hook.secret, ts, body)
        },
        body,
        signal: AbortSignal.timeout(8000)
      });
      status = String(r.status);
      ok = r.status >= 200 && r.status < 300;
    } catch (e) {
      status = e.name === 'TimeoutError' ? 'timeout' : (e.message || 'error').slice(0, 80);
    }
    if (!ok && attempt + 1 < DELAYS_MS.length) {
      setTimeout(() => deliver(hook, event, body, attempt + 1), DELAYS_MS[attempt + 1]);
      return;
    }
    run(`INSERT INTO webhook_deliveries (webhook_id, event, attempts, last_status, ok) VALUES (?, ?, ?, ?, ?)`,
      [hook.id, event, attempt + 1, status, ok ? 1 : 0]).catch(() => {});
  }

  // Called by the panel when something happens: emit('vm.suspended', { ... })
  function emit(event, data) {
    db.all(`SELECT * FROM webhooks WHERE enabled = 1`, [], (err, hooks) => {
      if (err || !hooks) return;
      const body = JSON.stringify({ event, ts: new Date().toISOString(), data });
      hooks.forEach((hook) => {
        const subs = String(hook.events || '*').split(',').map((s) => s.trim()).filter(Boolean);
        if (subs.includes('*') || subs.includes(event)) deliver(hook, event, body).catch(() => {});
      });
    });
  }

  const validUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch (e) { return false; } };

  app.get('/api/admin/webhooks', checkAuth, checkAdmin, h(async (req, res) => {
    const rows = await all(`SELECT id, url, events, enabled, created_at, substr(secret, -4) AS secret_tail FROM webhooks ORDER BY id DESC`);
    res.json(rows);
  }));

  app.post('/api/admin/webhooks', checkAuth, checkAdmin, h(async (req, res) => {
    const url = String(req.body && req.body.url || '').trim();
    if (!validUrl(url)) return res.status(400).json({ error: 'URL must start with http:// or https://' });
    const events = String(req.body && req.body.events || '*').replace(/\s/g, '').slice(0, 300) || '*';
    const secret = String(req.body && req.body.secret || '').trim() || crypto.randomBytes(24).toString('hex');
    const r = await run(`INSERT INTO webhooks (url, secret, events) VALUES (?, ?, ?)`, [url, secret, events]);
    res.json({ success: true, id: r.lastID, secret, note: 'Save this secret. It is used to check the X-StarCloud-Signature header.' });
  }));

  app.delete('/api/admin/webhooks/:id', checkAuth, checkAdmin, h(async (req, res) => {
    await run(`DELETE FROM webhooks WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  app.post('/api/admin/webhooks/:id/test', checkAuth, checkAdmin, h(async (req, res) => {
    const hook = await get(`SELECT * FROM webhooks WHERE id = ?`, [req.params.id]);
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });
    deliver(hook, 'test', JSON.stringify({ event: 'test', ts: new Date().toISOString(), data: { message: 'StarCloud test event' } })).catch(() => {});
    res.json({ success: true, note: 'Test sent. Check the delivery log below in a few seconds.' });
  }));

  app.get('/api/admin/webhooks/deliveries', checkAuth, checkAdmin, h(async (req, res) => {
    res.json(await all(`SELECT * FROM webhook_deliveries ORDER BY id DESC LIMIT 50`));
  }));

  // ---------- VM schedules (server local time, checked every minute) ----------
  app.get('/api/admin/schedules', checkAuth, checkAdmin, h(async (req, res) => {
    res.json(await all(`SELECT s.*, v.vm_name FROM vm_schedules s LEFT JOIN vms v ON v.vm_id = s.vm_id ORDER BY s.id DESC`));
  }));

  app.post('/api/admin/schedules', checkAuth, checkAdmin, h(async (req, res) => {
    const vmId = Number(req.body && req.body.vm_id);
    const action = String(req.body && req.body.action || '');
    const hhmm = String(req.body && req.body.hhmm || '');
    if (!Number.isInteger(vmId)) return res.status(400).json({ error: 'Pick a VM' });
    if (!['start', 'stop', 'restart'].includes(action)) return res.status(400).json({ error: 'Action must be start, stop or restart' });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return res.status(400).json({ error: 'Time must be HH:MM (24-hour)' });
    const vm = await get(`SELECT vm_id FROM vms WHERE vm_id = ?`, [vmId]);
    if (!vm) return res.status(404).json({ error: 'VM not found' });
    const r = await run(`INSERT INTO vm_schedules (vm_id, action, hhmm) VALUES (?, ?, ?)`, [vmId, action, hhmm]);
    res.json({ success: true, id: r.lastID });
  }));

  app.delete('/api/admin/schedules/:id', checkAuth, checkAdmin, h(async (req, res) => {
    await run(`DELETE FROM vm_schedules WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  }));

  async function runSchedules() {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = now.toISOString().slice(0, 10);
    const rows = await all(`SELECT * FROM vm_schedules WHERE enabled = 1 AND hhmm = ? AND (last_run_date IS NULL OR last_run_date != ?)`, [hhmm, today]);
    for (const s of rows) {
      await run(`UPDATE vm_schedules SET last_run_date = ? WHERE id = ?`, [today, s.id]);
      const r = await power(s.vm_id, s.action);
      console.log(`[Schedule] #${s.id} ${s.action} VM ${s.vm_id} at ${hhmm}: ${r.ok ? 'ok' : r.error}`);
    }
  }

  function startSchedulerJob() {
    setInterval(() => runSchedules().catch((e) => console.error('[Schedule]', e.message)), 60 * 1000);
  }

  return { emit, startSchedulerJob, deliver };
};
