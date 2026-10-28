import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/js/luna.js',()=>({execRoot:vi.fn()}));
import {execRoot} from '../src/js/luna.js';
import {createStatsPanel} from '../src/js/stats.js';
const SAMPLE='1117824\n540672\n52000\n3725.41\ncpu 100 0 100 700 100\ncpu 150 0 150 850 150\n192.0.2.20\n';
let el,controller,config;
beforeEach(()=>{vi.useFakeTimers();execRoot.mockReset();el=document.createElement('section');config={stats:{enabled:true}};});
afterEach(()=>{controller.stop();vi.useRealTimers();});
it('keeps the last reading with a stale label and recovers on the next poll',async()=>{
 execRoot.mockResolvedValueOnce({stdoutString:SAMPLE}).mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({stdoutString:SAMPLE});
 controller=createStatsPanel(el,()=>config);await controller.refresh();await controller.refresh();expect(el.textContent).toContain('Saved reading');expect(el.textContent).toContain('Status unavailable');
 await controller.refresh();expect(el.textContent).not.toContain('Status unavailable');expect(execRoot).toHaveBeenCalledWith(expect.any(String),8000);
});
it('does not show a late reading after the widget is turned off',async()=>{
 let resolve;execRoot.mockReturnValue(new Promise(r=>resolve=r));controller=createStatsPanel(el,()=>config);const pending=controller.refresh();config.stats.enabled=false;await controller.refresh();resolve({stdoutString:SAMPLE});await pending;expect(el.hidden).toBe(true);
});
it('does not poll while the launcher is hidden',async()=>{
 controller=createStatsPanel(el,()=>config,{isVisible:()=>false});controller.start();await vi.advanceTimersByTimeAsync(60000);expect(execRoot).not.toHaveBeenCalled();
});
