import {beforeEach, describe, expect, it} from 'vitest';
import {DEFAULT_CONFIG, configFromBackup, loadConfig} from '../src/js/config.js';
import {getAppIdCandidates, getBuiltinAppIcon, getBuiltinAppTitle} from '../src/js/app-icons.js';
import {completeInputList} from '../src/js/inputs.js';

beforeEach(() => localStorage.clear());

describe('personal minimal LG 55UN7000PUB profile', () => {
  it('pins the requested media apps and Homebrew maintenance', () => {
    expect(loadConfig().launcher.pinnedApps).toEqual([
      'youtube.leanback.v4', 'twitch.adamffdev.v1', 'org.xbmc.kodi',
      'org.jellyfin.webos', 'org.webosbrew.hbchannel'
    ]);
    expect(loadConfig().launcher.allAppsTile).toBe(false);
    expect(loadConfig().launcher.terminalChecked).toBe(true);
  });

  it('starts without online wallpaper or background music', () => {
    const c = loadConfig();
    expect(c.background.source).toBe('preset');
    expect(c.background.preset).toBe('midnight');
    expect(c.music.enabled).toBe(false);
    expect('voiceEnabled' in c.launcher).toBe(false);
    expect(c.launcher.volumeAtHome).toBeNull();
    expect(c.launcher.volumeOnAppLaunch).toBeNull();
    expect(c.launcher.manageSystemScreensaver).toBe(false);
  });

  it('drops the removed voice assistant setting from older saved settings', () => {
    localStorage.setItem('lounge.config.v1', JSON.stringify({version: 26, launcher: {voiceEnabled: true}}));
    expect('voiceEnabled' in loadConfig().launcher).toBe(false);
    expect(JSON.parse(localStorage.getItem('lounge.config.v1')).launcher.voiceEnabled).toBeUndefined();
    const restored = configFromBackup({version: 99, launcher: {voiceEnabled: true}}, loadConfig());
    expect('voiceEnabled' in restored.config.launcher).toBe(false);
  });

  it('shows the London forecast in Fahrenheit and the TV status card', () => {
    const c = loadConfig();
    expect(c.weather.enabled).toBe(true);
    expect(c.weather.units).toBe('f');
    expect(c.weather.location.name).toBe('London');
    expect(c.weather.location.latitude).toBeCloseTo(51.5074, 4);
    expect(c.weather.location.longitude).toBeCloseTo(-0.1278, 4);
    expect(c.stats.enabled).toBe(true);
  });

  it('leaves home-button and startup takeover off for the initial TV trial', () => {
    const c = loadConfig();
    expect(c.launcher.bootOnStart).toBe(false);
    expect(c.launcher.launchOnHome).toBe(false);
    expect(c.launcher.returnOnAppExit).toBe(false);
  });

  it('keeps a tuner shortcut even before the TV returns a channel list', () => {
    const devices = completeInputList({devices: [], maxHdmiCount: 3}, false,
      DEFAULT_CONFIG.launcher.addedInputs);
    expect(devices.find(d => d.id === 'TV').appId).toBe('com.webos.app.livetv');
    expect(devices.filter(d => d.id.startsWith('HDMI_')).length).toBe(3);
  });

  it('does not confuse LG internet channels with antenna/cable Live TV', () => {
    expect(getBuiltinAppTitle('com.webos.app.livetv')).toBe('Live TV');
    expect(getAppIdCandidates('com.webos.app.lgchannels')).not.toContain('com.webos.app.livetv');
    expect(getAppIdCandidates('com.webos.app.livetv')).not.toContain('lgchannels.us');
    expect(getBuiltinAppIcon('com.webos.app.livetv')).not.toContain('lg-channels');
  });

  it('uses the installed ad-free Twitch application, not the duplicate stock app', () => {
    expect(getBuiltinAppTitle('twitch.adamffdev.v1')).toBe('Twitch');
    expect(getBuiltinAppIcon('twitch.adamffdev.v1')).toBe('assets/app-icons/gpui/twitch.svg');
    expect(DEFAULT_CONFIG.launcher.pinnedApps).not.toContain('tv.twitch.tv.starshot.lg');
  });
});
