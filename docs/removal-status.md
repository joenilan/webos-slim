# Removal status on the confirmed TV

Platform: LG 55UN7000PUB / firmware 04.64.00 / webOS 5.6.2-21. Results from one
TV do not establish compatibility with another device or firmware.

The complete machine-readable inventory is
[profiles/lg-55un7000pub-04.64.00.json](../profiles/lg-55un7000pub-04.64.00.json).

| Scope | Current implementation | Permanent removal status |
| --- | --- | --- |
| 18 removable apps | Removed through the normal app manager; absence checked after reboot | Uninstalled from this TV; not a guarantee against reinstall/update/reset |
| 66 built-in apps | RAM overlays hide application folders; SAM rescans | Original firmware files still present |
| 12 systemd units | Stop, runtime mask, or never-start condition where a higher-priority unit shadows the mask | Current boot/runtime policy; early exclusion not established |
| 12 additional process names | Killed; some dynamic services can still be requested | Registrations/callers require further work |
| HDMI content-recognition executable | RAM bind-mount stub | Original executable still present |
| Activities and tracking hosts | Cancel matching activity registrations and append host rules | Reapplied at startup; persistent feature removal not complete |
| Voice bus registration | Unloaded, probed, restored in a bounded live test | Mechanism demonstrated; not installed as permanent policy |
| Quick Settings / input-picker voice clients | Offline source transformation candidate | Not deployed or tested in LG Qt5 |

The removed apps are Prime Video, Apple TV, Disney+, ShopTime, Sling TV,
Peacock, Pluto TV, Tubi, LG Gaming Portal, Weekend Games, HBO Max, Aquarium
Relax, LG Sports Playbook, Hulu, LG Channels, Netflix, official Twitch and
LG Streaming Week. IDs are in the profile. Ad-free streaming replacements,
Homebrew and maintenance apps were intentionally kept.

`slim/apps.hide`, `services.list`, `kill.list`, `stub.list`, `activities.block`
and `hosts.block` are the current runtime policies. Nine script/config hashes
were freshly compared with the installed TV files on 2026-10-28; all matched:
[installed script evidence](evidence/installed-scripts-2026-10-28.json).
Do not interpret every list entry as a dependency-tested removal from firmware.

## Protected functions

Preserve hardware playback, HDMI, the remote and Bluetooth, Settings, Audio
Guidance TTS, SSH and recovery. Firmware updates remain blocked. An installed
app package update is distinct from a TV firmware update.

The voice experiment checked Settings reads, input reads, service permissions,
foreground and process continuity. It did not test HDMI with a real signal,
physical remote operation or active Audio Guidance. Historical successful
feature checks are not a substitute for checking those functions again after
structural removal.
