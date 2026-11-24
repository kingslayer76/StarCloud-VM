// Batch 2: VM lifecycle for a fleet of VPS: expiry and renewal, suspend with reason, auto-suspend on expiry,
// bulk power actions, backups (offline disk copy), snapshot restore/delete (qemu-img), watchdog for
// VMs that were running, status samples + public /status page, host alerts, and giveaway codes.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

const DAY = 24 * 60 * 60 * 1000;
const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
const parseDb = (s) => (s ? new Date(String(s).replace(' ', 'T') + 'Z') : null);
const RAM_ALERT_PCT = 10;   // free RAM below this -> alert
const DISK_ALERT_PCT = 5;   // free disk below this -> alert

module.exports = function registerLifecycle(app, deps) {
  const { db, checkAuth, checkAdmin, power, emit, backupDir, logVMAction } = deps;
  const run = (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { if (e) rej(e); else res(this); }));
  const get = (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
  const all = (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
  const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error('[lifecycle]', e.message);
    if (!res.headersSent) res.status(500).json({ error: e.message });
  });
  const emitSafe = (event, data) => { try { if (emit) emit(event, data); } catch (e) { /* never block the request */ } };

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS status_samples (id INTEGER PRIMARY KEY AUTOINCREMENT, ts DATETIME DEFAULT CURRENT_TIMESTAMP,
      vms_total INTEGER, vms_running INTEGER, ram_free_pct REAL, disk_free_pct REAL)`);
    db.run(`CREATE TABLE IF NOT EXISTS giveaway_codes (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL,
      batch TEXT, claimed_by TEXT, claimed_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS vm_backups (id INTEGER PRIMARY KEY AUTOINCREMENT, vm_id INTEGER NOT NULL, file TEXT NOT NULL,
      size_bytes INTEGER, note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  });

  const vmStopped = (vm) => vm.status !== 'running';

  // ---------- Expiry, renewal, suspend ----------
  app.post('/api/admin/vms/:id/expiry', checkAuth, checkAdmin, h(async (req, res) => {
    const vm = await get(`SELECT vm_id, expires_at FROM vms WHERE vm_id = ?`, [req.params.id]);
    if (!vm) return res.status(404).json({ error: 'VM not found' });
    const b = req.body || {};
    let next = null;
    if (b.clear) next = null;
    else if (b.add_days !== undefined) {
      const days = Number(b.add_days);
      if (!Number.isFinite(days) || days <= 0 || days > 3650) return res.status(400).json({ error: 'add_days must be 1-3650' });
      const base = Math.max(Date.now(), (parseDb(vm.expires_at) || new Date(0)).getTime());
      next = new Date(base + days * DAY);
    } else if (b.days !== undefined) {
      const days = Number(b.days);
      if (!Number.isFinite(days) || days <= 0 || days > 3650) return res.status(400).json({ error: 'days must be 1-3650' });
      next = new Date(Date.now() + days * DAY);
    } else return res.status(400).json({ error: 'Send days, add_days (renew) or clear' });
    await run(`UPDATE vms SET expires_at = ? WHERE vm_id = ?`, [next ? fmt(next) : null, vm.vm_id]);
    if (logVMAction) logVMAction(vm.vm_id, 'expiry', 'completed', next ? `Expiry set to ${fmt(next)} UTC` : 'Expiry cleared');
    res.json({ success: true, expires_at: next ? fmt(next) : null });
  }));

  async function suspendVm(vmId, reason) {
    const vm = await get(`SELECT * FROM vms WHERE vm_id = ?`, [vmId]);
    if (!vm) return { ok: false, error: 'VM not found' };
    if (vm.status === 'running') {
      const r = await power(vmId, 'stop');
      if (!r.ok) return { ok: false, error: 'Could not stop the VM: ' + r.error };
    }
    await run(`UPDATE vms SET suspended = 1, suspend_reason = ?, suspended_at = CURRENT_TIMESTAMP WHERE vm_id = ?`, [reason, vmId]);
    if (logVMAction) logVMAction(vmId, 'suspend', 'completed', `Suspended: ${reason}`);
    emitSafe('vm.suspended', { vm_id: vmId, vm_name: vm.vm_name, reason });
    return { ok: true };
  }

  async function unsuspendVm(vmId) {
    const vm = await get(`SELECT vm_id, vm_name FROM vms WHERE vm_id = ?`, [vmId]);
    if (!vm) return { ok: false, error: 'VM not found' };
    await run(`UPDATE vms SET suspended = 0, suspend_reason = NULL, suspended_at = NULL WHERE vm_id = ?`, [vmId]);
    if (logVMAction) logVMAction(vmId, 'unsuspend', 'completed', 'Unsuspended');
    emitSafe('vm.unsuspended', { vm_id: vmId, vm_name: vm.vm_name });
    return { ok: true };
  }

  app.post('/api/admin/vms/:id/suspend', checkAuth, checkAdmin, h(async (req, res) => {
    const reason = String(req.body && req.body.reason || '').trim().slice(0, 200);
    if (reason.length < 3) return res.status(400).json({ error: 'Give a reason (at least 3 characters). It is shown to the customer.' });
    const r = await suspendVm(req.params.id, reason);
    res.status(r.ok ? 200 : 400).json(r.ok ? { success: true } : { error: r.error });
  }));

  app.post('/api/admin/vms/:id/unsuspend', checkAuth, checkAdmin, h(async (req, res) => {
    const r = await unsuspendVm(req.params.id);
    res.status(r.ok ? 200 : 404).json(r.ok ? { success: true } : { error: r.error });
  }));

  app.get('/api/admin/vms/expiring', checkAuth, checkAdmin, h(async (req, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 7));
    const until = fmt(new Date(Date.now() + days * DAY));
    res.json(await all(`SELECT vm_id, vm_name, status, suspended, expires_at, owner_id FROM vms
                        WHERE expires_at IS NOT NULL AND expires_at <= ? ORDER BY expires_at`, [until]));
  }));

  // Everything the admin lifecycle page needs in one call
  app.get('/api/admin/lifecycle/vms', checkAuth, checkAdmin, h(async (req, res) => {
    res.json(await all(`SELECT v.vm_id, v.vm_name, v.status, v.desired_state, v.suspended, v.suspend_reason, v.expires_at,
      v.owner_id, v.memory, v.cpus, v.disk_size, u.username AS owner_name
      FROM vms v LEFT JOIN users u ON u.id = v.owner_id ORDER BY v.vm_id`));
  }));

  // Bulk actions: start, stop, restart, suspend (needs reason), unsuspend
  app.post('/api/admin/vms/bulk', checkAuth, checkAdmin, h(async (req, res) => {
    const action = String(req.body && req.body.action || '');
    const ids = Array.isArray(req.body && req.body.vm_ids) ? req.body.vm_ids.map(Number).filter(Number.isInteger) : [];
    const reason = String(req.body && req.body.reason || '').trim().slice(0, 200);
    if (!['start', 'stop', 'restart', 'suspend', 'unsuspend'].includes(action)) return res.status(400).json({ error: 'Unknown action' });
    if (!ids.length) return res.status(400).json({ error: 'Select at least one VM' });
    if (ids.length > 100) return res.status(400).json({ error: 'At most 100 VMs at a time' });
    if (action === 'suspend' && reason.length < 3) return res.status(400).json({ error: 'Give a reason to suspend' });
    const results = [];
    for (const id of ids) {
      let r;
      if (action === 'suspend') r = await suspendVm(id, reason);
      else if (action === 'unsuspend') r = await unsuspendVm(id);
      else r = await power(id, action);
      results.push({ vm_id: id, ok: !!r.ok, error: r.error || null });
    }
    res.json({ action, results, done: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length });
  }));

  // ---------- Expiry job, watchdog, status samples, alerts ----------
  async function enforceExpiry() {
    const rows = await all(`SELECT vm_id FROM vms WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP AND suspended = 0`);
    for (const r of rows) await suspendVm(r.vm_id, 'expired: renew to turn the VM back on');
    return rows.length;
  }

  // VMs with desired_state = running that are stopped now (host or panel restarted) are started again.
  async function watchdog() {
    const rows = await all(`SELECT vm_id, vm_name FROM vms WHERE desired_state = 'running' AND status != 'running' AND suspended = 0`);
    const out = [];
    for (const r of rows) {
      const res2 = await power(r.vm_id, 'start');
      out.push({ vm_id: r.vm_id, ok: res2.ok, error: res2.error || null });
      emitSafe('vm.autostart', { vm_id: r.vm_id, vm_name: r.vm_name, ok: res2.ok });
      await new Promise((r2) => setTimeout(r2, 3000));
    }
    return out;
  }

  function hostUsage() {
    const ramFreePct = (os.freemem() / os.totalmem()) * 100;
    let diskFreePct = null;
    try {
      const st = fs.statfsSync(backupDir && fs.existsSync(backupDir) ? backupDir : os.homedir());
      diskFreePct = (st.bavail / st.blocks) * 100;
    } catch (e) { diskFreePct = null; }
    return { ram_free_pct: Math.round(ramFreePct * 10) / 10, disk_free_pct: diskFreePct === null ? null : Math.round(diskFreePct * 10) / 10 };
  }

  let lastAlertAt = 0;
  async function sampleStatus() {
    const counts = await get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running FROM vms`);
    const u = hostUsage();
    await run(`INSERT INTO status_samples (vms_total, vms_running, ram_free_pct, disk_free_pct) VALUES (?, ?, ?, ?)`,
      [counts.total || 0, counts.running || 0, u.ram_free_pct, u.disk_free_pct]);
    const alerts = alertList(u);
    if (alerts.length && Date.now() - lastAlertAt > 60 * 60 * 1000) {
      lastAlertAt = Date.now();
      emitSafe('host.alert', { alerts, ...u });
    }
  }

  function alertList(u) {
    const out = [];
    if (u.ram_free_pct < RAM_ALERT_PCT) out.push(`RAM free ${u.ram_free_pct}% (below ${RAM_ALERT_PCT}%)`);
    if (u.disk_free_pct !== null && u.disk_free_pct < DISK_ALERT_PCT) out.push(`Disk free ${u.disk_free_pct}% (below ${DISK_ALERT_PCT}%)`);
    return out;
  }

  app.get('/api/admin/alerts', checkAuth, checkAdmin, h(async (req, res) => {
    const u = hostUsage();
    res.json({ ...u, alerts: alertList(u), thresholds: { ram_free_pct: RAM_ALERT_PCT, disk_free_pct: DISK_ALERT_PCT } });
  }));

  // Public status: no host details, only panel state and 24-hour uptime (samples exist only while the panel is up)
  async function statusSummary() {
    const counts = await get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running FROM vms`);
    const since = fmt(new Date(Date.now() - DAY));
    const s = await get(`SELECT COUNT(*) AS n FROM status_samples WHERE ts >= ?`, [since]);
    const uptime = Math.min(100, Math.round(((s && s.n) || 0) / 1440 * 1000) / 10);
    return { panel: 'up', vms_total: counts.total || 0, vms_running: counts.running || 0, uptime_24h_pct: uptime, checked_at: fmt(new Date()) + ' UTC' };
  }
  app.get('/api/status', h(async (req, res) => res.json(await statusSummary())));
  app.get('/status', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'status.html')));

  app.get('/api/status/history', h(async (req, res) => {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
    const rows = await all(`SELECT substr(ts, 1, 10) AS day, COUNT(*) AS samples FROM status_samples WHERE ts >= ? GROUP BY day ORDER BY day`,
      [fmt(new Date(Date.now() - days * DAY))]);
    res.json(rows.map((r) => ({ day: r.day, uptime_pct: Math.min(100, Math.round(r.samples / 1440 * 1000) / 10) })));
  }));

  // ---------- Snapshot restore and delete (qemu-img on the qcow2 disk; VM must be off) ----------
  const SNAP_RE = /^[a-zA-Z0-9_.-]{1,64}$/;
  async function ownedVm(req, vmId) {
    const isAdmin = req.session.role === 'admin';
    return get(`SELECT * FROM vms WHERE vm_id = ?${isAdmin ? '' : ' AND owner_id = ?'}`, isAdmin ? [vmId] : [vmId, req.session.userId]);
  }

  app.post('/api/vms/:vm_id/snapshots/:sid/restore', checkAuth, h(async (req, res) => {
    const vm = await ownedVm(req, req.params.vm_id);
    if (!vm) return res.status(404).json({ error: 'VM not found or access denied' });
    const snap = await get(`SELECT * FROM vm_snapshots WHERE snapshot_id = ? AND vm_id = ?`, [req.params.sid, vm.vm_id]);
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
    if (!vmStopped(vm)) return res.status(409).json({ error: 'Stop the VM first. Restore works only while the VM is off.' });
    if (!SNAP_RE.test(snap.snapshot_name || '')) return res.status(400).json({ error: 'Bad snapshot name' });
    try {
      await execFilePromise('qemu-img', ['snapshot', '-a', snap.snapshot_name, vm.disk_file]);
    } catch (e) {
      return res.status(500).json({ error: 'Restore failed: ' + String(e.stderr || e.message).slice(0, 300) });
    }
    if (logVMAction) logVMAction(vm.vm_id, 'snapshot', 'completed', `Restored snapshot ${snap.snapshot_name}`);
    res.json({ success: true });
  }));

  app.delete('/api/vms/:vm_id/snapshots/:sid', checkAuth, h(async (req, res) => {
    const vm = await ownedVm(req, req.params.vm_id);
    if (!vm) return res.status(404).json({ error: 'VM not found or access denied' });
    const snap = await get(`SELECT * FROM vm_snapshots WHERE snapshot_id = ? AND vm_id = ?`, [req.params.sid, vm.vm_id]);
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
    if (!vmStopped(vm)) return res.status(409).json({ error: 'Stop the VM first.' });
    if (!SNAP_RE.test(snap.snapshot_name || '')) return res.status(400).json({ error: 'Bad snapshot name' });
    try {
      await execFilePromise('qemu-img', ['snapshot', '-d', snap.snapshot_name, vm.disk_file]);
    } catch (e) {
      return res.status(500).json({ error: 'Delete failed: ' + String(e.stderr || e.message).slice(0, 300) });
    }
    await run(`DELETE FROM vm_snapshots WHERE snapshot_id = ?`, [snap.snapshot_id]);
    res.json({ success: true });
  }));

  // ---------- Local backups (offline copy of the VM disk) ----------
  const ensureBackupDir = () => fs.promises.mkdir(backupDir, { recursive: true });

  async function backupDisk(vm, note) {
    if (!vm.disk_file || !fs.existsSync(vm.disk_file)) throw new Error('VM disk file not found');
    await ensureBackupDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(backupDir, `vm-${vm.vm_id}-${stamp}.qcow2`);
    await fs.promises.copyFile(vm.disk_file, file);
    const st = await fs.promises.stat(file);
    const r = await run(`INSERT INTO vm_backups (vm_id, file, size_bytes, note) VALUES (?, ?, ?, ?)`, [vm.vm_id, file, st.size, note]);
    return r.lastID;
  }

  app.post('/api/admin/vms/:id/backup', checkAuth, checkAdmin, h(async (req, res) => {
    const vm = await get(`SELECT * FROM vms WHERE vm_id = ?`, [req.params.id]);
    if (!vm) return res.status(404).json({ error: 'VM not found' });
    if (!vmStopped(vm)) return res.status(409).json({ error: 'Stop the VM first. A backup is a copy of a disk that is not in use.' });
    try {
      const id = await backupDisk(vm, String(req.body && req.body.note || 'manual').slice(0, 100));
      if (logVMAction) logVMAction(vm.vm_id, 'backup', 'completed', `Backup #${id} created`);
      res.json({ success: true, backup_id: id });
    } catch (e) { res.status(500).json({ error: 'Backup failed: ' + e.message }); }
  }));

  app.get('/api/admin/vms/:id/backups', checkAuth, checkAdmin, h(async (req, res) => {
    res.json(await all(`SELECT id, vm_id, size_bytes, note, created_at FROM vm_backups WHERE vm_id = ? ORDER BY id DESC`, [req.params.id]));
  }));

  app.post('/api/admin/backups/:bid/restore', checkAuth, checkAdmin, h(async (req, res) => {
    const b = await get(`SELECT * FROM vm_backups WHERE id = ?`, [req.params.bid]);
    if (!b) return res.status(404).json({ error: 'Backup not found' });
    const vm = await get(`SELECT * FROM vms WHERE vm_id = ?`, [b.vm_id]);
    if (!vm) return res.status(404).json({ error: 'VM not found' });
    if (!vmStopped(vm)) return res.status(409).json({ error: 'Stop the VM first.' });
    if (!fs.existsSync(b.file)) return res.status(410).json({ error: 'Backup file is missing on disk' });
    const safetyId = await backupDisk(vm, `before restore of #${b.id}`);   // safety copy of the current disk
    await fs.promises.copyFile(b.file, vm.disk_file);
    if (logVMAction) logVMAction(vm.vm_id, 'restore', 'completed', `Restored backup #${b.id} (safety copy #${safetyId})`);
    res.json({ success: true, safety_backup_id: safetyId });
  }));

  app.get('/api/admin/backups/:bid/download', checkAuth, checkAdmin, h(async (req, res) => {
    const b = await get(`SELECT * FROM vm_backups WHERE id = ?`, [req.params.bid]);
    if (!b || !fs.existsSync(b.file)) return res.status(404).json({ error: 'Backup not found' });
    res.download(b.file, path.basename(b.file));
  }));

  app.delete('/api/admin/backups/:bid', checkAuth, checkAdmin, h(async (req, res) => {
    const b = await get(`SELECT * FROM vm_backups WHERE id = ?`, [req.params.bid]);
    if (!b) return res.status(404).json({ error: 'Backup not found' });
    if (fs.existsSync(b.file)) await fs.promises.unlink(b.file);
    await run(`DELETE FROM vm_backups WHERE id = ?`, [b.id]);
    res.json({ success: true });
  }));

  const normCode = (c) => String(c || '').trim().toUpperCase().slice(0, 32);

  // ---------- Giveaway codes (one-time claim) ----------
  app.post('/api/admin/giveaways', checkAuth, checkAdmin, h(async (req, res) => {
    const count = Math.min(500, Math.max(1, Math.floor(Number(req.body && req.body.count) || 0)));
    const prefix = String(req.body && req.body.prefix || 'SC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'SC';
    const batch = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
    const codes = [];
    const crypto = require('crypto');
    for (let i = 0; i < count; i++) {
      const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
      const code = `${prefix}-${raw.slice(0, 6)}-${raw.slice(6, 12)}`;
      await run(`INSERT OR IGNORE INTO giveaway_codes (code, batch) VALUES (?, ?)`, [code, batch]);
      codes.push(code);
    }
    res.json({ success: true, batch, codes });
  }));

  app.get('/api/admin/giveaways', checkAuth, checkAdmin, h(async (req, res) => {
    res.json(await all(`SELECT code, batch, claimed_by, claimed_at FROM giveaway_codes ORDER BY id DESC LIMIT 500`));
  }));

  app.post('/api/giveaways/claim', checkAuth, h(async (req, res) => {
    const code = normCode(req.body && req.body.code);
    const user = await get(`SELECT username FROM users WHERE id = ?`, [req.session.userId]);
    const r = await run(`UPDATE giveaway_codes SET claimed_by = ?, claimed_at = CURRENT_TIMESTAMP WHERE code = ? AND claimed_by IS NULL`,
      [user ? user.username : String(req.session.userId), code]);
    if (!r.changes) return res.status(409).json({ error: 'Code not found or already claimed' });
    res.json({ success: true, note: 'Claimed. The admin will apply the reward.' });
  }));

  // ---------- Admin page ----------
  app.get('/admin/lifecycle', checkAuth, checkAdmin, (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'lifecycle.html')));

  // ---------- Background jobs ----------
  function startBackgroundJobs() {
    setTimeout(() => { watchdog().then((r) => r.length && console.log(`[Watchdog] started ${r.filter((x) => x.ok).length}/${r.length} VMs`)).catch(() => {}); }, 20000);
    setInterval(() => enforceExpiry().catch((e) => console.error('[Expiry]', e.message)), 5 * 60 * 1000);
    setInterval(() => sampleStatus().catch((e) => console.error('[Status]', e.message)), 60 * 1000);
    setInterval(() => run(`DELETE FROM status_samples WHERE ts < ?`, [fmt(new Date(Date.now() - 90 * DAY))]).catch(() => {}), 60 * 60 * 1000);
    setTimeout(() => sampleStatus().catch(() => {}), 5000);
  }

  return { startBackgroundJobs, suspendVm, unsuspendVm, enforceExpiry };
};
