import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createCalendarPanel,monthCells} from '../src/js/calendar.js';
let el,calendar,config;
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date(2026,11,31,12));el=document.createElement('section');document.body.appendChild(el);config={calendar:{enabled:true}};});
afterEach(()=>{if(calendar)calendar.stop();calendar=null;el.remove();vi.useRealTimers();});
describe('local calendar',()=>{
 it('keeps six weeks and handles leap years',()=>{
 const cells=monthCells(2028,1,new Date(2028,1,29));expect(cells).toHaveLength(42);expect(cells.filter(d=>d.currentMonth)).toHaveLength(29);expect(cells.filter(d=>d.today)).toEqual([{day:29,currentMonth:true,today:true}]);
 });
 it('crosses year boundaries, resets to today, and preserves the focused control',()=>{
 calendar=createCalendarPanel(el,()=>config);calendar.start();const next=el.querySelector('#calendar-next');next.focus();next.click();expect(el.querySelector('#calendar-current').textContent).toBe('January 2027');expect(document.activeElement).toBe(next);expect(el.querySelector('.calendar-today').classList.contains('calendar-outside')).toBe(true);el.querySelector('#calendar-current').click();expect(el.querySelector('[aria-current="date"]').textContent).toBe('31');
 });
 it('rolls the calendar over at midnight and respects its visibility setting',async()=>{
 calendar=createCalendarPanel(el,()=>config);calendar.start();vi.setSystemTime(new Date(2027,0,1,0));await vi.advanceTimersByTimeAsync(60000);expect(el.querySelector('#calendar-current').textContent).toBe('January 2027');expect(el.querySelector('[aria-current="date"]').textContent).toBe('1');config.calendar.enabled=false;calendar.refresh();expect(el.hidden).toBe(true);
 });
 it('keeps a browsed month fixed when the current date changes',async()=>{
 calendar=createCalendarPanel(el,()=>config);calendar.start();el.querySelector('#calendar-next').click();vi.setSystemTime(new Date(2027,0,1,0));await vi.advanceTimersByTimeAsync(60000);expect(el.querySelector('#calendar-current').textContent).toBe('January 2027');el.querySelector('#calendar-current').click();expect(el.querySelector('[aria-current="date"]').textContent).toBe('1');
 });
});
