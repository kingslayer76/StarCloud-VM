// Built-in OS templates (cloud images). Single source of truth: the panel (app.js) and the
// installer (install.sh --os-images) both read this file.
// Downloaded images are cached as <key>-template.qcow2 in <home>/vms/templates.
//
// Fields:
//   name, type, icon, disk_size, memory, cpus  - shown on the template card / used for new VMs
//   url        - direct download URL (used as-is when there is no `index`)
//   index+match - for images whose file name contains a build number (Fedora, Alpine): the folder
//                 listing is read at download time and the newest matching file is used
//   username/password - default login of the cloud image (the VM create form can change them)

const OS_TEMPLATES = {
  // ---- Ubuntu (4 active) ----
  ubuntu_26_10_cloud: {
    name: 'Ubuntu 26.10 (Stonking Stingray)',
    type: 'cloud-init',
    icon: '🟠',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud-images.ubuntu.com/releases/stonking/release/ubuntu-26.10-server-cloudimg-amd64.img',
    username: 'ubuntu',
    password: 'ubuntu'
  },
  ubuntu_26_04_cloud: {
    name: 'Ubuntu 26.04 LTS (Resolute Raccoon)',
    type: 'cloud-init',
    icon: '🟠',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud-images.ubuntu.com/releases/resolute/release/ubuntu-26.04-server-cloudimg-amd64.img',
    username: 'ubuntu',
    password: 'ubuntu'
  },
  ubuntu_24_cloud: {
    name: 'Ubuntu 24.04 LTS (Noble Numbat)',
    type: 'cloud-init',
    icon: '🟠',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img',
    username: 'ubuntu',
    password: 'ubuntu'
  },
  ubuntu_22_cloud: {
    name: 'Ubuntu 22.04 LTS (Jammy Jellyfish)',
    type: 'cloud-init',
    icon: '🟠',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img',
    username: 'ubuntu',
    password: 'ubuntu'
  },

  // ---- Debian (3 active) ----
  debian_13_cloud: {
    name: 'Debian 13 (Trixie)',
    type: 'cloud-init',
    icon: '🌀',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud.debian.org/images/cloud/trixie/latest/debian-13-generic-amd64.qcow2',
    username: 'debian',
    password: 'debian'
  },
  debian_12_cloud: {
    name: 'Debian 12 (Bookworm)',
    type: 'cloud-init',
    icon: '🌀',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-amd64.qcow2',
    username: 'debian',
    password: 'debian'
  },
  debian_11_cloud: {
    name: 'Debian 11 (Bullseye)',
    type: 'cloud-init',
    icon: '🌀',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud.debian.org/images/cloud/bullseye/latest/debian-11-generic-amd64.qcow2',
    username: 'debian',
    password: 'debian'
  },

  // ---- CentOS (1 active) ----
  centos_stream_10_cloud: {
    name: 'CentOS Stream 10',
    type: 'cloud-init',
    icon: '💠',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud.centos.org/centos/10-stream/x86_64/images/CentOS-Stream-GenericCloud-10-latest.x86_64.qcow2',
    username: 'cloud-user',
    password: 'cloud-user'
  },

  // ---- AlmaLinux (3 active) ----
  almalinux_10_cloud: {
    name: 'AlmaLinux 10',
    type: 'cloud-init',
    icon: '🦙',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://repo.almalinux.org/almalinux/10/cloud/x86_64/images/AlmaLinux-10-GenericCloud-latest.x86_64.qcow2',
    username: 'almalinux',
    password: 'almalinux'
  },
  almalinux_9_cloud: {
    name: 'AlmaLinux 9',
    type: 'cloud-init',
    icon: '🦙',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://repo.almalinux.org/almalinux/9/cloud/x86_64/images/AlmaLinux-9-GenericCloud-latest.x86_64.qcow2',
    username: 'almalinux',
    password: 'almalinux'
  },
  almalinux_8_cloud: {
    name: 'AlmaLinux 8',
    type: 'cloud-init',
    icon: '🦙',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://repo.almalinux.org/almalinux/8/cloud/x86_64/images/AlmaLinux-8-GenericCloud-latest.x86_64.qcow2',
    username: 'almalinux',
    password: 'almalinux'
  },

  // ---- Rocky Linux (3 active) ----
  rocky_10_cloud: {
    name: 'Rocky Linux 10',
    type: 'cloud-init',
    icon: '🪨',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://dl.rockylinux.org/pub/rocky/10/images/x86_64/Rocky-10-GenericCloud-Base.latest.x86_64.qcow2',
    username: 'rocky',
    password: 'rocky'
  },
  rocky_9_cloud: {
    name: 'Rocky Linux 9',
    type: 'cloud-init',
    icon: '🪨',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://dl.rockylinux.org/pub/rocky/9/images/x86_64/Rocky-9-GenericCloud-Base.latest.x86_64.qcow2',
    username: 'rocky',
    password: 'rocky'
  },
  rocky_8_cloud: {
    name: 'Rocky Linux 8',
    type: 'cloud-init',
    icon: '🪨',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://dl.rockylinux.org/pub/rocky/8/images/x86_64/Rocky-8-GenericCloud-Base.latest.x86_64.qcow2',
    username: 'rocky',
    password: 'rocky'
  },

  // ---- Fedora (2 active): build number in the file name, resolved from the folder listing ----
  fedora_44_cloud: {
    name: 'Fedora 44 (Cloud Base)',
    type: 'cloud-init',
    icon: '🎩',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    index: 'https://dl.fedoraproject.org/pub/fedora/linux/releases/44/Cloud/x86_64/images/',
    match: 'Fedora-Cloud-Base-Generic-44-[0-9.]+\\.x86_64\\.qcow2',
    url: 'https://dl.fedoraproject.org/pub/fedora/linux/releases/44/Cloud/x86_64/images/Fedora-Cloud-Base-Generic-44-1.7.x86_64.qcow2',
    username: 'fedora',
    password: 'fedora'
  },
  fedora_43_cloud: {
    name: 'Fedora 43 (Cloud Base)',
    type: 'cloud-init',
    icon: '🎩',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    index: 'https://dl.fedoraproject.org/pub/fedora/linux/releases/43/Cloud/x86_64/images/',
    match: 'Fedora-Cloud-Base-Generic-43-[0-9.]+\\.x86_64\\.qcow2',
    url: 'https://dl.fedoraproject.org/pub/fedora/linux/releases/43/Cloud/x86_64/images/Fedora-Cloud-Base-Generic-43-1.6.x86_64.qcow2',
    username: 'fedora',
    password: 'fedora'
  },

  // ---- openSUSE (2 active) ----
  opensuse_leap_16_cloud: {
    name: 'openSUSE Leap 16.0',
    type: 'cloud-init',
    icon: '🦎',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://download.opensuse.org/repositories/openSUSE:/Leap:/16.0:/Images/images/Leap-16.0-Minimal-VM.x86_64-Cloud.qcow2',
    username: 'opensuse',
    password: 'opensuse'
  },
  opensuse_tumbleweed_cloud: {
    name: 'openSUSE Tumbleweed (rolling)',
    type: 'cloud-init',
    icon: '🦎',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://download.opensuse.org/tumbleweed/appliances/openSUSE-Tumbleweed-Minimal-VM.x86_64-Cloud.qcow2',
    username: 'opensuse',
    password: 'opensuse'
  },

  // ---- Alpine (1 active): build number resolved from the folder listing ----
  alpine_3_24_cloud: {
    name: 'Alpine Linux 3.24',
    type: 'cloud-init',
    icon: '🏔️',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    index: 'https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/cloud/',
    match: 'alpine-3\\.24\\.\\d+-x86_64-cloudinit-r0\\.qcow2(?![\\w.-])',
    url: 'https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/cloud/alpine-3.24.3-x86_64-cloudinit-r0.qcow2',
    username: 'alpine',
    password: 'alpine'
  },

  // ---- Arch Linux (1 active, rolling) ----
  arch_linux_cloud: {
    name: 'Arch Linux (rolling)',
    type: 'cloud-init',
    icon: '🔷',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://fastly.mirror.pkgbuild.com/images/latest/Arch-Linux-x86_64-cloudimg.qcow2',
    username: 'arch',
    password: 'arch'
  }
};

// Returns the download URL for a template. Entries with `index` + `match` pick the newest file
// that matches in the folder listing (so a new build number does not break the download).
// Falls back to the static `url` if the listing cannot be read.
async function resolveTemplateUrl(template) {
  if (!template.index || !template.match) return template.url;
  try {
    const res = await fetch(template.index, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const re = new RegExp(template.match, 'g');
    const found = [...new Set(html.match(re) || [])];
    if (!found.length) throw new Error('no matching file in listing');
    found.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return template.index + found[found.length - 1];
  } catch (err) {
    console.warn(`[TEMPLATE] Could not read ${template.index} (${err.message}); using ${template.url}`);
    return template.url;
  }
}

module.exports = { OS_TEMPLATES, resolveTemplateUrl };
