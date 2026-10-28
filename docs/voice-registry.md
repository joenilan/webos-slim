# Voice registration removal: live proof

On 2026-10-28, the tested TV's native bus implementation was freshly extracted
from its verified rootfs dump. Its hash matched both the previous extraction
and the live executable. REA/Ghidra analysis traced the manifest add/remove
handlers and their SecurityData operations. Raw firmware and decompiled code
are private and are not published here.

With the original nonvolatile manifest path and an empty prefix, this firmware
supports unloading/reloading that manifest through the root bus API. That path
changes its in-memory registry. External manifests use a different,
persistence-capable path; do not generalize the result to arbitrary paths.

| Test | Observed result |
| --- | --- |
| Registered, stopped voice service | No reply at a 23-second request deadline; 23.715 s wall time including SSH |
| Nonexistent control service | Explicit service-absence response |
| Voice manifest unloaded | Explicit service-absence response in 0.268 s wall time including SSH |
| Settings and input queries during removal | Successful; saved input remained HDMI 3 |
| Bus, compositor, app manager | Same process IDs before/during/after |
| YouTube | Same foreground app and process |
| Original manifest reloaded | Successful; parsed permissions matched baseline exactly |
| Restored registered/stopped probe | Again no reply within a bounded four-second request |
| Original files | Hashes unchanged |

An independent RAM-only timed restoration guard was armed before removal, then
disarmed after direct restoration succeeded. Automatic timed recovery was not
exercised. Saved Audio Guidance was off. Audio/video continuity, active TTS,
physical remote behavior and real HDMI signal were not measured. Voice was
already stopped: this test establishes no additional RAM savings. It establishes
no exclusion before startup and no general compatibility across feature stacks.

## Reproduce deliberately

Python 3, trusted root SSH access, and the exact tested hub/manifest hashes are
required. The tool refuses unknown bytes and requires voice to be stopped
already. Use one administrator at a time.

```sh
# Inspection only: reads hashes, processes, foreground and permissions.
python3 experiments/voice_registry.py <root-ssh-alias>

# Opt-in RAM unregister/probe/restore trial. Do not run through the installer.
python3 experiments/voice_registry.py <root-ssh-alias> --run-test
```

Local output goes under ignored `research-output/`. Exit status alone is not
Luna success: `luna-send` can exit zero with no response after a deadline. The
experiment requires parsed replies and restores in a `finally` path; a separate
90-second guard is left armed if direct restoration fails. A watchdog is not a
guarantee of recovery if the bus/SSH/system fails. This test does not restart
core services, deploy QML, install a boot hook or flash firmware.

The public driver adds a read-only default, exact byte gates and transport
failure tests around the locally demonstrated procedure. The public driver was
then run on the confirmed TV: its trial passed (23.312 s registered/stopped,
0.244 s unregistered), permissions restored exactly, and core processes stayed
unchanged. Its local unit checks also exercise restoration on transport/health
failures; they do not prove recovery from every infrastructure failure. See [sanitized evidence](evidence/voice-registry-2026-10-28.json).

## Caller-removal candidate

The associated candidate removes voice wiring from Quick Settings and
InputPicker: five modified QML files and three deleted voice adapters. It
retains the TTS interface and nonvoice readiness, menu and remote-control paths.
Five Qt6 syntax parses, eight isolated JavaScript behavior checks and an
independent byte-for-byte patch application passed locally. LG Qt5 module
resolution, compositor integration and physical navigation remain untested.
Other native clients still require analysis. The candidate is not installed.

The repository includes our transformer and checks, not LG's QML or a patch
containing its source. Build it privately as described in the development guide.
