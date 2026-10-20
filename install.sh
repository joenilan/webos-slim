#!/bin/sh
# Copy the slim kit to a rooted webOS TV over SSH and enable the boot hook.
# Usage: ./install.sh <ssh-host> [theme-dir]
#   ssh-host   anything `ssh` accepts (root@192.168.x.y, or a ~/.ssh/config alias)
#   theme-dir  optional output of theme/build_theme.py (files/ + manifest.tsv)
# Nothing runs until the next reboot. Undo: ssh <host> sh /home/root/restore-slim.sh
set -e
host=$1
theme=$2
[ -n "$host" ] || { echo "usage: $0 <ssh-host> [theme-dir]" >&2; exit 1; }
here=$(cd "$(dirname "$0")" && pwd)

ssh "$host" 'test -d /var/lib/webosbrew/init.d' </dev/null ||
  { echo "no /var/lib/webosbrew/init.d: is Homebrew Channel installed and the TV rooted?" >&2; exit 1; }

# tar keeps the PC's file modes; set them explicitly on the TV.
tar -C "$here/slim" -cf - . | ssh "$host" '
  set -e
  mkdir -p /home/root/slim
  tar -C /home/root/slim -xf -
  [ -f /home/root/slim/slim.conf ] || cp /home/root/slim/slim.conf.example /home/root/slim/slim.conf
  mv /home/root/slim/restore-slim.sh /home/root/restore-slim.sh
  cp /home/root/slim/60-slim /var/lib/webosbrew/init.d/60-slim
  chown -R 0:0 /home/root/slim
  chmod 644 /home/root/slim/*
  chmod 755 /home/root/slim/60-slim /var/lib/webosbrew/init.d/60-slim /home/root/restore-slim.sh'

if [ -n "$theme" ]; then
  [ -f "$theme/manifest.tsv" ] || { echo "$theme has no manifest.tsv" >&2; exit 1; }
  tar -C "$theme" -cf - files manifest.tsv | ssh "$host" '
    set -e
    rm -rf /home/root/theme
    mkdir -p /home/root/theme
    tar -C /home/root/theme -xf -
    chown -R 0:0 /home/root/theme
    find /home/root/theme -type d -exec chmod 755 {} +
    find /home/root/theme -type f -exec chmod 644 {} +'
fi

echo "installed; reboot the TV, then check: ssh $host cat /tmp/slim.log"
