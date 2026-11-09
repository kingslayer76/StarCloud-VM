// Full CPU list offered when creating or editing a VM (from the StarCloud CPU catalogue).
// qemu = the QEMU -cpu model name. fallbacks = older/safer models tried at VM start when a
// host's QEMU does not know the name. Generated once from the catalogue; edit here.
'use strict';

const CPU_CATALOG = [
  {
    "key": "amd-epyc-7251",
    "name": "AMD EPYC 7251",
    "vendor": "amd",
    "qemu": "EPYC",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "amd-epyc-7301",
    "name": "AMD EPYC 7301",
    "vendor": "amd",
    "qemu": "EPYC",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "amd-epyc-7401",
    "name": "AMD EPYC 7401",
    "vendor": "amd",
    "qemu": "EPYC",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "amd-epyc-7501",
    "name": "AMD EPYC 7501",
    "vendor": "amd",
    "qemu": "EPYC",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "amd-epyc-7551",
    "name": "AMD EPYC 7551",
    "vendor": "amd",
    "qemu": "EPYC",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "amd-epyc-7601",
    "name": "AMD EPYC 7601",
    "vendor": "amd",
    "qemu": "EPYC",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "amd-epyc-7232p",
    "name": "AMD EPYC 7232P",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7302",
    "name": "AMD EPYC 7302",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7302p",
    "name": "AMD EPYC 7302P",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7402",
    "name": "AMD EPYC 7402",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7402p",
    "name": "AMD EPYC 7402P",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7502",
    "name": "AMD EPYC 7502",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7502p",
    "name": "AMD EPYC 7502P",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7542",
    "name": "AMD EPYC 7542",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7642",
    "name": "AMD EPYC 7642",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7702",
    "name": "AMD EPYC 7702",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7702p",
    "name": "AMD EPYC 7702P",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7742",
    "name": "AMD EPYC 7742",
    "vendor": "amd",
    "qemu": "EPYC-Rome",
    "fallbacks": [
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7f32",
    "name": "AMD EPYC 7F32",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7f52",
    "name": "AMD EPYC 7F52",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7f72",
    "name": "AMD EPYC 7F72",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7313",
    "name": "AMD EPYC 7313",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7313p",
    "name": "AMD EPYC 7313P",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7413",
    "name": "AMD EPYC 7413",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7443",
    "name": "AMD EPYC 7443",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7443p",
    "name": "AMD EPYC 7443P",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7513",
    "name": "AMD EPYC 7513",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7543",
    "name": "AMD EPYC 7543",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7543p",
    "name": "AMD EPYC 7543P",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7643",
    "name": "AMD EPYC 7643",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7663",
    "name": "AMD EPYC 7663",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7713",
    "name": "AMD EPYC 7713",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7713p",
    "name": "AMD EPYC 7713P",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7763",
    "name": "AMD EPYC 7763",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7373",
    "name": "AMD EPYC 7373",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7473",
    "name": "AMD EPYC 7473",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-7573x",
    "name": "AMD EPYC 7573X",
    "vendor": "amd",
    "qemu": "EPYC-Milan",
    "fallbacks": [
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9124",
    "name": "AMD EPYC 9124",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9224",
    "name": "AMD EPYC 9224",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9334",
    "name": "AMD EPYC 9334",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9354",
    "name": "AMD EPYC 9354",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9354p",
    "name": "AMD EPYC 9354P",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9454",
    "name": "AMD EPYC 9454",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9454p",
    "name": "AMD EPYC 9454P",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9554",
    "name": "AMD EPYC 9554",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9634",
    "name": "AMD EPYC 9634",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9654",
    "name": "AMD EPYC 9654",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9654p",
    "name": "AMD EPYC 9654P",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9754",
    "name": "AMD EPYC 9754",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-8024p",
    "name": "AMD EPYC 8024P",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-8324p",
    "name": "AMD EPYC 8324P",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-8534p",
    "name": "AMD EPYC 8534P",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9175f",
    "name": "AMD EPYC 9175F",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9375f",
    "name": "AMD EPYC 9375F",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9575f",
    "name": "AMD EPYC 9575F",
    "vendor": "amd",
    "qemu": "EPYC-Genoa",
    "fallbacks": [
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9655",
    "name": "AMD EPYC 9655",
    "vendor": "amd",
    "qemu": "EPYC-Turin",
    "fallbacks": [
      "EPYC-Genoa",
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9825",
    "name": "AMD EPYC 9825",
    "vendor": "amd",
    "qemu": "EPYC-Turin",
    "fallbacks": [
      "EPYC-Genoa",
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9845",
    "name": "AMD EPYC 9845",
    "vendor": "amd",
    "qemu": "EPYC-Turin",
    "fallbacks": [
      "EPYC-Genoa",
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "amd-epyc-9965",
    "name": "AMD EPYC 9965",
    "vendor": "amd",
    "qemu": "EPYC-Turin",
    "fallbacks": [
      "EPYC-Genoa",
      "EPYC-Milan",
      "EPYC-Rome",
      "EPYC"
    ]
  },
  {
    "key": "intel-xeon-silver-4110",
    "name": "Intel Xeon Silver 4110",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-silver-4114",
    "name": "Intel Xeon Silver 4114",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-silver-4116",
    "name": "Intel Xeon Silver 4116",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-gold-5118",
    "name": "Intel Xeon Gold 5118",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-gold-5120",
    "name": "Intel Xeon Gold 5120",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-gold-5122",
    "name": "Intel Xeon Gold 5122",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-gold-6130",
    "name": "Intel Xeon Gold 6130",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-gold-6138",
    "name": "Intel Xeon Gold 6138",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-gold-6140",
    "name": "Intel Xeon Gold 6140",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-gold-6148",
    "name": "Intel Xeon Gold 6148",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-gold-6154",
    "name": "Intel Xeon Gold 6154",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-platinum-8160",
    "name": "Intel Xeon Platinum 8160",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-platinum-8168",
    "name": "Intel Xeon Platinum 8168",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-platinum-8180",
    "name": "Intel Xeon Platinum 8180",
    "vendor": "intel",
    "qemu": "Skylake-Server",
    "fallbacks": [
      "qemu64"
    ]
  },
  {
    "key": "intel-xeon-bronze-3204",
    "name": "Intel Xeon Bronze 3204",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-bronze-3206r",
    "name": "Intel Xeon Bronze 3206R",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4210",
    "name": "Intel Xeon Silver 4210",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4210r",
    "name": "Intel Xeon Silver 4210R",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4214",
    "name": "Intel Xeon Silver 4214",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4214r",
    "name": "Intel Xeon Silver 4214R",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4216",
    "name": "Intel Xeon Silver 4216",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5218",
    "name": "Intel Xeon Gold 5218",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5218r",
    "name": "Intel Xeon Gold 5218R",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5220",
    "name": "Intel Xeon Gold 5220",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5220r",
    "name": "Intel Xeon Gold 5220R",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6230",
    "name": "Intel Xeon Gold 6230",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6230r",
    "name": "Intel Xeon Gold 6230R",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6240",
    "name": "Intel Xeon Gold 6240",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6240r",
    "name": "Intel Xeon Gold 6240R",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6248",
    "name": "Intel Xeon Gold 6248",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6248r",
    "name": "Intel Xeon Gold 6248R",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6258r",
    "name": "Intel Xeon Gold 6258R",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8260",
    "name": "Intel Xeon Platinum 8260",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8280",
    "name": "Intel Xeon Platinum 8280",
    "vendor": "intel",
    "qemu": "Cascadelake-Server",
    "fallbacks": [
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4309y",
    "name": "Intel Xeon Silver 4309Y",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4310",
    "name": "Intel Xeon Silver 4310",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4314",
    "name": "Intel Xeon Silver 4314",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4316",
    "name": "Intel Xeon Silver 4316",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5315y",
    "name": "Intel Xeon Gold 5315Y",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5317",
    "name": "Intel Xeon Gold 5317",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5318y",
    "name": "Intel Xeon Gold 5318Y",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5320",
    "name": "Intel Xeon Gold 5320",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6326",
    "name": "Intel Xeon Gold 6326",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6330",
    "name": "Intel Xeon Gold 6330",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6334",
    "name": "Intel Xeon Gold 6334",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6336y",
    "name": "Intel Xeon Gold 6336Y",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6338",
    "name": "Intel Xeon Gold 6338",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6342",
    "name": "Intel Xeon Gold 6342",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6346",
    "name": "Intel Xeon Gold 6346",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6348",
    "name": "Intel Xeon Gold 6348",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8352y",
    "name": "Intel Xeon Platinum 8352Y",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8358",
    "name": "Intel Xeon Platinum 8358",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8360y",
    "name": "Intel Xeon Platinum 8360Y",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8380",
    "name": "Intel Xeon Platinum 8380",
    "vendor": "intel",
    "qemu": "Icelake-Server",
    "fallbacks": [
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4410y",
    "name": "Intel Xeon Silver 4410Y",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4416-plus",
    "name": "Intel Xeon Silver 4416+",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5415-plus",
    "name": "Intel Xeon Gold 5415+",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5416s",
    "name": "Intel Xeon Gold 5416S",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5418y",
    "name": "Intel Xeon Gold 5418Y",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5420-plus",
    "name": "Intel Xeon Gold 5420+",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6414u",
    "name": "Intel Xeon Gold 6414U",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6416h",
    "name": "Intel Xeon Gold 6416H",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6418h",
    "name": "Intel Xeon Gold 6418H",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6430",
    "name": "Intel Xeon Gold 6430",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6434",
    "name": "Intel Xeon Gold 6434",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6438y-plus",
    "name": "Intel Xeon Gold 6438Y+",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6442y",
    "name": "Intel Xeon Gold 6442Y",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6444y",
    "name": "Intel Xeon Gold 6444Y",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6448y",
    "name": "Intel Xeon Gold 6448Y",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6454s",
    "name": "Intel Xeon Gold 6454S",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8450h",
    "name": "Intel Xeon Platinum 8450H",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8460y-plus",
    "name": "Intel Xeon Platinum 8460Y+",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8468",
    "name": "Intel Xeon Platinum 8468",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8470",
    "name": "Intel Xeon Platinum 8470",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8480-plus",
    "name": "Intel Xeon Platinum 8480+",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8490h",
    "name": "Intel Xeon Platinum 8490H",
    "vendor": "intel",
    "qemu": "SapphireRapids",
    "fallbacks": [
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4509y",
    "name": "Intel Xeon Silver 4509Y",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4510",
    "name": "Intel Xeon Silver 4510",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4514y",
    "name": "Intel Xeon Silver 4514Y",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-silver-4516y-plus",
    "name": "Intel Xeon Silver 4516Y+",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5512u",
    "name": "Intel Xeon Gold 5512U",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5515-plus",
    "name": "Intel Xeon Gold 5515+",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-5520-plus",
    "name": "Intel Xeon Gold 5520+",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6526y",
    "name": "Intel Xeon Gold 6526Y",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6530",
    "name": "Intel Xeon Gold 6530",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6534",
    "name": "Intel Xeon Gold 6534",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6538y",
    "name": "Intel Xeon Gold 6538Y",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6542y",
    "name": "Intel Xeon Gold 6542Y",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6544y",
    "name": "Intel Xeon Gold 6544Y",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6548y",
    "name": "Intel Xeon Gold 6548Y",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-gold-6554s",
    "name": "Intel Xeon Gold 6554S",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8558",
    "name": "Intel Xeon Platinum 8558",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8568y-plus",
    "name": "Intel Xeon Platinum 8568Y+",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8580",
    "name": "Intel Xeon Platinum 8580",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-platinum-8592-plus",
    "name": "Intel Xeon Platinum 8592+",
    "vendor": "intel",
    "qemu": "EmeraldRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6710e",
    "name": "Intel Xeon 6710E",
    "vendor": "intel",
    "qemu": "SierraForest",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6731e",
    "name": "Intel Xeon 6731E",
    "vendor": "intel",
    "qemu": "SierraForest",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6740e",
    "name": "Intel Xeon 6740E",
    "vendor": "intel",
    "qemu": "SierraForest",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6746e",
    "name": "Intel Xeon 6746E",
    "vendor": "intel",
    "qemu": "SierraForest",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6756e",
    "name": "Intel Xeon 6756E",
    "vendor": "intel",
    "qemu": "SierraForest",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6766e",
    "name": "Intel Xeon 6766E",
    "vendor": "intel",
    "qemu": "SierraForest",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6780e",
    "name": "Intel Xeon 6780E",
    "vendor": "intel",
    "qemu": "SierraForest",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6960p",
    "name": "Intel Xeon 6960P",
    "vendor": "intel",
    "qemu": "GraniteRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6972p",
    "name": "Intel Xeon 6972P",
    "vendor": "intel",
    "qemu": "GraniteRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6979p",
    "name": "Intel Xeon 6979P",
    "vendor": "intel",
    "qemu": "GraniteRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  },
  {
    "key": "intel-xeon-6980p",
    "name": "Intel Xeon 6980P",
    "vendor": "intel",
    "qemu": "GraniteRapids",
    "fallbacks": [
      "SapphireRapids",
      "Icelake-Server",
      "Cascadelake-Server",
      "Skylake-Server"
    ]
  }
];

module.exports = { CPU_CATALOG };
