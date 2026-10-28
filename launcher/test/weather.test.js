import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
vi.mock('../src/js/compat.js', () => ({compatFetch: vi.fn()}));
import {compatFetch} from '../src/js/compat.js';
import {buildHours, createWeatherPanel, forecastAge, formatHour} from '../src/js/weather.js';

const NOW = Date.parse('2026-10-27T17:30:00Z');
const LOCATION = {name: 'London', latitude: 51.5074, longitude: -0.1278};
function forecast() {
 return {utc_offset_seconds: -14400, current: {temperature_2m: 16, apparent_temperature: 14, weather_code: 2, is_day: 1},
  daily: {time:['2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31'],temperature_2m_max:[18,19,17,15,14],temperature_2m_min:[8,9,7,5,4],weather_code:[2,3,61,0,1],precipitation_probability_max:[10,20,70,0,10]},
  hourly: {time: Array.from({length:9},(_,i)=>'2026-10-27T'+String(i+12).padStart(2,'0')+':00'), temperature_2m:[15,16,17,18,17,16,15,14,13],weather_code:[2,2,2,3,3,61,61,61,3],is_day:[1,1,1,1,1,1,1,0,0],precipitation_probability:[10,10,20,30,40,60,70,60,30]}};
}
function cache(age=0, data=forecast()) { localStorage.setItem('lounge.weather.v1', JSON.stringify({location:LOCATION,fetchedAt:NOW-age,data})); }
let panel, config, controller;
beforeEach(()=>{vi.useFakeTimers(); vi.setSystemTime(NOW); localStorage.clear(); compatFetch.mockReset(); panel=document.createElement('section'); document.body.appendChild(panel); config={weather:{enabled:true,units:'f',location:LOCATION},launcher:{clockFormat:'12'}};});
afterEach(()=>{if(controller)controller.stop();controller=null;panel.remove();vi.useRealTimers();});
function setup() {controller=createWeatherPanel(panel,()=>config);return controller;}
function reply(data=forecast()){compatFetch.mockResolvedValue({ok:true,text:()=>Promise.resolve(JSON.stringify(data))});}

describe('weather widget',()=>{
 it('selects the next six local hours independently of the TV time zone',()=>{
  const hours=buildHours(forecast(),NOW);expect(hours).toHaveLength(6);expect(hours[0].time).toBe('2026-10-27T13:00');expect(formatHour(hours[0].time,'12')).toBe('1 PM');expect(formatHour(hours[0].time,'24')).toBe('13:00');
  const data=forecast();data.hourly.time=['2026-10-27T23:00','2026-10-28T00:00','2026-10-28T01:00'];
  expect(buildHours(data,Date.parse('2026-10-28T03:30:00Z')).map(h=>formatHour(h.time,'12'))).toEqual(['11 PM','12 AM','1 AM']);
 });
 it('switches forecast view without replacing the focused button',async()=>{
  cache();await setup().refresh();const button=panel.querySelector('#weather-view');button.focus();button.click();
  expect(panel.querySelectorAll('.weather-hour')).toHaveLength(6);expect(button.getAttribute('aria-checked')).toBe('true');
  await controller.refresh();expect(document.activeElement).toBe(button);expect(panel.querySelector('#weather-view')).toBe(button);
  button.click();expect(panel.querySelectorAll('.weather-hour')).toHaveLength(0);expect(panel.textContent).toContain('Feels like 57°');expect(panel.querySelector('.weather-unit-inline').textContent).toBe('F');
 });
 it('retains cached forecast and exposes failure when refresh is offline, then recovers',async()=>{
  cache(3600000);compatFetch.mockRejectedValue(new Error('offline'));await setup().refresh();
  expect(panel.textContent).toContain('Update failed · saved 1h ago');expect(panel.querySelectorAll('.weather-day')).toHaveLength(4);
  reply();await controller.refresh(true);expect(panel.textContent).toContain('Updated just now');expect(panel.textContent).not.toContain('Update failed');
 });
 it('offers retry when there is no cache and coalesces repeated Refresh clicks',async()=>{
  let resolve;compatFetch.mockReturnValue(new Promise(r=>{resolve=r}));const pending=setup().refresh();
  const button=panel.querySelector('#weather-refresh');button.focus();button.click();button.click();expect(compatFetch).toHaveBeenCalledTimes(1);
  resolve({ok:false,status:503});await pending;expect(panel.hidden).toBe(false);expect(panel.textContent).toContain('Weather unavailable');expect(document.activeElement).toBe(button);
 });
 it('hides a widget disabled during an in-flight request',async()=>{
  let resolve;compatFetch.mockReturnValue(new Promise(r=>{resolve=r}));const pending=setup().refresh();config.weather.enabled=false;await controller.refresh();
  resolve({ok:true,text:()=>Promise.resolve(JSON.stringify(forecast()))});await pending;expect(panel.hidden).toBe(true);
 });
 it('rejects malformed updates without overwriting a valid saved forecast',async()=>{
  cache(3600000);reply({});await setup().refresh();expect(panel.textContent).toContain('saved 1h ago');expect(JSON.parse(localStorage.getItem('lounge.weather.v1')).data.daily.time).toHaveLength(5);
 });
 it('does not relabel an expired forecast as today',async()=>{
  const data=forecast();data.daily.time=['2026-10-25'];cache(3*86400000,data);compatFetch.mockRejectedValue(new Error('offline'));await setup().refresh();expect(panel.textContent).toContain('Weather unavailable');expect(panel.querySelector('.weather-today')).toBeNull();
 });
 it('formats forecast age and requests hourly fields without changing temperature units',async()=>{
  expect(forecastAge(NOW-90000,NOW)).toBe('1m ago');reply();await setup().refresh();const url=new URL(compatFetch.mock.calls[0][0]);expect(url.searchParams.get('hourly')).toContain('precipitation_probability');expect(url.searchParams.get('temperature_unit')).toBeNull();
 });
});
