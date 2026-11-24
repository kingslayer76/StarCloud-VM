// One place for start / stop / restart of a VM, used by the API, bulk actions, schedules and the expiry job.
// Refuses to start a suspended VM. Returns { ok, error } and never throws.
module.exports = function createPower({ db, startVmForOps, stopVmProcess }) {
  const getVm = (vmId) => new Promise((resolve, reject) =>
    db.get(`SELECT * FROM vms WHERE vm_id = ?`, [vmId], (e, r) => (e ? reject(e) : resolve(r))));

  return async function power(vmId, action) {
    try {
      const vm = await getVm(vmId);
      if (!vm) return { ok: false, error: 'VM not found' };
      if ((action === 'start' || action === 'restart') && vm.suspended) {
        return { ok: false, error: `VM is suspended: ${vm.suspend_reason || 'no reason given'}` };
      }
      if (action === 'stop' || action === 'restart') {
        await stopVmProcess(vm);
      }
      if (action === 'start' || action === 'restart') {
        const fresh = action === 'restart' ? await getVm(vmId) : vm;
        if (action === 'start' && fresh.status === 'running') return { ok: true, note: 'already running' };
        await startVmForOps(fresh);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  };
};
