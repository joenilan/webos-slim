import {afterEach, describe, expect, it, vi} from 'vitest';
import {createCustomScreensaver} from '../src/js/screensaver.js';

let saver;

afterEach(() => {
  if (saver) saver.stop();
  saver = null;
  document.body.innerHTML = '';
  document.body.className = '';
  vi.useRealTimers();
});

function preview(clockFormat) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-18T18:30:00Z'));
  document.body.innerHTML = '<div id="saver" hidden><div class="custom-screensaver-bg-a"></div>' +
    '<div class="custom-screensaver-bg-b"></div><div class="custom-screensaver-time"></div>' +
    '<div class="custom-screensaver-date"></div></div>';
  saver = createCustomScreensaver({
    rootEl: document.getElementById('saver'),
    getConfig: () => ({
      launcher: {clockFormat, timezone: 'UTC'},
      background: {source: 'preset', preset: 'midnight'}
    })
  });
  saver.preview();
  return document.querySelector('.custom-screensaver-time');
}

describe('screensaver clock and remote wake', () => {
  it('honors the personal 12-hour clock and wakes on a remote arrow', () => {
    const clock = preview('12');
    expect(clock.textContent).toBe('6:30PM');
    expect(clock.querySelector('.clock-ampm').textContent).toBe('PM');
    expect(saver.isActive()).toBe(true);
    vi.advanceTimersByTime(1201);
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    expect(saver.isActive()).toBe(false);
    expect(document.getElementById('saver').hidden).toBe(true);
  });

  it('preserves 24-hour display when that format is selected', () => {
    const clock = preview('24');
    expect(clock.textContent).toBe('18:30');
    expect(clock.querySelector('.clock-ampm')).toBeNull();
  });
});
