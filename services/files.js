// VM file manager backend: talks to the guest VM over SFTP (SSH file transfer)
// using the VM own SSH login. Target comes from services/vm-access.js sshTarget() (NAT port forward or bridge IP).
const { Client } = require('ssh2');
const posix = require('path').posix;
const { sshTarget } = require('./vm-access');

const MAX_EDIT_BYTES = 2 * 1024 * 1024;        // text editor limit
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB per upload
const MAX_DELETE_DEPTH = 32;

function safePath(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > 4096 || p.includes('\0') || !p.startsWith('/')) {
    const err = new Error('Path must be an absolute path starting with /');
    err.status = 400;
    throw err;
  }
  return posix.normalize(p);
}

function openSftp(vm) {
  return new Promise((resolve, reject) => {
    const target = sshTarget(vm);
    if (!target || !vm.username || !vm.password) {
      return reject(Object.assign(new Error('VM has no SSH login saved'), { status: 409 }));
    }
    const conn = new Client();
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      try { conn.end(); } catch (e) { /* ignore */ }
      reject(Object.assign(new Error(`Could not connect to VM over SSH: ${err.message}`), { status: 503 }));
    };
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) return fail(err);
        settled = true;
        // Connection lost mid-operation: wake every pending SFTP request with an error (no hang).
        const lost = (e) => {
          const msg = e && e.message ? e.message : 'connection closed';
          (sftp.__pending || []).forEach((cb) => cb(Object.assign(new Error(`SSH connection to the VM was lost (${msg})`), { status: 503 })));
        };
        sftp.__pending = [];
        conn.on('error', lost);
        conn.on('close', () => lost(null));
        resolve({ sftp, close: () => { try { conn.end(); } catch (e) { /* ignore */ } } });
      });
    });
    conn.on('error', fail);
    conn.connect({
      host: target.host,
      port: target.port,
      username: vm.username,
      password: vm.password,
      readyTimeout: 10000,
      keepaliveInterval: 10000
    });
  });
}

// SFTP status codes: 2 = NO_SUCH_FILE, 3 = PERMISSION_DENIED
function sftpCall(sftp, method, ...args) {
  return new Promise((resolve, reject) => {
    let done = false;
    const pending = sftp.__pending;
    const finish = (fn, v) => {
      if (done) return;
      done = true;
      if (pending) { const i = pending.indexOf(onLost); if (i >= 0) pending.splice(i, 1); }
      fn(v);
    };
    const onLost = (e) => finish(reject, e);
    if (pending) pending.push(onLost);
    sftp[method](...args, (err, result) => {
      if (!err) return finish(resolve, result);
      if (err.code === 2) return finish(reject, Object.assign(new Error('File or folder not found'), { status: 404 }));
      if (err.code === 3) return finish(reject, Object.assign(new Error('Permission denied by the VM (check the file owner)'), { status: 403 }));
      if (err.code === 4) return finish(reject, Object.assign(new Error('The VM refused the request (a file or folder with this name may already exist, or the folder is read-only)'), { status: 409 }));
      finish(reject, err);
    });
  });
}

function typeOf(attrs) {
  if (attrs.isDirectory()) return 'dir';
  if (attrs.isSymbolicLink()) return 'link';
  if (attrs.isFile()) return 'file';
  return 'other';
}

async function list(sftp, dir) {
  const entries = await sftpCall(sftp, 'readdir', dir);
  return entries
    .filter(e => e.filename !== '.' && e.filename !== '..')
    .map(e => ({
      name: e.filename,
      type: typeOf(e.attrs),
      size: e.attrs.size,
      mode: (e.attrs.mode & 0o777).toString(8).padStart(3, '0'),
      mtime: e.attrs.mtime ? new Date(e.attrs.mtime * 1000).toISOString() : null
    }))
    .sort((a, b) => (a.type === 'dir' && b.type !== 'dir' ? -1 : b.type === 'dir' && a.type !== 'dir' ? 1 : a.name.localeCompare(b.name)));
}

// Reads a whole file in small chunks (32 KB). ssh2's readFile() asks for the whole file in one
// request, which some SSH servers answer with one oversized packet; chunking avoids that.
async function readCapped(sftp, file, limit) {
  const handle = await sftpCall(sftp, 'open', file, 'r');
  const parts = [];
  let total = 0;
  try {
    for (;;) {
      const chunk = Buffer.alloc(32768);
      const n = await new Promise((resolve, reject) => {
        sftp.read(handle, chunk, 0, chunk.length, total, (err, nread) => (err ? reject(err) : resolve(nread)));
      });
      if (!n) break;
      total += n;
      if (total > limit) throw Object.assign(new Error('File is larger than 2 MB; download it instead'), { status: 413 });
      parts.push(chunk.subarray(0, n));
    }
  } finally {
    await new Promise((resolve) => sftp.close(handle, () => resolve()));
  }
  return Buffer.concat(parts);
}

async function readText(sftp, file) {
  const st = await sftpCall(sftp, 'stat', file);
  if (st.isDirectory()) throw Object.assign(new Error('That is a folder, not a file'), { status: 400 });
  if (st.size > MAX_EDIT_BYTES) throw Object.assign(new Error('File is larger than 2 MB; download it instead'), { status: 413 });
  const buf = await readCapped(sftp, file, MAX_EDIT_BYTES);
  // Binary = contains a NUL byte, or is not valid UTF-8 (round-trip check)
  const text = buf.toString('utf8');
  if (buf.includes(0) || !Buffer.from(text, 'utf8').equals(buf)) {
    throw Object.assign(new Error('Binary file; download it instead of editing'), { status: 415 });
  }
  return text;
}

async function writeText(sftp, file, content) {
  if (typeof content !== 'string') throw Object.assign(new Error('content must be text'), { status: 400 });
  if (Buffer.byteLength(content, 'utf8') > MAX_EDIT_BYTES) throw Object.assign(new Error('Text is larger than 2 MB'), { status: 413 });
  await sftpCall(sftp, 'writeFile', file, Buffer.from(content, 'utf8'));
}

async function removeRecursive(sftp, target, depth = 0) {
  if (depth > MAX_DELETE_DEPTH) throw Object.assign(new Error('Folder tree too deep'), { status: 400 });
  const st = await sftpCall(sftp, 'lstat', target);
  if (st.isDirectory()) {
    const children = await sftpCall(sftp, 'readdir', target);
    for (const c of children) {
      if (c.filename === '.' || c.filename === '..') continue;
      await removeRecursive(sftp, posix.join(target, c.filename), depth + 1);
    }
    await sftpCall(sftp, 'rmdir', target);
  } else {
    await sftpCall(sftp, 'unlink', target);
  }
}

module.exports = {
  MAX_UPLOAD_BYTES, MAX_EDIT_BYTES, safePath, openSftp, sftpCall, list, readText, writeText, removeRecursive, readCapped
};
