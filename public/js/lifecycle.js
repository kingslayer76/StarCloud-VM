(function () {
  function api(method, url, body) {
    return fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; }); });
  }
  function $(id) { return document.getElementById(id); }
  function msg(id, text, isErr) { var el = $(id); el.textContent = text; el.className = 'msg' + (isErr ? ' err' : ''); el.style.display = 'block'; }
  function cell(parent, text, cls) { var c = document.createElement('td'); c.textContent = text == null ? '-' : String(text); if (cls) c.className = cls; parent.appendChild(c); return c; }
  function cellNode(parent, node) { var c = document.createElement('td'); c.appendChild(node); parent.appendChild(c); return c; }
  function btn(label, cls, fn) { var b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; return b; }
  function ask(q) { return window.prompt(q); }
  function when(s) { return s ? s.replace('T', ' ').slice(0, 16) : '-'; }

  var VMS = [];

  function loadAlerts() {
    api('GET', '/api/admin/alerts').then(function (r) {
      var box = $('alerts'); box.textContent = '';
      var d = r.data;
      var line = document.createElement('div');
      line.textContent = 'RAM free ' + d.ram_free_pct + '%   |   Disk free ' + (d.disk_free_pct == null ? 'unknown' : d.disk_free_pct + '%');
      box.appendChild(line);
      (d.alerts || []).forEach(function (a) { var x = document.createElement('div'); x.className = 'bad'; x.textContent = '⚠ ' + a; box.appendChild(x); });
      if (!(d.alerts || []).length) { var ok = document.createElement('div'); ok.className = 'good'; ok.textContent = 'No host alerts.'; box.appendChild(ok); }
    });
  }

  function loadExpiring() {
    api('GET', '/api/admin/vms/expiring?days=7').then(function (r) {
      var box = $('expiring'); box.textContent = '';
      if (!r.data.length) { box.textContent = 'Nothing expiring in 7 days.'; return; }
      r.data.forEach(function (v) {
        var d = document.createElement('div');
        d.className = new Date(v.expires_at.replace(' ', 'T') + 'Z') < new Date() ? 'bad' : 'warn';
        d.textContent = v.vm_name + ' (#' + v.vm_id + ')  expires ' + when(v.expires_at) + ' UTC' + (v.suspended ? '  [suspended]' : '');
        box.appendChild(d);
      });
    });
  }

  function loadVms() {
    api('GET', '/api/admin/lifecycle/vms').then(function (r) {
      VMS = r.data || [];
      var body = $('vm-body'); body.textContent = '';
      var sel = $('sch-vm'); sel.textContent = '';
      VMS.forEach(function (v) {
        var tr = document.createElement('tr');
        var cb = document.createElement('input'); cb.type = 'checkbox'; cb.dataset.id = v.vm_id;
        cellNode(tr, cb);
        cell(tr, v.vm_name + ' #' + v.vm_id);
        cell(tr, v.owner_name || '-');
        cell(tr, v.status + (v.desired_state === 'running' && v.status !== 'running' ? ' (will auto-start)' : ''));
        cell(tr, when(v.expires_at));
        cell(tr, v.suspended ? ('yes: ' + (v.suspend_reason || '')) : 'no', v.suspended ? 'bad' : '');
        var acts = document.createElement('td');
        acts.appendChild(btn('+30 days', 'ghost', function () { renew(v.vm_id, 30); }));
        acts.appendChild(btn('Set date', 'ghost', function () {
          var d = ask('Expiry date (YYYY-MM-DD), empty to clear'); if (d === null) return;
          api('POST', '/api/admin/vms/' + v.vm_id + '/expiry', d ? { days: Math.max(1, Math.round((new Date(d + 'T00:00:00Z') - Date.now()) / 86400000)) } : { clear: true }).then(function (x) { msgVm(x); });
        }));
        acts.appendChild(v.suspended
          ? btn('Unsuspend', 'ghost', function () { api('POST', '/api/admin/vms/' + v.vm_id + '/unsuspend').then(msgVm); })
          : btn('Suspend', 'danger', function () {
              var reason = ask('Reason shown to the customer (required)'); if (!reason) return;
              api('POST', '/api/admin/vms/' + v.vm_id + '/suspend', { reason: reason }).then(msgVm);
            }));
        acts.appendChild(btn('Backups', 'ghost', function () { showBackups(v); }));
        acts.appendChild(btn('Backup now', 'ghost', function () {
          api('POST', '/api/admin/vms/' + v.vm_id + '/backup', {}).then(function (x) { msgVm(x, 'Backup #' + (x.data.backup_id || '?') + ' saved'); });
        }));
        tr.appendChild(acts);
        body.appendChild(tr);
        var opt = document.createElement('option'); opt.value = v.vm_id; opt.textContent = v.vm_name + ' #' + v.vm_id; sel.appendChild(opt);
      });
      loadSchedules();
    });
  }

  function msgVm(r, okText) {
    if (!r.ok) return msg('vm-msg', (r.data && r.data.error) || 'Failed', true);
    msg('vm-msg', okText || 'Done');
    loadVms(); loadExpiring(); loadAlerts();
  }

  function renew(id, days) {
    api('POST', '/api/admin/vms/' + id + '/expiry', { add_days: days }).then(function (x) { msgVm(x, 'Renewed. New expiry ' + when(x.data.expires_at) + ' UTC'); });
  }

  function ticked() { return Array.prototype.slice.call(document.querySelectorAll('#vm-body input[type=checkbox]:checked')).map(function (c) { return Number(c.dataset.id); }); }

  $('bulk-run').onclick = function () {
    var ids = ticked();
    if (!ids.length) return msg('vm-msg', 'Tick at least one VM', true);
    var action = $('bulk-action').value;
    var reason = $('bulk-reason').value;
    if (!window.confirm(action + ' ' + ids.length + ' VM(s)?')) return;
    api('POST', '/api/admin/vms/bulk', { action: action, vm_ids: ids, reason: reason }).then(function (r) {
      if (!r.ok) return msg('vm-msg', r.data.error || 'Failed', true);
      var bad = r.data.results.filter(function (x) { return !x.ok; }).map(function (x) { return '#' + x.vm_id + ': ' + x.error; });
      $('bulk-out').textContent = 'Done ' + r.data.done + ', failed ' + r.data.failed + (bad.length ? ' — ' + bad.join('; ') : '');
      loadVms(); loadExpiring(); loadAlerts();
    });
  };

  function showBackups(v) {
    api('GET', '/api/admin/vms/' + v.vm_id + '/backups').then(function (r) {
      var box = $('backups-box'); box.style.display = 'block'; box.textContent = '';
      var h = document.createElement('div'); h.textContent = 'Backups of ' + v.vm_name + ' (VM must be off to restore)'; box.appendChild(h);
      var t = document.createElement('table'); var tb = document.createElement('tbody'); t.appendChild(tb); box.appendChild(t);
      if (!r.data.length) { var e = document.createElement('div'); e.className = 'muted'; e.textContent = 'No backups yet.'; box.appendChild(e); }
      r.data.forEach(function (b) {
        var tr = document.createElement('tr');
        cell(tr, '#' + b.id); cell(tr, when(b.created_at) + ' UTC'); cell(tr, Math.round((b.size_bytes || 0) / 1048576) + ' MB'); cell(tr, b.note);
        var acts = document.createElement('td');
        acts.appendChild(btn('Restore', 'danger', function () {
          if (!window.confirm('Restore backup #' + b.id + '? A safety copy of the current disk is made first.')) return;
          api('POST', '/api/admin/backups/' + b.id + '/restore', {}).then(function (x) { msgVm(x, 'Restored. Safety copy #' + (x.data.safety_backup_id || '?')); showBackups(v); });
        }));
        acts.appendChild(btn('Download', 'ghost', function () { window.location.href = '/api/admin/backups/' + b.id + '/download'; }));
        acts.appendChild(btn('Delete', 'ghost', function () { api('DELETE', '/api/admin/backups/' + b.id).then(function () { showBackups(v); }); }));
        tr.appendChild(acts); tb.appendChild(tr);
      });
    });
  }

  function loadSchedules() {
    api('GET', '/api/admin/schedules').then(function (r) {
      var body = $('sch-body'); body.textContent = '';
      r.data.forEach(function (s) {
        var tr = document.createElement('tr');
        cell(tr, (s.vm_name || 'VM ' + s.vm_id) + ' #' + s.vm_id); cell(tr, s.action); cell(tr, s.hhmm);
        cellNode(tr, btn('Delete', 'danger', function () { api('DELETE', '/api/admin/schedules/' + s.id).then(loadSchedules); }));
        body.appendChild(tr);
      });
    });
  }
  $('sch-add').onclick = function () {
    api('POST', '/api/admin/schedules', { vm_id: Number($('sch-vm').value), action: $('sch-action').value, hhmm: $('sch-time').value }).then(function (r) {
      if (!r.ok) return msg('sch-msg', r.data.error, true);
      msg('sch-msg', 'Schedule added'); loadSchedules();
    });
  };

  function loadWebhooks() {
    api('GET', '/api/admin/webhooks').then(function (r) {
      var body = $('wh-body'); body.textContent = '';
      r.data.forEach(function (w) {
        var tr = document.createElement('tr');
        cell(tr, w.url); cell(tr, w.events); cell(tr, '…' + (w.secret_tail || ''));
        var acts = document.createElement('td');
        acts.appendChild(btn('Test', 'ghost', function () { api('POST', '/api/admin/webhooks/' + w.id + '/test').then(function () { setTimeout(loadDeliveries, 2500); }); }));
        acts.appendChild(btn('Delete', 'danger', function () { api('DELETE', '/api/admin/webhooks/' + w.id).then(loadWebhooks); }));
        tr.appendChild(acts); body.appendChild(tr);
      });
    });
    loadDeliveries();
  }
  function loadDeliveries() {
    api('GET', '/api/admin/webhooks/deliveries').then(function (r) {
      var body = $('wh-log'); body.textContent = '';
      r.data.slice(0, 15).forEach(function (d) {
        var tr = document.createElement('tr');
        cell(tr, when(d.created_at)); cell(tr, d.event); cell(tr, d.last_status, d.ok ? 'good' : 'bad'); cell(tr, d.attempts);
        body.appendChild(tr);
      });
    });
  }
  $('wh-add').onclick = function () {
    api('POST', '/api/admin/webhooks', { url: $('wh-url').value, events: $('wh-events').value }).then(function (r) {
      if (!r.ok) return msg('wh-msg', r.data.error, true);
      msg('wh-msg', 'Added. Secret (save it now): ' + r.data.secret); loadWebhooks();
    });
  };

  function loadGiveaways() {
    api('GET', '/api/admin/giveaways').then(function (r) {
      var body = $('gw-body'); body.textContent = '';
      r.data.slice(0, 200).forEach(function (g) {
        var tr = document.createElement('tr');
        cell(tr, g.code); cell(tr, g.batch); cell(tr, g.claimed_by ? g.claimed_by + ' (' + when(g.claimed_at) + ')' : 'free');
        body.appendChild(tr);
      });
    });
  }
  $('gw-make').onclick = function () {
    api('POST', '/api/admin/giveaways', { count: Number($('gw-count').value), prefix: $('gw-prefix').value }).then(function (r) {
      if (!r.ok) return;
      var out = $('gw-out'); out.style.display = 'block'; out.value = r.data.codes.join('\n');
      loadGiveaways();
    });
  };

  loadAlerts(); loadExpiring(); loadVms(); loadWebhooks(); loadGiveaways();
  setInterval(loadAlerts, 60000);
})();
