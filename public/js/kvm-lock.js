// KVM switch for the VM create and edit forms.
// One switch: "KVM On / Off". ON also lets the VM run its own VMs (nested KVM).
// The switch shows the state text next to its label: "On" or "Off".
// If this host has no hardware virtualization (KVM), the switch stays OFF and cannot be turned ON.
// Every click on it shows a warning. Every 3rd click also shows the permanent-block notice.
(function (global) {
  const SHORT_WARNING = 'KVM is locked on this host. The server has no hardware virtualization (KVM), so KVM VMs cannot be created.';
  const LONG_NOTICE = 'PERMANENT BLOCK: This server does not have KVM, so KVM cannot be turned ON for any VM.\n\n' +
    'To unlock, the server needs KVM:\n' +
    '1. Enable Intel VT-x or AMD-V (SVM) in the BIOS/UEFI of the server.\n' +
    '2. Make sure /dev/kvm exists after a reboot.\n' +
    '3. Re-run the installer or restart the StarCloud panel. The lock is removed automatically.\n\n' +
    'Until then, VMs run with software emulation (slower).';

  // Shows "On" (green) or "Off" (grey) next to the label, and keeps it in sync with the switch
  function setState(input, stateEl) {
    if (!input || !stateEl) return;
    const on = !!input.checked;
    stateEl.textContent = on ? 'On' : 'Off';
    stateEl.style.color = on ? '#10B981' : '#9CA3AF';
  }

  function bindState(input, stateEl) {
    if (!input || !stateEl) return;
    input.addEventListener('change', () => setState(input, stateEl));
    setState(input, stateEl);
  }

  function lockControl(input, hint, state, reasons) {
    if (!input) return;
    input.checked = false;
    input.setAttribute('aria-disabled', 'true');
    input.addEventListener('click', (ev) => {
      ev.preventDefault();          // keep it OFF
      state.clicks += 1;
      alert(SHORT_WARNING);
      if (state.clicks % 3 === 0) {
        alert(LONG_NOTICE + (reasons && reasons.length ? '\n\nDetails: ' + reasons.join(' ') : ''));
      }
    });
    if (hint) hint.textContent = 'Not available on this host (no hardware virtualization). Click for details.';
  }

  async function init(opts) {
    const state = { clicks: 0 };
    const kvm = document.getElementById(opts.kvmId);
    const stateEl = opts.stateId ? document.getElementById(opts.stateId) : null;
    const banner = opts.bannerId ? document.getElementById(opts.bannerId) : null;
    bindState(kvm, stateEl);

    let caps = null;
    try {
      const res = await fetch('/api/admin/operations', { credentials: 'same-origin' });
      const data = await res.json();
      caps = data.capabilities || null;
    } catch (e) {
      const hint = document.getElementById(opts.kvmHintId);
      if (hint) hint.textContent = 'Could not check host KVM status (' + e.message + ').';
      return;
    }
    if (!caps) return;

    if (!caps.kvmAvailable) {
      lockControl(kvm, document.getElementById(opts.kvmHintId), state, caps.reasons);
      setState(kvm, stateEl);
      if (banner) {
        banner.style.display = 'block';
        banner.textContent = 'KVM is locked: this host has no hardware virtualization (KVM). The switch stays OFF; KVM VMs cannot be created on this server.';
      }
      return;
    }
    const kvmHint = document.getElementById(opts.kvmHintId);
    if (kvmHint) kvmHint.textContent = 'Hardware virtualization (' + (caps.virtFlag === 'svm' ? 'AMD-V' : 'Intel VT-x') + ') is available on this host.';
    if (banner && !caps.hostNestedOn) {
      banner.style.display = 'block';
      banner.textContent = 'Host nested KVM module is OFF. VMs with KVM ON will not be able to run their own VMs until nested mode is enabled on the host (the installer can enable it, then reboot).';
    }
  }

  global.KvmLock = { init };
})(window);
