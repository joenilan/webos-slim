# webos-slim

A boot hook that debloats a rooted LG webOS TV **without modifying the firmware**.
Everything it does lives in RAM or in writable storage and disappears when the
hook is removed: ads, telemetry, content recognition (ACR/LivePlus), voice,
casting and preload daemons are stopped; built-in promo apps are hidden; LG's
tracking hosts are blocked; and the TV boots straight to your home app instead
of Live TV.

Tested on one TV: **LG 55UN7000PUB, webOS 5.6.2 (firmware 04.64.00)**. Other
webOS 5 models are likely close, but service and app names differ between
models and firmware versions. Read the lists before installing, and enable
groups one at a time.

On that TV, after boot: about 570 MB available RAM (was about 270 MB) and
Settings/inputs still answer instantly.

## Why not strip the firmware?

LG's system partitions are signed. On the tested TV the bootloader halts on a
failed check and there is no automatic fallback to the other bank, so a
modified rootfs means a brick (recoverable only with an eMMC programmer). This
kit gets the same runtime result from the writable side: runtime systemd
masks, RAM-only overlays and bind mounts, and Luna calls.

## Requirements

- A rooted TV with [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel)
  (it runs `/var/lib/webosbrew/init.d` hooks at boot) and SSH as root.
- Optional: a custom home app (for example a launcher) set as the TV's default
  home app. The hook reads `defaultApps.home` and keeps that app in front.

## What it does (`slim/60-slim`)

In order, once per boot:

1. Blocks the hosts in `hosts.block` (appended to Homebrew's `/etc/hosts`).
2. Points `lastInputApp` at the home app and parks the remembered hardware
   input on an empty HDMI port (`PARK_INPUT` in `slim.conf`), so power-on never
   opens antenna static.
3. Replaces binaries in `stub.list` with a no-op (bind mount).
4. Hides apps in `apps.hide` with a read-only overlay of whiteouts.
5. Optional system-UI recolour (see `theme/`).
6. Writes a RAM-only configd layer (`keepalive.json`: trimmed app keep-alive
   list, Input key mapping), restarts the app manager and compositor once,
   and keeps the home app in front while they settle.
7. Stops and runtime-masks units in `services.list`, cancels activity-manager
   triggers in `activities.block`, and kills dynamic Luna daemons in
   `kill.list` (with a check that they stay down).
8. Keeps `lastInputApp` pointed at the home app.

Each list documents what was tested and what was rejected (some daemons are
restarted by the bus within seconds and are not worth killing).

## Install

```sh
cp slim/slim.conf.example slim/slim.conf   # optional: edit PARK_INPUT
./install.sh root@<tv-ip>                  # or an ~/.ssh/config alias
ssh root@<tv-ip> reboot
ssh root@<tv-ip> cat /tmp/slim.log          # after ~2 minutes
```

`install.sh` copies the kit to `/home/root/slim`, the undo script to
`/home/root/restore-slim.sh`, and the hook to `/var/lib/webosbrew/init.d/60-slim`.

## Undo

```sh
ssh root@<tv-ip> sh /home/root/restore-slim.sh
ssh root@<tv-ip> reboot
```

Removing the hook is enough on its own: every mask, overlay and bind mount is
RAM-only and gone after the next reboot.

## Safety

- **Failsafe:** Homebrew Channel skips hooks after a crashed boot, but its flag
  only covers about 10 seconds. The hook keeps its own flag
  (`/var/luna/preferences/slim_inprogress`) and skips itself once if the
  previous run never finished.
- **Never hide** anything named in the "kept on purpose" comment in
  `apps.hide` (Settings, inputs, first-use/EULA, service menu, remote pairing,
  software update…).
- **Remote keys:** check `com.webos.keyaction` (configd) before hiding an app
  that a remote key launches. Hiding Home Dashboard broke the Input key; it is
  remapped in `keepalive.json`.
- Calls to a stopped or stubbed Luna service hang until the caller's timeout
  (about 20 s). Only stub or kill services whose callers were tested.

## System-UI theme (`theme/`)

`theme/build_theme.py` recolours LG's QML from your own firmware (rootfs
extract or a copy of `/usr/lib/qml` from your TV) and writes `files/` and
`manifest.tsv`. The hook bind-mounts a file only when the live file's hash
still matches the one it was built from, so a firmware change can't break it.
LG's files are not included here; build them from your own TV:

```sh
mkdir rootfs && ssh root@<tv-ip> 'tar -C / -cf - usr/lib/qml' | tar -C rootfs -xf -
python3 theme/build_theme.py ./rootfs ./theme-out
./install.sh root@<tv-ip> ./theme-out
```

Edit `COLORS` in the script to choose your colour.

## Notes

See [NOTES.md](NOTES.md) for webOS quirks found along the way.

## Disclaimer

Rooting and modifying a TV is at your own risk. This does not write to signed
partitions, but test carefully and keep a way back.
