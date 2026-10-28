# Launch Home

The webos-slim launcher, based on [gprot42/webos-launch-home](https://github.com/gprot42/webos-launch-home).
The upstream MIT license is preserved in [LICENSE](LICENSE). This snapshot is
version **0.0.133**, developed and tested on an LG 55UN7000PUB running firmware
04.64.00 / webOS 5.6.2-21. Compatibility beyond that device is unverified here.

The launcher provides app pins, HDMI/Live TV shortcuts, remote navigation, a
single-screen 1080p dashboard, weather, a local calendar, and TV status. Settings
include native Home routing and startup integration through Homebrew Channel.
The public default forecast location is London; choose your own in settings.
No user settings or accounts are included.

```sh
cd launcher
npm ci
npm test
npm run build
# Optional installable package, built with the project-local webOS CLI:
npm run pack
```

Build output is in `dist/`. The local packaging CLI matters on webOS 5: older
global ares-package versions can create packages this firmware rejects.
Deploy only to a rooted TV you administer. Configure an ares device first;
`npm run deploy` builds, installs and may open the app, interrupting playback.
Installing an IPK may make Live TV the remembered input; the tested setup parks
an empty HDMI 3 afterwards. Review [system development](../docs/system-development.md)
before changing boot hooks or system files.

Tests/builds here do not connect to the TV. Weather uses Open-Meteo; online
wallpapers and aerials remain optional. Asset sources are recorded in
[docs/background-sources.md](docs/background-sources.md). The imported upstream
helper scripts remain in `scripts/`; source builds do not run those scripts on a TV.
