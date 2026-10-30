// Built-in OS templates (cloud images). Single source of truth: the panel (app.js) and the
// installer (install.sh --os-images) both read this file.
// Downloaded images are cached as <key>-template.qcow2 in <home>/vms/templates.
const OS_TEMPLATES = {
  // icon is an emoji shown on every template card so users can tell the OS apart.
  ubuntu_20_cloud: {
    name: 'Ubuntu 20.04 LTS',
    type: 'cloud-init',
    icon: '🟠',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud-images.ubuntu.com/focal/current/focal-server-cloudimg-amd64.img',
    username: 'ubuntu',
    password: 'ubuntu'
  },
  ubuntu_22_cloud: {
    name: 'Ubuntu 22.04 LTS',
    type: 'cloud-init',
    icon: '🟠',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img',
    username: 'ubuntu',
    password: 'ubuntu'
  },
  ubuntu_24_cloud: {
    name: 'Ubuntu 24.04 LTS',
    type: 'cloud-init',
    icon: '🟠',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img',
    username: 'ubuntu',
    password: 'ubuntu'
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
  fedora_40_cloud: {
    name: 'Fedora 40',
    type: 'cloud-init',
    icon: '🎩',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://download.fedoraproject.org/pub/fedora/linux/releases/40/Cloud/x86_64/images/Fedora-Cloud-Base-40-1.14.x86_64.qcow2',
    username: 'fedora',
    password: 'fedora'
  },
  centos_9_cloud: {
    name: 'CentOS Stream 9',
    type: 'cloud-init',
    icon: '💠',
    disk_size: '20G',
    memory: 2048,
    cpus: 2,
    url: 'https://cloud.centos.org/centos/9-stream/x86_64/images/CentOS-Stream-GenericCloud-9-latest.x86_64.qcow2',
    username: 'cloud-user',
    password: 'cloud-user'
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
  }
};

module.exports = { OS_TEMPLATES };
