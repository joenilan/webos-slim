import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {execRoot} from '../src/js/luna.js';
let options, cancel;
beforeEach(()=>{vi.useFakeTimers();cancel=vi.fn();window.webOS={service:{request:vi.fn((uri,opts)=>{options=opts;return {cancel};})}};});
afterEach(()=>{delete window.webOS;vi.useRealTimers();});
it('cancels a stalled status request and ignores its late reply',async()=>{
 const pending=execRoot('status',8000);const rejection=expect(pending).rejects.toThrow('timed out');
 await vi.advanceTimersByTimeAsync(8000);await rejection;expect(cancel).toHaveBeenCalledOnce();options.onSuccess({stdoutString:'late'});expect(cancel).toHaveBeenCalledOnce();
});
it('clears its deadline after a successful root request',async()=>{
 const pending=execRoot('status',8000);options.onSuccess({stdoutString:'ok'});await expect(pending).resolves.toEqual({stdoutString:'ok'});await vi.advanceTimersByTimeAsync(10000);expect(cancel).toHaveBeenCalledOnce();
});
