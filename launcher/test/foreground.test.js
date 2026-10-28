import {describe, expect, it} from 'vitest';
import {pickForegroundId} from '../src/js/luna.js';

describe('foreground windows on webOS 5', () => {
  it('detects the visible Home overlay above a streaming app', () => {
    expect(pickForegroundId({foregroundAppInfo: [
      {appId: 'youtube.leanback.v4', windowType: '_WEBOS_WINDOW_TYPE_CARD'},
      {appId: 'com.webos.app.home', windowType: '_WEBOS_WINDOW_TYPE_HOME'}
    ]})).toBe('com.webos.app.home');
  });

  it('keeps TV Settings in control when its overlay is on top', () => {
    expect(pickForegroundId({foregroundAppInfo: [
      {appId: 'org.webosbrew.lounge.launcher'},
      {appId: 'com.palm.app.settings', windowType: '_WEBOS_WINDOW_TYPE_OVERLAY'}
    ]})).toBe('com.palm.app.settings');
  });

  it('handles a normal card and the legacy direct app-id response', () => {
    expect(pickForegroundId({foregroundAppInfo: [{appId: 'com.webos.app.hdmi1'}]})).toBe('com.webos.app.hdmi1');
    expect(pickForegroundId({appId: 'twitch.adamffdev.v1'})).toBe('twitch.adamffdev.v1');
    expect(pickForegroundId({foregroundAppInfo: []})).toBe('');
  });
});
