// File manager routes. Available to admins (any VM) and to the VM owner (customer).
// API:  /api/vms/:vm_id/files/...   Pages: /vm/:id/files (customer), /admin/vm/:id/files (admin)
const express = require('express');
const path = require('path');
const files = require('../services/files');
const { auditFromReq } = require('../services/audit');

module.exports = function mountFileManager(app, ctx) {
  const { db } = ctx;

  function apiAuth(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Login required' });
    next();
  }

  function loadVm(req, res, next) {
    db.get(`SELECT * FROM vms WHERE vm_id = ?`, [req.params.vm_id], (err, vm) => {
      if (err || !vm) return res.status(404).json({ error: 'VM not found' });
      if (req.session.role !== 'admin' && vm.owner_id !== req.session.userId) {
        return res.status(404).json({ error: 'VM not found or access denied' });
      }
      req.vm = vm;
      next();
    });
  }

  function requireRunning(req, res, next) {
    if (req.vm.status !== 'running') {
      return res.status(409).json({ error: 'VM is stopped. Start the VM first, then open the file manager.' });
    }
    next();
  }

  // Runs fn(sftp) with a fresh SFTP session that is always closed afterwards.
  function withSftp(fn) {
    return async (req, res) => {
      let conn;
      try {
        conn = await files.openSftp(req.vm);
        await fn(req, res, conn.sftp);
      } catch (e) {
        if (!res.headersSent) res.status(e.status || 500).json({ error: e.message });
      } finally {
        if (conn) conn.close();
      }
    };
  }

  const api = express.Router({ mergeParams: true });
  api.use(apiAuth, loadVm, requireRunning);

  api.get('/list', withSftp(async (req, res, sftp) => {
    const dir = files.safePath(req.query.path || '/');
    const entries = await files.list(sftp, dir);
    res.json({ path: dir, entries });
  }));

  api.get('/read', withSftp(async (req, res, sftp) => {
    const file = files.safePath(req.query.path);
    const content = await files.readText(sftp, file);
    res.json({ path: file, content });
  }));

  api.put('/write', withSftp(async (req, res, sftp) => {
    const file = files.safePath(req.body.path);
    await files.writeText(sftp, file, req.body.content);
    auditFromReq(db, req, 'file.write', `vm-${req.vm.vm_id}:${file}`, 'ok');
    res.json({ success: true, path: file });
  }));

  api.post('/mkdir', withSftp(async (req, res, sftp) => {
    const dir = files.safePath(req.body.path);
    await files.sftpCall(sftp, 'mkdir', dir);
    auditFromReq(db, req, 'file.mkdir', `vm-${req.vm.vm_id}:${dir}`, 'ok');
    res.json({ success: true, path: dir });
  }));

  api.post('/rename', withSftp(async (req, res, sftp) => {
    const from = files.safePath(req.body.from);
    const to = files.safePath(req.body.to);
    await files.sftpCall(sftp, 'rename', from, to);
    auditFromReq(db, req, 'file.rename', `vm-${req.vm.vm_id}:${from} -> ${to}`, 'ok');
    res.json({ success: true, path: to });
  }));

  api.post('/chmod', withSftp(async (req, res, sftp) => {
    const target = files.safePath(req.body.path);
    const mode = String(req.body.mode || '');
    if (!/^[0-7]{3,4}$/.test(mode)) throw Object.assign(new Error('Mode must be octal like 644 or 755'), { status: 400 });
    await files.sftpCall(sftp, 'chmod', target, parseInt(mode, 8));
    auditFromReq(db, req, 'file.chmod', `vm-${req.vm.vm_id}:${target}`, 'ok', mode);
    res.json({ success: true, path: target, mode });
  }));

  api.post('/delete', withSftp(async (req, res, sftp) => {
    const target = files.safePath(req.body.path);
    if (target === '/') throw Object.assign(new Error('Refusing to delete the root folder'), { status: 400 });
    await files.removeRecursive(sftp, target);
    auditFromReq(db, req, 'file.delete', `vm-${req.vm.vm_id}:${target}`, 'ok');
    res.json({ success: true, path: target });
  }));

  // Download a single file (streamed; SFTP session closes when the response ends)
  api.get('/download', async (req, res) => {
    let conn;
    try {
      conn = await files.openSftp(req.vm);
      const target = files.safePath(req.query.path);
      const st = await files.sftpCall(conn.sftp, 'stat', target);
      if (st.isDirectory()) throw Object.assign(new Error('Folder download is not supported; download files one by one'), { status: 400 });
      const safeName = path.posix.basename(target).replace(/[^\w.\- ]/g, '_') || 'download';
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', st.size);
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      const rs = conn.sftp.createReadStream(target);
      res.on('close', () => { rs.destroy(); conn.close(); });
      rs.on('error', () => { res.destroy(); });
      rs.pipe(res);
      auditFromReq(db, req, 'file.download', `vm-${req.vm.vm_id}:${target}`, 'ok');
    } catch (e) {
      if (conn) conn.close();
      if (!res.headersSent) res.status(e.status || 500).json({ error: e.message });
    }
  });

  // Upload one file: POST raw body (application/octet-stream) to /upload?path=/dir/name.ext
  api.post('/upload', async (req, res) => {
    const len = parseInt(req.headers['content-length'], 10);
    if (!Number.isFinite(len)) return res.status(411).json({ error: 'Content-Length header required' });
    if (len > files.MAX_UPLOAD_BYTES) return res.status(413).json({ error: 'File is larger than the 2 GB upload limit' });
    let conn;
    try {
      const target = files.safePath(req.query.path);
      conn = await files.openSftp(req.vm);
      const ws = conn.sftp.createWriteStream(target);
      let received = 0;
      let finished = false;
      const done = (err) => {
        if (finished) return;
        finished = true;
        conn.close();
        if (err) {
          auditFromReq(db, req, 'file.upload', `vm-${req.vm.vm_id}:${target}`, 'error', err.message);
          if (!res.headersSent) res.status(500).json({ error: err.message });
        } else {
          auditFromReq(db, req, 'file.upload', `vm-${req.vm.vm_id}:${target}`, 'ok', `${received} bytes`);
          res.json({ success: true, path: target, bytes: received });
        }
      };
      ws.on('error', done);
      ws.on('close', () => done(null));
      req.on('data', (chunk) => { received += chunk.length; });
      req.on('aborted', () => { ws.destroy(new Error('Upload cancelled')); });
      req.pipe(ws);
    } catch (e) {
      if (conn) conn.close();
      if (!res.headersSent) res.status(e.status || 500).json({ error: e.message });
    }
  });

  app.use('/api/vms/:vm_id/files', api);

  // Pages
  const renderPage = (asAdmin) => (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const isAdmin = req.session.role === 'admin';
    if (asAdmin && !isAdmin) return res.redirect('/vm/' + req.params.id + '/files');
    db.get(`SELECT vm_id, vm_name, status, username, owner_id FROM vms WHERE vm_id = ?`, [req.params.id], (err, vm) => {
      if (err || !vm) return res.status(404).send('VM not found');
      if (!isAdmin && vm.owner_id !== req.session.userId) return res.status(404).send('VM not found or access denied');
      res.render('vm-files', {
        title: `Files - ${vm.vm_name}`,
        currentPage: 'vms',
        cp: 'vms',
        vm,
        isAdmin,
        backUrl: isAdmin ? `/admin/vm/${vm.vm_id}` : `/vm/${vm.vm_id}`,
        defaultPath: vm.username === 'root' ? '/root' : `/home/${vm.username}`,
        maxUploadMb: Math.floor(files.MAX_UPLOAD_BYTES / (1024 * 1024)),
        maxEditKb: Math.floor(files.MAX_EDIT_BYTES / 1024)
      });
    });
  };
  app.get('/vm/:id/files', renderPage(false));
  app.get('/admin/vm/:id/files', renderPage(true));
};
