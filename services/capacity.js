// Capacity guard: refuse to create a VM that would make the host run out of RAM or CPU.
// Rule: RAM of ALL VMs (running or stopped) is reserved, plus RESERVED_RAM_MB kept for the host itself.
const os = require('os');

const RESERVED_RAM_MB = 1024;
const MAX_VCPU_FACTOR = 4; // vCPUs may be up to 4x the host's logical CPUs (common VPS overselling)

function checkCapacity(db, { memoryMb, vcpus }) {
  return new Promise((resolve) => {
    const mem = parseInt(memoryMb, 10) || 0;
    const cpus = parseInt(vcpus, 10) || 1;
    const hostRamMb = Math.floor(os.totalmem() / 1048576);
    const hostCpus = os.cpus().length || 1;

    if (mem < 256) return resolve('Memory must be at least 256 MB');
    if (cpus > hostCpus * MAX_VCPU_FACTOR) {
      return resolve(`Too many vCPUs: ${cpus} requested, limit on this host is ${hostCpus * MAX_VCPU_FACTOR} (${hostCpus} logical CPUs x ${MAX_VCPU_FACTOR})`);
    }
    db.all(`SELECT memory FROM vms`, (err, rows) => {
      if (err) return resolve(`Capacity check failed: ${err.message}`);
      const reserved = rows.reduce((sum, r) => sum + (parseInt(r.memory, 10) || 0), 0);
      const free = hostRamMb - RESERVED_RAM_MB - reserved;
      if (mem > free) {
        return resolve(`Not enough RAM on this host: ${mem} MB requested, ${Math.max(free, 0)} MB free (host has ${hostRamMb} MB, ${reserved} MB already reserved by VMs, ${RESERVED_RAM_MB} MB kept for the host)`);
      }
      resolve(null);
    });
  });
}

module.exports = { checkCapacity, RESERVED_RAM_MB };
