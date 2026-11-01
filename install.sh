#!/usr/bin/env bash
# The StarCloud installer is now installer.sh. This file only forwards to it,
# so older commands (and an older panel's upgrade step) keep working:
#   sudo bash install.sh   ->   sudo bash installer.sh
exec bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/installer.sh" "$@"
