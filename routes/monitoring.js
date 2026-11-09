// Monitoring and boot-log routes.
//   GET /health                       public, minimal: panel + database status (no secrets, no VM data)
//   GET /metrics                      Prometheus text. Admin session, or header "Authorization: Bearer $METRICS_TOKEN"
//   GET /api/vms/:vm_id/bootlog       last lines of the VM's QEMU log (owner or admin)
//   GET /vm/:id/bootlog               customer page for the boot log
//   GET /admin/vm/:id/bootlog         admin page for the boot log
const { canAccessVm } = require('../services/vm-access');

const STARTED_AT = Date.now();
const ANSI = /\x1b\[[0-9;?]*[ -\/]*[@-~]/g;

function bootLogLines(runtime, vmId, maxLines) {
  const buf = runtime.logTail(vmId, 256 * 1024);
  const raw = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf || '');
  const lines = raw.replace(ANSI, '').replace(/\r/g, '').split('\n');
  return lines.slice(-maxLines).join('\n');
}

module.exports = function mountMonitoring(app, ctx) {
  const { db, runtime } = ctx;

  const dbGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (e, r) => (e ? reject(e) : resolve(r))));
  const dbAll = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (e, r) => (e ? reject(e) : resolve(r))));

  // ---- /health ----------------------------------------------------------------
  app.get('/health', async (req, res) => {
    let dbOk = false;
    try { await dbGet('SELECT 1 AS ok'); dbOk = true; } catch (e) { dbOk = false; }
    res.set('Cache-Control', 'no-store');
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      database: dbOk ? 'ok' : 'error',
      uptime_seconds: Math.floor((Date.now() - STARTED_AT) / 1000),
      time: new Date().toISOString()
    });
  });

  // ---- /metrics ---------------------------------------------------------------
  function metricsAllowed(req) {
    if (req.session && req.session.role === 'admin') return true;
    const token = process.env.METRICS_TOKEN;
    const auth = req.headers.authorization || '';
    return !!token && auth === `Bearer ${token}`;
  }

  app.get('/metrics', async (req, res) => {
    if (!metricsAllowed(req)) return res.status(401).type('text/plain').send('Unauthorized\n');
    try {
      const rows = await dbAll('SELECT vm_id, status FROM vms');
      const byStatus = {};
      let running = 0;
      for (const r of rows) {
        byStatus[r.status || 'unknown'] = (byStatus[r.status || 'unknown'] || 0) + 1;
        if (runtime.isRunning(r.vm_id)) running++;
      }
      const lines = [
        '# HELP starcloud_up Panel is serving requests (always 1 when this answers).',
        '# TYPE starcloud_up gauge',
        'starcloud_up 1',
        '# HELP starcloud_uptime_seconds Seconds since the panel process started.',
        '# TYPE starcloud_uptime_seconds gauge',
        `starcloud_uptime_seconds ${Math.floor((Date.now() - STARTED_AT) / 1000)}`,
        '# HELP starcloud_vms Number of VMs by database status.',
        '# TYPE starcloud_vms gauge'
      ];
      for (const [status, n] of Object.entries(byStatus)) {
        lines.push(`starcloud_vms{status="${status.replace(/[^a-z_]/gi, '')}"} ${n}`);
      }
      lines.push('# HELP starcloud_vms_running VMs with a live QEMU process.', '# TYPE starcloud_vms_running gauge', `starcloud_vms_running ${running}`);
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.set('Cache-Control', 'no-store');
      res.send(lines.join('\n') + '\n');
    } catch (e) {
      res.status(500).type('text/plain').send('metrics unavailable\n');
    }
  });

  // ---- boot log -----------------------------------------------------------------
  function loadVmForLog(req, res, next) {
    db.get('SELECT vm_id, vm_name, owner_id, status FROM vms WHERE vm_id = ?', [req.params.vm_id || req.params.id], (err, vm) => {
      if (err || !vm || !canAccessVm(req.session, vm)) return res.status(404).json({ error: 'VM not found or access denied' });
      req.vm = vm;
      next();
    });
  }

  app.get('/api/vms/:vm_id/bootlog', (req, res, next) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Login required' });
    next();
  }, loadVmForLog, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      vm_id: req.vm.vm_id,
      running: runtime.isRunning(req.vm.vm_id) ? true : false,
      log: bootLogLines(runtime, req.vm.vm_id, 300)
    });
  });

  const bootPage = (asAdmin) => (req, res) => {
    if (!req.session || !req.session.userId) return res.redirect('/login');
    if (asAdmin && req.session.role !== 'admin') return res.redirect(`/vm/${req.params.id}/bootlog`);
    db.get('SELECT vm_id, vm_name, owner_id, status FROM vms WHERE vm_id = ?', [req.params.id], (err, vm) => {
      if (err || !vm || !canAccessVm(req.session, vm)) return res.status(404).send('VM not found or access denied');
      res.render('vm-bootlog', {
        title: `Boot log - ${vm.vm_name}`,
        currentPage: 'vms',
        cp: 'vms',
        vm,
        isAdmin: asAdmin,
        backUrl: asAdmin ? `/admin/vm/${vm.vm_id}` : `/vm/${vm.vm_id}`,
        apiUrl: `/api/vms/${vm.vm_id}/bootlog`,
        initialLog: bootLogLines(runtime, vm.vm_id, 300),
        initialRunning: runtime.isRunning(vm.vm_id) ? true : false
      });
    });
  };
  app.get('/vm/:id/bootlog', bootPage(false));
  app.get('/admin/vm/:id/bootlog', bootPage(true));
};
