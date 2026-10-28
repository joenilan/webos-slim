import {beforeEach, expect, it, vi} from 'vitest';
vi.mock('../src/js/settings.js', () => ({createSettingsPanel: () => ({show: vi.fn(), hide: vi.fn(), isVisible: () => false, handleBack: () => false})}));
vi.mock('../src/js/luna.js', () => ({launchApp: vi.fn(async () => ({}))}));
import {createPersonalSettingsPanel} from '../src/js/personal-settings.js';
beforeEach(() => { document.body.innerHTML = ''; localStorage.clear(); vi.useFakeTimers(); });
function setup() {
 const panel = document.createElement('div'); document.body.appendChild(panel);
 const config = {version:26, launcher:{showClock:true,showDate:true,clockFormat:'12',launchOnHome:true,returnOnAppExit:true,bootOnStart:true}, weather:{enabled:false,units:'f',location:{name:'London'}}};
 const onSave = vi.fn(); const onClose = vi.fn();
 const settings = createPersonalSettingsPanel(panel, () => config, {onSave,onClose});
 settings.show(); vi.advanceTimersByTime(400);
 return {panel,config,settings,onSave,onClose};
}
it('cancel discards pending changes and restores the home surface', () => {
 const {panel,config,settings,onSave,onClose} = setup();
 const toggle = panel.querySelector('[aria-label="Show time"]'); toggle.click();
 expect(config.launcher.showClock).toBe(true);
 settings.hide();
 expect(onSave).not.toHaveBeenCalled(); expect(onClose).toHaveBeenCalledOnce();
 expect(panel.hidden).toBe(true); expect(document.body.classList.contains('settings-open')).toBe(false);
 vi.useRealTimers();
});
it('saving Home off also clears return interception while preserving other preferences', () => {
 const {panel,config,onSave} = setup();
 panel.querySelector('[aria-label="Open with the Home button"]').click();
 panel.querySelector('.settings-save').click();
 const saved=onSave.mock.calls[0][0];
 expect(saved.launcher.launchOnHome).toBe(false); expect(saved.launcher.returnOnAppExit).toBe(false);
 expect(saved.launcher.bootOnStart).toBe(true); expect(saved.weather.enabled).toBe(false);
 expect(config.launcher.launchOnHome).toBe(true);
 expect(JSON.parse(localStorage.getItem('lounge.config.v1'))).toEqual(saved);
 vi.useRealTimers();
});
it('saves widget toggles without resetting weather location or units', () => {
 const {panel,config,onSave}=setup();
 panel.querySelector('[aria-label="Show weather"]').click();
 panel.querySelector('[aria-label="Show calendar"]').click();
 panel.querySelector('[aria-label="Weather effects behind Home"]').click();
 panel.querySelector('[aria-label="Show TV status"]').click();panel.querySelector('.settings-save').click();
 const saved=onSave.mock.calls[0][0];expect(saved.weather.enabled).toBe(true);expect(saved.stats.enabled).toBe(false);expect(config.weather.enabled).toBe(false);expect(saved.weather.units).toBe('f');expect(saved.weather.location.name).toBe('London');
 expect(saved.calendar.enabled).toBe(false);expect(saved.weather.effectsEnabled).toBe(false);expect(config.calendar).toBeUndefined();expect(config.weather.effectsEnabled).toBeUndefined();
 vi.useRealTimers();
});
