(function () {
  function api(method, url, body) {
    return fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; }); });
  }
  function show(id, text, isErr) {
    var el = document.getElementById(id); el.textContent = text; el.className = 'msg' + (isErr ? ' err' : ''); el.style.display = 'block';
  }
  function td(text) { var c = document.createElement('td'); c.textContent = text; return c; }
  function btn(label, cls, fn) { var b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; return b; }
  function tdNode(node) { var c = document.createElement('td'); c.appendChild(node); return c; }

  // ---- 2FA ----
  function load2fa() {
    api('GET', '/api/user/2fa').then(function (r) {
      var on = r.ok && r.data.enabled;
      document.getElementById('fa-state').textContent = on ? '2FA is ON.' : '2FA is OFF. Turn it on to protect your login.';
      document.getElementById('fa-off').style.display = on ? 'none' : 'block';
      document.getElementById('fa-on').style.display = on ? 'block' : 'none';
    });
  }
  document.getElementById('fa-start').onclick = function () {
    api('POST', '/api/user/2fa/setup').then(function (r) {
      if (!r.ok) return show('fa-msg', r.data.error || 'Could not start setup', true);
      document.getElementById('fa-setup').style.display = 'block';
      document.getElementById('fa-qr').src = r.data.qr;
      document.getElementById('fa-secret').textContent = r.data.secret;
    });
  };
  document.getElementById('fa-enable').onclick = function () {
    api('POST', '/api/user/2fa/enable', { code: document.getElementById('fa-code').value }).then(function (r) {
      if (!r.ok) return show('fa-msg', r.data.error || 'Failed', true);
      document.getElementById('fa-setup').style.display = 'none';
      document.getElementById('fa-codes').style.display = 'block';
      document.getElementById('fa-codes-list').textContent = r.data.backup_codes.join('   ');
      show('fa-msg', '2FA is on.');
      load2fa();
    });
  };
  document.getElementById('fa-disable').onclick = function () {
    api('POST', '/api/user/2fa/disable', { password: document.getElementById('fa-dis-pass').value, code: document.getElementById('fa-dis-code').value })
      .then(function (r) { if (!r.ok) return show('fa-msg', r.data.error || 'Failed', true); show('fa-msg', '2FA is off.'); load2fa(); });
  };

  // ---- Sessions ----
  function loadSessions() {
    api('GET', '/api/user/sessions').then(function (r) {
      var body = document.getElementById('ses-body'); body.textContent = '';
      (r.data || []).forEach(function (s) {
        var tr = document.createElement('tr');
        tr.appendChild(td(s.current ? 'This device' : 'Other device'));
        tr.appendChild(td(s.expires ? new Date(s.expires).toLocaleString() : '-'));
        tr.appendChild(tdNode(btn(s.current ? 'Sign out here' : 'Revoke', 'danger', function () {
          api('POST', '/api/user/sessions/revoke', { id: s.id }).then(function (x) {
            if (x.data.logged_out_current) { window.location.href = '/login'; return; }
            loadSessions();
          });
        })));
        body.appendChild(tr);
      });
    });
  }
  document.getElementById('ses-others').onclick = function () {
    api('POST', '/api/user/sessions/revoke-others').then(function (r) { show('ses-msg', 'Signed out ' + (r.data.revoked || 0) + ' other device(s).'); loadSessions(); });
  };

  // ---- API keys ----
  function loadKeys() {
    api('GET', '/api/user/api-keys').then(function (r) {
      var body = document.getElementById('key-body'); body.textContent = '';
      (r.data || []).forEach(function (k) {
        var tr = document.createElement('tr');
        tr.appendChild(td(k.name)); tr.appendChild(td(k.key_prefix + '…')); tr.appendChild(td(k.scope));
        tr.appendChild(td(k.last_used ? k.last_used + ' UTC' : 'never'));
        tr.appendChild(tdNode(btn('Delete', 'danger', function () {
          api('DELETE', '/api/user/api-keys/' + k.id).then(loadKeys);
        })));
        body.appendChild(tr);
      });
    });
  }
  document.getElementById('key-create').onclick = function () {
    api('POST', '/api/user/api-keys', { name: document.getElementById('key-name').value, scope: document.getElementById('key-scope').value }).then(function (r) {
      if (!r.ok) return show('key-msg', r.data.error || 'Failed', true);
      var box = document.getElementById('key-new'); box.textContent = r.data.key; box.style.display = 'block';
      show('key-msg', r.data.note);
      loadKeys();
    });
  };

  load2fa(); loadSessions(); loadKeys();
})();
