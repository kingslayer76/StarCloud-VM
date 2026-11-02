// Shared VM access helpers: who may open a VM, and where its SSH server is reachable.

// NAT VMs are reached through the host port forward (127.0.0.1:ssh_port).
// Static-IPv4 (bridge) VMs are reached directly on their own address, port 22.
function sshTarget(vm) {
  if (!vm) return null;
  if (vm.network_type === 'nat' || !vm.ipv4_address) {
    const port = parseInt(vm.ssh_port || vm.ssh_port_static || 0, 10);
    if (!port) return null;
    return { host: '127.0.0.1', port, mode: 'nat' };
  }
  return { host: vm.ipv4_address, port: 22, mode: 'bridge' };
}

// Admins may access every VM; customers only their own.
function canAccessVm(session, vm) {
  if (!session || !session.userId || !vm) return false;
  if (session.role === 'admin') return true;
  return Number(vm.owner_id) === Number(session.userId);
}

module.exports = { sshTarget, canAccessVm };
