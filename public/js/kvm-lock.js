// KVM lock for the VM create and edit forms.
// If this host has no hardware virtualization (KVM), the "KVM On / Off" and
// "Nested KVM On / Off" options stay OFF and cannot be turned ON.
// Every click on a locked option shows a warning. Every 3rd click also shows
// the permanent-block notice with the steps to fix it.
(function (global) {
  const SHORT_WARNING = 'KVM is locked on this host. The server has no hardware virtualization (KVM), so KVM VMs cannot be created.';
  const LONG_NOTICE = 'PERMANENT BLOCK: This server does not have KVM, so KVM and Nested KVM cannot be turned ON for any VM.\n\n' +
    'To unlock, the server needs KVM:\n' +
    '1. Enable Intel VT-x or AMD-V (SVM) in the BIOS/UEFI of the server.\n' +
    '2. Make sure /dev/kvm exists after a reboot.\n' +
    '3. Re-run the installer or restart the StarCloud panel. The lock is removed automatically.\n\n' +
    'Until then, create VMs with KVM On / Off = OFF (slow software emulation).';

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
    if (hint) hint.textContent = 'Locked OFF: this host has no KVM. Click for details.';
  }

  async function init(opts) {
    const state = { clicks: 0 };
    let caps = null;
    try {
      const res = await fetch('/api/admin/operations', { credentials: 'same-origin' });
      const data = await res.json();
      caps = data.capabilities || null;
    } catch (e) {
      if (opts.hintEl) opts.hintEl.textContent = 'Could not check host KVM status (' + e.message + ').';
      return;
    }
    if (!caps) return;
    const kvm = document.getElementById(opts.kvmId);
    const nested = document.getElementById(opts.nestedId);
    const banner = opts.bannerId ? document.getElementById(opts.bannerId) : null;

    if (!caps.kvmAvailable) {
      lockControl(kvm, document.getElementById(opts.kvmHintId), state, caps.reasons);
      lockControl(nested, document.getElementById(opts.nestedHintId), state, caps.reasons);
      if (banner) {
        banner.style.display = 'block';
        banner.textContent = 'KVM is locked: this host has no hardware virtualization (KVM). Options stay OFF; KVM VMs cannot be created on this server.';
      }
      return;
    }
    const kvmHint = document.getElementById(opts.kvmHintId);
    if (kvmHint) kvmHint.textContent = 'Hardware virtualization (' + (caps.virtFlag === 'svm' ? 'AMD-V' : 'Intel VT-x') + ') is available on this host.';
    if (banner && !caps.hostNestedOn) {
      banner.style.display = 'block';
      banner.textContent = 'Host nested KVM module is OFF. Nested KVM VMs will not work until nested mode is enabled on the host.';
    }
  }

  global.KvmLock = { init };
})(window);
