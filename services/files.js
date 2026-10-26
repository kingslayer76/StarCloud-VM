// VM file manager backend: talks to the guest VM over SFTP (SSH file transfer)
// using the VM's own SSH login on the forwarded SSH port (127.0.0.1:ssh_port).
const { Client } = require('ssh2');
const posix = require('path').posix;

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
    if (!vm.ssh_port || !vm.username || !vm.password) {
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
        resolve({ sftp, close: () => { try { conn.end(); } catch (e) { /* ignore */ } } });
      });
    });
    conn.on('error', fail);
    conn.connect({
      host: '127.0.0.1',
      port: parseInt(vm.ssh_port, 10),
      username: vm.username,
      password: vm.password,
      readyTimeout: 10000,
      keepaliveInterval: 10000
    });
  });
}

function sftpCall(sftp, method, ...args) {
  return new Promise((resolve, reject) => {
    sftp[method](...args, (err, result) => (err ? reject(err) : resolve(result)));
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

async function readText(sftp, file) {
  const st = await sftpCall(sftp, 'stat', file);
  if (st.isDirectory()) throw Object.assign(new Error('That is a folder, not a file'), { status: 400 });
  if (st.size > MAX_EDIT_BYTES) throw Object.assign(new Error('File is larger than 2 MB; download it instead'), { status: 413 });
  const buf = await sftpCall(sftp, 'readFile', file);
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
  MAX_UPLOAD_BYTES, MAX_EDIT_BYTES, safePath, openSftp, sftpCall, list, readText, writeText, removeRecursive
};
