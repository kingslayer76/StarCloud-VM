// QEMU lifecycle for StarCloud VMs.
//
// VMs are started as daemons (qemu -daemonize). Each VM owns its control sockets:
//   vm-<id>.qmp.sock     QEMU Machine Protocol (graceful powerdown, reset, quit)
//   vm-<id>.serial.sock  serial console (the browser terminal attaches here)
//   vm-<id>.log          serial console output (kept even when nobody is attached)
//   vm-<id>.pid          QEMU process id
// Because the VM is a daemon, it keeps running when the panel restarts, and the
// panel can attach to the console at any time.
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { StringDecoder } = require('string_decoder');

const QEMU_BIN = process.env.STARCLOUD_QEMU_BIN || 'qemu-system-x86_64';
const LOG_ROTATE_BYTES = 10 * 1024 * 1024;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createRuntime({ runDir }) {
  const filesFor = (id) => ({
    pid: path.join(runDir, `vm-${id}.pid`),
    qmp: path.join(runDir, `vm-${id}.qmp.sock`),
    serial: path.join(runDir, `vm-${id}.serial.sock`),
    log: path.join(runDir, `vm-${id}.log`),
  });

  function readPid(id) {
    try {
      const pid = parseInt(fs.readFileSync(filesFor(id).pid, 'utf8').trim(), 10);
      return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch (e) {
      return null;
    }
  }

  // A pid only counts as this VM if its command line still names it (guards against pid reuse).
  function isVmProcess(id, pid) {
    try {
      process.kill(pid, 0);
    } catch (e) {
      return false;
    }
    if (process.platform !== 'linux') return true;
    try {
      return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes(`-name\0vm-${id}\0`);
    } catch (e) {
      return false;
    }
  }

  // Returns the QEMU pid when the VM is running, otherwise null.
  function status(id) {
    const pid = readPid(id);
    return pid && isVmProcess(id, pid) ? pid : null;
  }

  function cleanup(id) {
    const f = filesFor(id);
    for (const p of [f.pid, f.qmp, f.serial]) {
      try { fs.unlinkSync(p); } catch (e) { /* already gone */ }
    }
  }

  // Sends one QMP command over the VM's control socket.
  function qmp(id, execute, args, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const decoder = new StringDecoder('utf8');
      const sock = net.createConnection(filesFor(id).qmp);
      let buf = '';
      let stage = 'greeting';
      let done = false;
      let timer = null;
      const finish = (err, value) => {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        sock.destroy();
        if (err) reject(err); else resolve(value);
      };
      timer = setTimeout(() => finish(new Error('QMP timeout')), timeoutMs);
      sock.on('error', (err) => finish(err));
      sock.on('close', () => finish(new Error('QMP connection closed')));
      sock.on('data', (chunk) => {
        buf += decoder.write(chunk);
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          let msg;
          try { msg = JSON.parse(line); } catch (e) { continue; }
          if (msg.event) continue;
          if (msg.QMP) {
            stage = 'caps';
            sock.write(JSON.stringify({ execute: 'qmp_capabilities' }) + '\n');
            continue;
          }
          if (stage === 'caps') {
            if (msg.error) return finish(new Error(msg.error.desc || 'QMP capabilities failed'));
            stage = 'cmd';
            sock.write(JSON.stringify({ execute, arguments: args || {} }) + '\n');
            continue;
          }
          if (stage === 'cmd') {
            if (msg.error) return finish(new Error(msg.error.desc || `${execute} failed`));
            return finish(null, msg.return);
          }
        }
      });
    });
  }

  async function waitGone(id, ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (!status(id)) return true;
      await sleep(250);
    }
    return !status(id);
  }

  // Graceful stop: ACPI powerdown, then QMP quit, then SIGKILL as the last resort.
  async function stop(id, { graceMs = 30000 } = {}) {
    const pid = status(id);
    if (!pid) {
      cleanup(id);
      return true;
    }
    let acpiSent = false;
    try {
      await qmp(id, 'system_powerdown');
      acpiSent = true;
    } catch (e) { /* no ACPI or control socket gone; fall through */ }
    if (acpiSent && (await waitGone(id, graceMs))) {
      cleanup(id);
      return true;
    }
    try { await qmp(id, 'quit'); } catch (e) { /* ignore */ }
    if (await waitGone(id, 5000)) {
      cleanup(id);
      return true;
    }
    try { process.kill(pid, 'SIGKILL'); } catch (e) { /* ignore */ }
    await waitGone(id, 3000);
    cleanup(id);
    return !status(id);
  }

  // Hard reset (like pressing reset). Returns false if the VM is not running.
  async function reset(id) {
    if (!status(id)) return false;
    await qmp(id, 'system_reset');
    return true;
  }

  // Starts QEMU as a daemon with the given argument list. Resolves with the QEMU pid.
  async function launch(id, args) {
    if (status(id)) throw new Error('VM is already running');
    const f = filesFor(id);
    cleanup(id);
    try {
      if (fs.existsSync(f.log) && fs.statSync(f.log).size > LOG_ROTATE_BYTES) {
        fs.renameSync(f.log, `${f.log}.${Date.now()}.bak`);
      }
    } catch (e) { /* rotation is best effort */ }

    const fullArgs = [
      ...args,
      '-display', 'none',
      '-monitor', 'none',
      '-qmp', `unix:${f.qmp},server=on,wait=off`,
      '-chardev', `socket,id=serial0,path=${f.serial},server=on,wait=off,logfile=${f.log},logappend=on`,
      '-serial', 'chardev:serial0',
      '-daemonize',
      '-pidfile', f.pid,
    ];

    const failure = await new Promise((resolve) => {
      let stderr = '';
      let child;
      try {
        child = spawn(QEMU_BIN, fullArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
      } catch (e) {
        return resolve(e.message);
      }
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('error', (e) => resolve(e.code === 'ENOENT' ? `${QEMU_BIN} is not installed` : e.message));
      child.on('exit', (code) => resolve(code === 0 ? null : (stderr.trim().split('\n').slice(-3).join(' ') || `QEMU exited with code ${code}`)));
    });
    if (failure) throw new Error(`QEMU failed to start: ${failure}`);

    for (let i = 0; i < 50; i++) {
      const pid = status(id);
      if (pid) return pid;
      await sleep(100);
    }
    throw new Error('QEMU started but no running process was found');
  }

  // Last `maxBytes` of the serial console log (used to replay the console on connect).
  function logTail(id, maxBytes = 64 * 1024) {
    const p = filesFor(id).log;
    try {
      const st = fs.statSync(p);
      const start = Math.max(0, st.size - maxBytes);
      const fd = fs.openSync(p, 'r');
      const buf = Buffer.alloc(st.size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      fs.closeSync(fd);
      return buf;
    } catch (e) {
      return Buffer.alloc(0);
    }
  }

  return {
    files: filesFor,
    status,
    isRunning: (id) => !!status(id),
    stop,
    reset,
    launch,
    cleanup,
    logTail,
    qmp,
    serialSocket: (id) => filesFor(id).serial,
    logPath: (id) => filesFor(id).log,
  };
}

module.exports = { createRuntime, QEMU_BIN };
