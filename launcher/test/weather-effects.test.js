import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createWeatherEffects} from '../src/js/weather-effects.js';
let effects,el,config;
beforeEach(()=>{vi.useFakeTimers();document.body.className='';el=document.createElement('div');config={weather:{enabled:true,effectsEnabled:true}};effects=createWeatherEffects(el,()=>config);});
afterEach(()=>{effects.stop();vi.useRealTimers();});
it('obeys the off switch and stops its timer away from Home',()=>{
 expect(el.querySelectorAll('.weather-particle')).toHaveLength(16);effects.update({code:95,isDay:false});expect(el.getAttribute('data-weather')).toBe('rain');expect(el.hidden).toBe(false);expect(vi.getTimerCount()).toBe(1);config.weather.effectsEnabled=false;effects.applyConfig();expect(el.hidden).toBe(true);expect(vi.getTimerCount()).toBe(0);config.weather.effectsEnabled=true;effects.setVisible(false);expect(el.hidden).toBe(true);effects.setVisible(true);expect(el.hidden).toBe(false);effects.update(null);expect(el.hidden).toBe(true);expect(vi.getTimerCount()).toBe(0);
});
it('updates precipitation at four fps, pauses under settings, and leaves clear skies static',()=>{
 effects.update({code:61,isDay:true});const layer=el.querySelector('.weather-precipitation');const before=layer.style.transform;vi.advanceTimersByTime(249);expect(layer.style.transform).toBe(before);vi.advanceTimersByTime(1);expect(layer.style.transform).not.toBe(before);const paused=layer.style.transform;document.body.classList.add('settings-open');vi.advanceTimersByTime(1000);expect(layer.style.transform).toBe(paused);document.body.classList.remove('settings-open');effects.update({code:0,isDay:true});expect(vi.getTimerCount()).toBe(0);
});
