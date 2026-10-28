# webos-slim

A launcher, debloating toolkit, and system-development workspace for rooted LG
webOS TVs. The goal is an owner-controlled system: unwanted feature stacks
removed together with their callers and startup paths.

**Confirmed platform:** one LG 55UN7000PUB, firmware **04.64.00**, webOS
**5.6.2-21**, ARMv7. This is a device-specific project, not a universal TV profile.

| Component | Current status |
| --- | --- |
| [Launch Home](launcher/) | Current 0.0.133 source, tests and build scripts |
| [Debloat hook](slim/) | Installed/reboot-tested runtime policy; nine source files matched the live TV on 2026-10-28 |
| [Device profile](profiles/lg-55un7000pub-04.64.00.json) | Records the 18 removed apps, 66 hidden built-ins, services, activities and host rules |
| [Voice registry experiment](experiments/voice_registry.py) | Temporary unregister/restore demonstrated on the running TV |
| [Voice caller-removal builder](experiments/build_voice_ui_candidate.py) | Builds an offline candidate from private, hash-matched TV QML; not deployed |
| Permanent system-stack removal / custom firmware | Research in progress; no reduced image has been booted |

## What has actually been removed?

Eighteen removable apps were uninstalled through the regular app manager and
verified absent after reboot. Other built-in apps are currently **hidden by RAM
overlays**. Unwanted services are currently stopped/masked, killed or stubbed,
and their activity triggers are cancelled. The original built-in files remain
in the firmware. Those are different states; the existing hook is not a complete
stripped operating system.

The first live structural-removal test went beyond stopping a daemon: it
unloaded the voice service's manifest from the bus registry, tested absence,
and restored it. A harmless request to the registered/stopped service produced
no reply at its 23-second deadline (**23.715 s** including SSH). While
unregistered it returned an explicit absence error in **0.268 s**. Settings
and input queries passed, core processes did not restart, and YouTube retained
its foreground app and process. This measures one service request, not general
UI speed, RAM savings or uninterrupted audio/video.

The original registration and permissions were restored. The experiment is not
installed by the boot hook. See [the test record](docs/voice-registry.md) and
[sanitized evidence](docs/evidence/voice-registry-2026-10-28.json).

## Build the launcher

```sh
cd launcher
npm ci
npm test
npm run build
# Optional IPK using the project-local packaging CLI:
npm run pack
```

See [launcher/README.md](launcher/README.md) for installation and behavior.
Building and testing do not contact a TV. There is no combined one-click
launcher/debloat installer.

## Install the existing runtime debloat profile

Requires an already-rooted TV with Homebrew Channel startup hooks and trusted
root SSH access. Review the [removal inventory](docs/removal-status.md), all
lists, and recovery before installing. This profile disables voice, casting,
AirPlay and other features; it also restarts the interface during boot.

```sh
cp slim/slim.conf.example slim/slim.conf
# Edit PARK_INPUT and review every list for your own firmware first.
./install.sh root@<tv-ip>
# Reboot when ready, then inspect /tmp/slim.log over SSH.
```

The installer writes the hook and configuration to writable storage. It does
not run the hook or reboot the TV. `slim/60-slim` blocks hosts, parks an empty
input, applies app-hiding overlays and optional theme binds, trims keep-alives,
restarts SAM/compositor, stops services and cancels activities. It remains a
late runtime policy; it does not prove that those services never started.

### Undo

```sh
ssh root@<tv-ip> sh /home/root/restore-slim.sh
ssh root@<tv-ip> reboot
```

The restore script disables the hook and removes its runtime controls. Reboot
clears RAM mounts and masks. Saved preferences such as remembered input, Home
routing and separately configured AirPlay/privacy settings may need their own
backups to restore; disabling the hook is not a factory-state reset.

Homebrew's crashed-boot hook failsafe is brief. `60-slim` also uses its own
in-progress flag to skip an incomplete previous run once. This protects hooks,
not a broken firmware image. No automatic recovery from an invalid kernel or
rootfs has been demonstrated for the tested TV. Never flash a candidate without
a separately proven acceptance and recovery plan.

## Develop the system

Start with [system development](docs/system-development.md) and the
[roadmap](docs/roadmap.md). The next milestone is a coherent voice-stack removal:
remove callers, remove registration/activation paths, and prove normal controls
and playback still work. Establishing control before startup is a separate
requirement from live unregistering after boot.

A reduced filesystem and eventually custom firmware remain project goals. This
repository does not ship a flashable image, a firmware installer or a proven
custom-image boot path. Experiments are opt-in and excluded from `install.sh`.

## Optional system theme

`theme/build_theme.py` builds recolored QML from your private TV files. No LG
QML is distributed here. See [system development](docs/system-development.md)
for private source handling. Recheck live hashes before any deployment; a parser
pass does not establish LG runtime compatibility.

## Source and evidence

[NOTES.md](NOTES.md) records platform quirks. [docs/evidence/](docs/evidence/)
contains curated results, not private logs or firmware. [THIRD_PARTY.md](THIRD_PARTY.md)
records launcher provenance and licensing. Never upload device dumps, credentials,
account state, raw QML/binaries or native decompilation output to this repository.
