# webOS notes

Quirks found while building this on a webOS 5 TV. Each one cost real time.

## Luna bus

- Over SSH, `luna-send` prints nothing without a tty. Use `ssh -tt`, or
  redirect stdin: `luna-send ... </dev/null`.
- Inside a pipeline (`... | while read`), `luna-send` reads the pipe as its
  stdin, exits 0 at once and **sends nothing**. Always add `</dev/null` in
  scripts.
- Many LG daemons are dynamic Luna services (`Type=dynamic` in
  `/usr/share/dbus-1/system-services`), started on demand by ls-hubd. A
  systemd mask does nothing for them; kill them instead, and only if nothing
  keeps calling them.
- To find who calls a service: start
  `(timeout -t 12 ls-monitor -j -f com.webos.service.X > f &)`, kill the
  daemon, then count `"sender"` in `f`. BusyBox `timeout` needs `-t`; a stray
  ls-monitor blocks new ones (killall it); `ls-monitor -s` hangs.
- Calls to a stopped or stubbed service hang until the caller's timeout
  (about 20 s on the tested TV). The bus queues them.

## systemd (239)

- A unit file in `/etc/systemd/system` outranks a runtime mask in `/run`. Check
  `systemctl show -p FragmentPath`; block such units with a runtime drop-in
  (`ConditionPathExists=/run/<never>`) and a `daemon-reload`.
- Some LG daemons ignore SIGTERM and hang in "deactivating" (nudge, homekit).
  `is-active` is false for that state; test `ActiveState` and SIGKILL.
- preload-manager comes back after an app-manager/compositor restart and
  preloads inputs and Live TV over your home app. Block it before restarting
  those.

## Processes

- Some daemons rename their main thread (photorenderer shows as `tPRM`, the
  unified JS server as `unified_service`), so `killall`/`pidof` by name can
  miss them or falsely report them gone. Verify by `/proc/*/exe`.
- The unified JS server (`ss.apiadapter`) hosts every `run-js-service -u`
  service including the Settings backend; it comes back about 18 s after a
  kill. Leave it.

## Mounts

- An overlay mounted over a directory hides bind mounts made inside it
  earlier. `findmnt` still lists the hidden mount, so verify by hashing the
  file. Re-bind after overlaying (the hook does this for a custom
  screensaver QML).

## Apps and inputs

- Only one full-screen app runs at a time (the compositor enforces it), so a
  home app is closed whenever another app opens.
- The input manager reopens its last hardware source at power-on. If that is
  Live TV with an antenna, you get static at full volume. Park it on an empty
  HDMI port. Installing an IPK opens Live TV and changes this, so park again
  afterwards.
- SAM (app manager) reads its keep-alive config only at start; configd
  `reconfigure` alone is not enough.
- Quick Settings, the input picker and key mapping live inside the
  compositor (surface-manager). Theme and key-action changes need a
  compositor restart, which triggers SAM's last-input handler.
- The screensaver is launched by tvpowerd after the configd idle time
  `com.webos.service.nop.screenSaverTimeout` (1800 s by default on the tested
  TV), and only when nothing is playing.

## Tools on the TV

- BusyBox: `date` has no `%N`, `timeout` needs `-t`, no `python3`.
- Files copied with `tar`/`scp` keep the PC's modes; a web app with 0600
  files fails to load (WAM loaderror -10). chmod after copying.
