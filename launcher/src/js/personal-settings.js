import {createSettingsPanel} from './settings.js';
import {saveConfig} from './config.js';
import {launchApp} from './luna.js';

export function createPersonalSettingsPanel(panel, getConfig, options) {
  const advanced = createSettingsPanel(panel, getConfig, options);
  let quickVisible = false;
  let openedAt = 0;
  let draft = null;

  function hide() {
    if (advanced.isVisible()) { advanced.hide(); return; }
    quickVisible = false;
    panel.hidden = true;
    panel.classList.remove('personal-settings');
    document.body.classList.remove('settings-open');
    if (options.onClose) options.onClose();
  }

  function button(label, action, index, primary) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = (primary ? 'settings-save' : 'settings-mini-btn') + ' focusable';
    el.dataset.focusIndex = String(index);
    el.textContent = label;
    el.addEventListener('click', function () {
      if (Date.now() - openedAt < 350) return;
      action();
    });
    return el;
  }

  function show() {
    if (quickVisible || advanced.isVisible()) return;
    openedAt = Date.now();
    draft = JSON.parse(JSON.stringify(getConfig()));
    quickVisible = true;
    panel.innerHTML = '';
    panel.classList.add('personal-settings');
    panel.hidden = false;
    document.body.classList.add('settings-open');
    if (options.onOpen) options.onOpen();
    const header = document.createElement('header');
    header.className = 'settings-header';
    const heading = document.createElement('div');
    heading.innerHTML = '<h2>Home settings</h2><p class="settings-hint">GPUI Dark</p>';
    header.appendChild(heading);
    const actions = document.createElement('div');
    actions.className = 'settings-header-actions';
    actions.appendChild(button('Save', function () {
      saveConfig(draft);
      if (options.onSave) options.onSave(draft);
      hide();
    }, 901, true));
    actions.appendChild(button('Close', hide, 902, false));
    header.appendChild(actions);
    panel.appendChild(header);
    const body = document.createElement('div');
    body.className = 'settings-body personal-settings-body';
    panel.appendChild(body);
    function section(title) {
      const el = document.createElement('section');
      el.className = 'settings-section';
      const h = document.createElement('h3');
      h.textContent = title;
      el.appendChild(h);
      body.appendChild(el);
      return el;
    }
    function toggle(parent, label, key, index, clockFormat, values) {
      const target = values || draft.launcher;
      const row = document.createElement('label');
      row.className = 'settings-row';
      const text = document.createElement('span');
      text.textContent = label;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'focusable';
      input.dataset.focusIndex = String(index);
      input.setAttribute('aria-label', label);
      input.checked = clockFormat ? target.clockFormat === '12' : !!target[key];
      input.addEventListener('change', function () {
        target[key] = clockFormat ? (input.checked ? '12' : '24') : input.checked;
        if (key === 'launchOnHome') draft.launcher.returnOnAppExit = input.checked;
      });
      row.appendChild(text);
      row.appendChild(input);
      parent.appendChild(row);
    }
    const display = section('Clock');
    toggle(display, 'Show time', 'showClock', 910);
    toggle(display, 'Show date', 'showDate', 911);
    toggle(display, '12-hour time', 'clockFormat', 912, true);
    const widgets = section('Widgets');
    draft.weather = draft.weather || {};
    draft.stats = draft.stats || {};
    draft.calendar = draft.calendar || {};
    draft.calendar.enabled = draft.calendar.enabled !== false;
    draft.weather.effectsEnabled = draft.weather.effectsEnabled !== false;
    draft.weather.enabled = draft.weather.enabled !== false;
    draft.stats.enabled = draft.stats.enabled !== false;
    toggle(widgets, 'Show weather', 'enabled', 915, false, draft.weather);
    toggle(widgets, 'Show calendar', 'enabled', 916, false, draft.calendar);
    toggle(widgets, 'Show TV status', 'enabled', 917, false, draft.stats);
    toggle(widgets, 'Weather effects behind Home', 'effectsEnabled', 918, false, draft.weather);
    const widgetHint = document.createElement('p');
    widgetHint.className = 'settings-hint';
    widgetHint.textContent = 'Weather location and units are in Advanced tools → Weather. Effects pause away from Home.';
    widgets.appendChild(widgetHint);
    const home = section('Home');
    toggle(home, 'Open with the Home button', 'launchOnHome', 920);
    toggle(home, 'Open when the TV starts', 'bootOnStart', 921);
    const tools = section('Maintenance');
    const shortcuts = document.createElement('div');
    shortcuts.className = 'personal-tool-buttons';
    [['TV Settings', 'com.palm.app.settings'], ['Homebrew', 'org.webosbrew.hbchannel']].forEach(function (entry, i) {
      shortcuts.appendChild(button(entry[0], function () {
        hide();
        launchApp(entry[1]).catch(function () { if (options.onToast) options.onToast('Could not open ' + entry[0]); });
      }, 930 + i));
    });
    shortcuts.appendChild(button('Advanced tools', function () {
      quickVisible = false;
      panel.classList.remove('personal-settings');
      advanced.show();
    }, 932));
    tools.appendChild(shortcuts);
    const note = document.createElement('p');
    note.className = 'settings-hint';
    note.textContent = 'Bouncing DVD screensaver is enabled; its wait is in Advanced tools -> Screensaver. Backup, restore and app arrangement are there too.';
    tools.appendChild(note);
    if (options.onRendered) options.onRendered();
  }

  return {
    show: show,
    hide: hide,
    isVisible: function () { return quickVisible || advanced.isVisible(); },
    handleBack: function () { return advanced.isVisible() ? advanced.handleBack() : false; }
  };
}
