// Host operations for admins: capability report, maintenance mode, emergency stop/reboot-all,
// and the audit log. Page: /admin/operations
const { detectKvm } = require('../services/capabilities');
const { listAudit, toCsv, auditFromReq } = require('../services/audit');

module.exports = function mountOps(app, ctx) {
  const { db, checkAdmin, stopVmProcess, startVm, getMaintenance, setMaintenance } = ctx;

  function apiAdmin(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Login required' });
    if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    next();
  }

  const allVms = () => new Promise((resolve, reject) =>
    db.all(`SELECT * FROM vms`, (err, rows) => (err ? reject(err) : resolve(rows))));

  app.get('/api/admin/operations', apiAdmin, async (req, res) => {
    try {
      const vms = await allVms();
      res.json({
        capabilities: detectKvm(),
        maintenance: getMaintenance(),
        vms: {
          total: vms.length,
          running: vms.filter(v => v.status === 'running').length,
          stopped: vms.filter(v => v.status !== 'running').length
        }
      });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/maintenance', apiAdmin, async (req, res) => {
    const enabled = req.body.enabled === true || req.body.enabled === 1 || req.body.enabled === '1';
    const message = String(req.body.message || '').slice(0, 300);
    try {
      await setMaintenance(enabled, message);
      await auditFromReq(db, req, 'maintenance.set', 'panel', 'ok', `enabled=${enabled}`);
      res.json({ success: true, maintenance: getMaintenance() });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  function requireConfirm(word) {
    return (req, res, next) => {
      if (String(req.body.confirm || '').trim() !== word) {
        return res.status(400).json({ error: `Type ${word} exactly to confirm` });
      }
      next();
    };
  }

  app.post('/api/admin/emergency/stop-all', apiAdmin, requireConfirm('STOP ALL'), async (req, res) => {
    try {
      const running = (await allVms()).filter(v => v.status === 'running');
      const results = await Promise.all(running.map(async vm => ({ vm_id: vm.vm_id, name: vm.vm_name, stopped: await stopVmProcess(vm) })));
      await auditFromReq(db, req, 'emergency.stop_all', 'all VMs', 'ok', `count=${results.length}`);
      res.json({ success: true, count: results.length, results });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/emergency/reboot-all', apiAdmin, requireConfirm('REBOOT ALL'), async (req, res) => {
    try {
      const running = (await allVms()).filter(v => v.status === 'running');
      // Wait for every VM to power off (graceful) before starting them again
      await Promise.all(running.map(vm => stopVmProcess(vm)));
      const results = [];
      for (const vm of running) {
        try {
          await startVm(vm);
          results.push({ vm_id: vm.vm_id, name: vm.vm_name, started: true });
        } catch (e) {
          results.push({ vm_id: vm.vm_id, name: vm.vm_name, started: false, error: e.message });
        }
      }
      await auditFromReq(db, req, 'emergency.reboot_all', 'all VMs', 'ok', `count=${results.length}`);
      res.json({ success: true, count: results.length, results });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/admin/audit', apiAdmin, async (req, res) => {
    try { res.json(await listAudit(db, req.query.limit)); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/admin/audit.csv', apiAdmin, async (req, res) => {
    try {
      const rows = await listAudit(db, req.query.limit || 5000);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="starcloud-audit.csv"');
      res.send(toCsv(rows));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Operations was merged into Settings (Host virtualization -> System Info, Maintenance + Emergency -> General).
  app.get('/admin/operations', checkAdmin, (req, res) => res.redirect('/admin/settings#general'));
};
