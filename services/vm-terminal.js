// Browser terminals for VMs, served over WebSocket:
//   /ws/console/:vmId  serial console (attaches to the VM's serial socket)
//   /ws/ssh/:vmId      SSH shell into the guest (password login)
//
// Auth: the WebSocket upgrade reuses the panel session cookie. Only the VM owner
// or an admin is accepted; everyone else gets 401/404 before the upgrade.
//
// Protocol (client -> server, JSON text):
//   {type:'connect', username, password, cols, rows}   (ssh only, first message)
//   {type:'input', data}                               (keyboard input)
//   {type:'resize', cols, rows}                        (terminal size)
// Server -> client: binary frames are terminal output; text frames are JSON status:
//   {type:'status', state:'connecting'|'connected'|'closed'|'error'|'stopped', message}
const http = require('http');
const fs = require('fs');
const net = require('net');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const { sshTarget, canAccessVm } = require('./vm-access');

const MAX_PAYLOAD = 1024 * 1024;

function attachTerminals({ server, sessionMiddleware, db, runtime }) {
  const wss = new WebSocket.Server({ noServer: true, maxPayload: MAX_PAYLOAD });

  function rejectUpgrade(socket, code, text) {
    try {
      socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    } catch (e) { /* socket may already be gone */ }
    socket.destroy();
  }

  server.on('upgrade', (req, socket, head) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname;
    } catch (e) {
      return rejectUpgrade(socket, 400, 'Bad Request');
    }
    const match = pathname.match(/^\/ws\/(console|ssh)\/(\d+)$/);
    if (!match) return rejectUpgrade(socket, 404, 'Not Found');
    const kind = match[1];
    const vmId = match[2];

    sessionMiddleware(req, new http.ServerResponse(req), () => {
      if (!req.session || !req.session.userId) return rejectUpgrade(socket, 401, 'Unauthorized');
      db.get(`SELECT * FROM vms WHERE vm_id = ?`, [vmId], (err, vm) => {
        if (err || !vm || !canAccessVm(req.session, vm)) return rejectUpgrade(socket, 404, 'Not Found');
        wss.handleUpgrade(req, socket, head, (ws) => {
          if (kind === 'console') handleConsole(ws, vm);
          else handleSsh(ws, vm);
        });
      });
    });
  });

  function sendJson(ws, obj) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  }

  function sendOutput(ws, data) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data, { binary: true });
  }

  function parseMessage(raw, isBinary) {
    if (isBinary) return null;
    try {
      return JSON.parse(raw.toString());
    } catch (e) {
      return null;
    }
  }

  // ---- Serial console -------------------------------------------------------
  function handleConsole(ws, vm) {
    const id = vm.vm_id;
    const replay = runtime.logTail(id);
    if (replay.length) sendOutput(ws, replay);

    if (!runtime.isRunning(id)) {
      sendJson(ws, { type: 'status', state: 'stopped', message: `VM ${vm.vm_name} is stopped. Start it to use the console.` });
      return ws.close();
    }

    const serial = net.createConnection(runtime.serialSocket(id));
    let attached = false;
    serial.on('connect', () => {
      attached = true;
      sendJson(ws, { type: 'status', state: 'connected', message: 'Console attached' });
    });
    serial.on('data', (chunk) => sendOutput(ws, chunk));
    serial.on('error', () => {
      sendJson(ws, { type: 'status', state: 'error', message: 'Serial console is not available. Restart the VM and try again.' });
      ws.close();
    });
    serial.on('close', () => {
      if (attached) sendJson(ws, { type: 'status', state: 'closed', message: 'Console disconnected' });
      if (ws.readyState === WebSocket.OPEN) ws.close();
    });

    ws.on('message', (raw, isBinary) => {
      const msg = parseMessage(raw, isBinary);
      if (msg && msg.type === 'input' && typeof msg.data === 'string' && attached) {
        serial.write(msg.data);
      }
    });
    ws.on('close', () => serial.destroy());
    ws.on('error', () => serial.destroy());
  }

  // ---- SSH shell ------------------------------------------------------------
  function handleSsh(ws, vm) {
    const target = sshTarget(vm);
    let conn = null;
    let stream = null;
    let started = false;

    const cleanup = () => {
      try { if (stream) stream.end(); } catch (e) { /* ignore */ }
      try { if (conn) conn.end(); } catch (e) { /* ignore */ }
    };
    ws.on('close', cleanup);
    ws.on('error', cleanup);

    if (!target) {
      sendJson(ws, { type: 'status', state: 'error', message: 'This VM has no SSH address yet. Check its network settings.' });
      return ws.close();
    }
    if (!runtime.isRunning(vm.vm_id)) {
      sendJson(ws, { type: 'status', state: 'stopped', message: `VM ${vm.vm_name} is stopped. Start it, then connect over SSH.` });
      return ws.close();
    }

    ws.on('message', (raw, isBinary) => {
      const msg = parseMessage(raw, isBinary);
      if (!msg) return;
      if (msg.type === 'connect' && !started) {
        started = true;
        startSsh(msg);
      } else if (msg.type === 'input' && stream && typeof msg.data === 'string') {
        stream.write(msg.data);
      } else if (msg.type === 'resize' && stream) {
        const cols = Math.max(20, Math.min(500, parseInt(msg.cols, 10) || 80));
        const rows = Math.max(5, Math.min(200, parseInt(msg.rows, 10) || 24));
        try { stream.setWindow(rows, cols, 0, 0); } catch (e) { /* ignore */ }
      }
    });

    function startSsh(msg) {
      const username = String(msg.username || vm.username || '').trim().slice(0, 64);
      // Empty password in the browser means "use the password saved for this VM".
      const password = typeof msg.password === 'string' && msg.password.length ? msg.password : (vm.password || '');
      if (!password) {
        sendJson(ws, { type: 'status', state: 'error', message: 'No password for this VM. Enter the VM password.' });
        return;
      }
      const cols = Math.max(20, Math.min(500, parseInt(msg.cols, 10) || 80));
      const rows = Math.max(5, Math.min(200, parseInt(msg.rows, 10) || 24));
      if (!username) {
        sendJson(ws, { type: 'status', state: 'error', message: 'Enter the VM username.' });
        return;
      }
      sendJson(ws, { type: 'status', state: 'connecting', message: `Connecting to ${username}@${target.host}:${target.port}...` });

      conn = new Client();
      conn.on('ready', () => {
        conn.shell({ term: 'xterm-256color', cols, rows }, (err, s) => {
          if (err) {
            sendJson(ws, { type: 'status', state: 'error', message: `Could not open a shell: ${err.message}` });
            return cleanup();
          }
          stream = s;
          sendJson(ws, { type: 'status', state: 'connected', message: 'SSH session started' });
          s.on('data', (d) => sendOutput(ws, d));
          s.stderr.on('data', (d) => sendOutput(ws, d));
          s.on('close', () => {
            sendJson(ws, { type: 'status', state: 'closed', message: 'SSH session closed' });
            cleanup();
            if (ws.readyState === WebSocket.OPEN) ws.close();
          });
        });
      });
      conn.on('error', (err) => {
        const authFailed = err.level === 'client-authentication';
        const message = authFailed
          ? 'Login failed: wrong username or password for the VM.'
          : `SSH connection failed: ${err.message}. Make sure the VM is running and its SSH server is up.`;
        sendJson(ws, { type: 'status', state: 'error', message });
        if (ws.readyState === WebSocket.OPEN) ws.close();
      });
      conn.on('close', () => {
        if (ws.readyState === WebSocket.OPEN) ws.close();
      });
      conn.connect({
        host: target.host,
        port: target.port,
        username,
        password,
        readyTimeout: 20000,
        keepaliveInterval: 15000,
        tryKeyboard: false,
      });
    }
  }

  return { wss };
}

module.exports = { attachTerminals };
