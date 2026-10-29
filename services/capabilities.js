// Host capability detection: is hardware virtualization (KVM) usable on this machine?
// Used by the installer report, the VM create/edit forms, and the QEMU start code.
const fs = require('fs');
const path = require('path');

// Shown whenever a KVM option is requested on a host that has no KVM
const KVM_BLOCK_MESSAGE = 'KVM is blocked on this host: the server has no hardware virtualization (KVM), so KVM VMs cannot be created or enabled. Use KVM On / Off = OFF, or enable KVM in BIOS/UEFI and re-check.';

// Result written by install.sh (informational; live detection below decides the lock)
const INSTALL_REPORT = path.join(__dirname, '..', 'data', 'install-kvm-report.json');
function readInstallReport() {
  try { return JSON.parse(fs.readFileSync(INSTALL_REPORT, 'utf8')); } catch (e) { return null; }
}

const CACHE_MS = 10 * 1000;
let cache = null;
let cachedAt = 0;

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { return null; }
}

function detectKvm() {
  if (cache && Date.now() - cachedAt < CACHE_MS) return cache;

  const reasons = [];
  const devKvm = fs.existsSync('/dev/kvm');
  let devWritable = false;
  if (devKvm) {
    try {
      fs.accessSync('/dev/kvm', fs.constants.R_OK | fs.constants.W_OK);
      devWritable = true;
    } catch (e) {
      reasons.push('/dev/kvm exists but this user cannot read/write it (run panel as root or add user to the kvm group)');
    }
  } else {
    reasons.push('/dev/kvm is missing (KVM kernel module not loaded or virtualization disabled in BIOS/UEFI)');
  }

  const cpuinfo = readText('/proc/cpuinfo') || '';
  const vendorMatch = cpuinfo.match(/vendor_id\s*:\s*(\S+)/);
  const cpuVendor = vendorMatch ? vendorMatch[1] : 'unknown';
  let virtFlag = null;
  if (/\bvmx\b/.test(cpuinfo)) virtFlag = 'vmx';
  else if (/\bsvm\b/.test(cpuinfo)) virtFlag = 'svm';
  if (!virtFlag) reasons.push('CPU does not report Intel VT-x (vmx) or AMD-V (svm) virtualization');

  const nestedFile = cpuVendor === 'AuthenticAMD'
    ? '/sys/module/kvm_amd/parameters/nested'
    : '/sys/module/kvm_intel/parameters/nested';
  const nestedRaw = readText(nestedFile);
  const hostNestedOn = nestedRaw ? /^(1|Y|y)/.test(nestedRaw.trim()) : false;
  if (devWritable && virtFlag && !hostNestedOn) {
    reasons.push('Host KVM nested mode is OFF; guest VMs cannot run KVM until nested is enabled (installer can enable it)');
  }

  const kvmAvailable = devWritable && !!virtFlag;
  cache = {
    kvmAvailable,
    devKvmPresent: devKvm,
    devKvmWritable: devWritable,
    cpuVendor,
    virtFlag,                 // 'vmx' (Intel) or 'svm' (AMD) or null
    nestedFlag: virtFlag ? `+${virtFlag}` : null,
    hostNestedOn,
    // Nested KVM is only selectable when the host has KVM. The host module flag
    // is reported separately so the UI can warn about it.
    nestedAvailable: kvmAvailable,
    reasons,
    installReport: readInstallReport(),
    checkedAt: new Date().toISOString()
  };
  cachedAt = Date.now();
  return cache;
}

module.exports = { detectKvm, KVM_BLOCK_MESSAGE };
