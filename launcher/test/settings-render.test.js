import {afterEach, describe, expect, it} from 'vitest';
import {createSettingsPanel} from '../src/js/settings.js';
import {loadConfig} from '../src/js/config.js';

afterEach(() => { document.body.innerHTML = ''; document.body.className = ''; localStorage.clear(); });

function waitFor(check, ms) {
  const until = Date.now() + (ms || 8000);
  return new Promise(function (resolve, reject) {
    (function poll() {
      if (check()) return resolve();
      if (Date.now() > until) return reject(new Error('timed out'));
      setTimeout(poll, 20);
    })();
  });
}

describe('Advanced settings', () => {
  it('has no AI Voice category and saves the TV screensaver wait', async () => {
    document.body.classList.add('theme-gpui');
    const panel = document.createElement('div');
    document.body.appendChild(panel);
    const config = loadConfig();
    let saved = null;
    const settings = createSettingsPanel(panel, () => config, {onSave: (c) => { saved = c; }});
    settings.show();
    await waitFor(() => panel.querySelector('.settings-save'), 15000);
    const tabs = Array.prototype.map.call(panel.querySelectorAll('.settings-tab'), (t) => t.dataset.tab);
    expect(tabs).not.toContain('ai');
    expect(panel.querySelector('[class*="ai-"]')).toBeNull();
    const stepper = panel.querySelector('.settings-tab-pane[data-tab="screensaver"] [data-focus-index="995"]');
    expect(stepper.value).toBe('tv');
    stepper.__step(2); // TV default -> 3 -> 10 minutes
    expect(stepper.value).toBe('10');
    // Clicks right after opening are ignored (the remote click that opened it).
    await new Promise((r) => setTimeout(r, 800));
    panel.querySelector('.settings-save').click();
    await waitFor(() => saved, 5000);
    expect(saved.launcher.manageSystemScreensaver).toBe(true);
    expect(saved.launcher.screensaverMinutes).toBe(10);
  }, 20000);
});
