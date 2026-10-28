#!/bin/sh
# Undo the slim hook: disable it, unmask and restart listed services, drop the
# hosts block from the Homebrew-managed /etc/hosts.
DIR=/home/root/slim
rm -f /tmp/slim-lastinput.gen
[ -f /tmp/slim-lastinput.pid ] && kill "$(cat /tmp/slim-lastinput.pid)" 2>/dev/null
pkill -f 'physicalLastInputApp"\],"subscribe' 2>/dev/null
luna-send -n 1 -w 4000 luna://com.webos.service.settings/setSystemSettings \
  '{"category":"general","settings":{"lastInputApp":"com.webos.app.livetv","physicalLastInputApp":"com.webos.app.livetv"}}' </dev/null >/dev/null 2>&1
mv -f /var/lib/webosbrew/init.d/60-slim "$DIR/60-slim.disabled" 2>/dev/null
# Drop the never-start conditions first; systemd only sees that after a reload.
rm -f /run/systemd/system/*.service.d/zz-slim.conf
systemctl daemon-reload
grep -vE '^[[:space:]]*(#|$)' "$DIR/services.list" | while read -r u; do
  systemctl unmask --runtime "$u" >/dev/null 2>&1
  systemctl start "$u" >/dev/null 2>&1
  echo "restored $u: $(systemctl is-active "$u")"
done
for b in $(grep -vE '^[[:space:]]*(#|$)' "$DIR/stub.list" 2>/dev/null); do
  umount "$b" 2>/dev/null && echo "unstubbed $b"
done
if [ -f /home/root/theme/manifest.tsv ]; then
  cut -f1 /home/root/theme/manifest.tsv | while read -r path; do umount "$path" 2>/dev/null; done
  echo "theme removed"
fi
for root in /usr/palm/applications /mnt/otncabi/usr/palm/applications /media/system/apps/usr/palm/applications; do
  grep -q " $root overlay " /proc/mounts || continue
  if umount "$root" 2>/dev/null || umount -l "$root"; then echo "unhid apps in $root"; else echo "FAILED to unhide apps in $root"; fi
done
rm -f /var/luna/preferences/slim_inprogress
if [ -f /var/run/tvconfig/hwoption/zz-slim.json ]; then
  rm -f /var/run/tvconfig/hwoption/zz-slim.json
  luna-send -n 1 -w 8000 luna://com.webos.service.config/reconfigure '{}' </dev/null >/dev/null 2>&1
  echo "keep-alive override removed"
  systemctl restart sam
fi
if grep -q '^/dev/zram0' /proc/swaps; then
  swapoff /dev/zram0 && echo 1 > /sys/block/zram0/reset && echo "zram removed"
fi
echo cfq > /sys/block/mmcblk0/queue/scheduler 2>/dev/null
echo 3 > /proc/sys/vm/page-cluster
if grep -q '^# slim block' /etc/hosts; then
  sed '/^# slim block/,$d' /etc/hosts > /tmp/hosts.slim && cat /tmp/hosts.slim > /etc/hosts
  echo "hosts block removed"
fi
home=$(luna-send -n 1 -w 4000 luna://com.webos.service.settings/getSystemSettings \
  '{"category":"general","keys":["defaultApps"]}' </dev/null 2>/dev/null | grep -oE '"home":"[^"]*"' | cut -d'"' -f4)
[ -n "$home" ] && luna-send -n 1 -w 8000 luna://com.webos.applicationManager/launch "{\"id\":\"$home\"}" </dev/null >/dev/null 2>&1
echo "done; reboot for a fully stock state"
