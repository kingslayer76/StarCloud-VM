(function () {
  function td(t) { var c = document.createElement('td'); c.textContent = t; return c; }
  fetch('/api/status', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (s) {
    document.getElementById('panel').textContent = s.panel === 'up' ? 'All systems operational' : 'Degraded';
    document.getElementById('running').textContent = s.vms_running;
    document.getElementById('total').textContent = s.vms_total;
    document.getElementById('uptime').textContent = s.uptime_24h_pct + '%';
    document.getElementById('checked').textContent = 'Checked ' + s.checked_at;
  }).catch(function () { document.getElementById('panel').textContent = 'Unavailable'; });
  fetch('/api/status/history?days=7', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (rows) {
    var body = document.getElementById('hist');
    rows.forEach(function (x) { var tr = document.createElement('tr'); tr.appendChild(td(x.day)); tr.appendChild(td(x.uptime_pct + '%')); body.appendChild(tr); });
    if (!rows.length) body.appendChild(td('No data yet'));
  });
})();
