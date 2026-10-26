// Audit log: records who did what (login, VM actions, maintenance, emergency, file changes).
// Table: audit_logs. Admin-only read (see routes/ops.js).

function initAuditTable(db) {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      actor_id INTEGER,
      actor_name TEXT,
      action TEXT NOT NULL,
      target TEXT,
      result TEXT DEFAULT 'ok',
      ip TEXT,
      details TEXT
    )`, (err) => (err ? reject(err) : resolve()));
  });
}

function logAudit(db, entry) {
  return new Promise((resolve) => {
    db.run(
      `INSERT INTO audit_logs (actor_id, actor_name, action, target, result, ip, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.actorId || null,
        entry.actorName || 'system',
        entry.action,
        entry.target || null,
        entry.result || 'ok',
        entry.ip || null,
        entry.details ? String(entry.details).slice(0, 2000) : null
      ],
      (err) => {
        if (err) console.error('[Audit] write failed:', err.message);
        resolve();
      }
    );
  });
}

function auditFromReq(db, req, action, target, result, details) {
  return logAudit(db, {
    actorId: req.session && req.session.userId,
    actorName: req.session && req.session.username,
    action, target, result, details,
    ip: req.ip
  });
}

function listAudit(db, limit = 200) {
  const n = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 5000);
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?`, [n], (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  const cols = ['id', 'created_at', 'actor_id', 'actor_name', 'action', 'target', 'result', 'ip', 'details'];
  const lines = [cols.join(',')];
  rows.forEach(r => lines.push(cols.map(c => csvCell(r[c])).join(',')));
  return lines.join('\n') + '\n';
}

module.exports = { initAuditTable, logAudit, auditFromReq, listAudit, toCsv };
