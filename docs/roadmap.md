# Toward an owner-controlled webOS system

Success means unwanted feature stacks have no remaining callers expecting
them, no startup/activation registration, and no process launches. The runtime
kill/mask hook is a useful baseline and rollback layer, not the final design.

## 1. Complete one removal unit: voice

The first removal unit is voice recognition/assistants, preserving Audio
Guidance TTS, Bluetooth and ordinary input. Live manifest unregister/restore is
proven for voice on the confirmed TV. The Quick Settings/InputPicker caller
candidate is prepared but not runtime-tested.

Next work:

1. Trace native clients in input, Bluetooth audio and the browser engine.
   Literal service names in `lginput2`, `btaudiosrc` and `libcbe` are leads,
   not proof of required calls. Determine callbacks, timeout behavior and
   nonvoice dependencies before editing them.
2. Test the caller-removal candidate in the actual LG runtime with a planned
   interface restart and rollback. An interface restart can interrupt playback.
3. Combine approved client changes with the voice unit, target links, Luna
   manifest, activities and keep-alive changes as one versioned removal policy.
4. Check real remote/Settings operation, active Audio Guidance, playback/audio,
   HDMI signal, Bluetooth and root recovery. Observe repeated uses and idle
   periods, not only one successful API response.

Acceptance: no voice requests from the changed clients; no voice process or
activation attempt; no dangling readiness dependencies or timeout regressions;
protected features pass; rollback restores the preceding profile.

## 2. Establish control before startup

Trace the actual mount/systemd/Luna order and find a controllable point before
target services and registries are loaded. Root privileges and writable
per-service environment files do not establish a universal early override.
Renaming an init.d hook earlier does not prove it runs before systemd/Luna.

Acceptance: cold-boot evidence shows unwanted services never execute or register
before policy is active. Late kills, cosmetic hiding and late unregistration
do not satisfy this milestone. Any installed startup change needs explicit
owner approval and a concrete rollback/recovery plan.

## 3. Expand the removal profile

Repeat coherent removal for ads/telemetry/ACR, casting/AirPlay, recommendations,
preloading and unwanted built-ins. Maintain explicit keep/remove/unknown
manifests for systemd, Luna registrations, activities, clients, shared libraries,
configuration and files. Never delete a shared dependency just because one
unwanted component references it.

Acceptance: each feature group passes the same functional, failure, startup and
rollback checks. Make device/firmware hash gates and differences visible.

## 4. Build a reduced filesystem offline

Build reproducibly from the owner's verified files, omitting approved removal
units. Preserve file metadata, links and required hardware/media components.
Record a content manifest and deterministic transformation steps. Keep this
separate from a flashable package and from the proven runtime profile.

Acceptance: offline dependency and layout checks pass; every deletion is
accounted for; no claim of hardware boot compatibility is inferred from a
successful filesystem build or emulation.

## 5. Investigate custom firmware boot and recovery

Custom firmware remains a goal. Acceptance of a rebuilt image and recovery from
a failed boot are separate, unresolved requirements on this TV. Do not assume
automatic A/B fallback or that Homebrew's hook failsafe protects system images.
A private verified dump is a recovery asset, not a demonstrated software restore.

No flashing without explicit owner approval after the concrete image,
acceptance evidence and tested recovery method are reviewable. No factory
reset or unrequested firmware update as a shortcut.
