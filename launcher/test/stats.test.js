import {describe, expect, it} from 'vitest';
import {cpuPercent, formatTemp, formatUptime, parseStats, renderStats} from '../src/js/stats.js';

describe('TV status card', () => {
  it('parses the root command output', () => {
    const s = parseStats('1117824\n540672\n52000\n3725.41\n' +
      'cpu 100 0 100 700 100 0 0 0 0 0\ncpu 150 0 150 850 150 0 0 0 0 0\n192.0.2.20\n');
    expect(s.memTotalMb).toBe(1092);
    expect(s.memAvailMb).toBe(528);
    expect(s.tempC).toBe(52);
    expect(s.uptimeSec).toBeCloseTo(3725.41);
    expect(s.cpuPct).toBe(33);
    expect(s.ip).toBe('192.0.2.20');
  });

  it('turns missing or malformed values into null instead of NaN', () => {
    const s = parseStats('1117824\n\nnope\n');
    expect(s.memTotalMb).toBe(1092);
    expect(s.memAvailMb).toBeNull();
    expect(s.tempC).toBeNull();
    expect(s.uptimeSec).toBeNull();
    expect(s.ip).toBeNull();
  });

  it('computes CPU usage from two /proc/stat samples, null when unusable', () => {
    expect(cpuPercent('cpu 0 0 0 100 0', 'cpu 50 0 0 150 0')).toBe(50);
    expect(cpuPercent('cpu 0 0 0 100 0', 'cpu 0 0 0 100 0')).toBeNull();
    expect(cpuPercent('garbage', 'cpu 1 2 3 4 5')).toBeNull();
  });

  it('formats uptime and temperature', () => {
    expect(formatUptime(125)).toBe('2m');
    expect(formatUptime(3725)).toBe('1h 2m');
    expect(formatUptime(200000)).toBe('2d 7h');
    expect(formatUptime(null)).toBe('—');
    expect(formatTemp(52, 'f')).toBe('126°F');
    expect(formatTemp(52, 'c')).toBe('52°C');
    expect(formatTemp(null, 'f')).toBe('—');
  });

  it('renders every row and a memory bar, showing offline without an address', () => {
    const html = renderStats(parseStats('1000000\n500000\n50000\n60\n\n\n'));
    for (const label of ['Memory', 'Temperature', 'CPU', 'Uptime', 'Network']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('width:50%');
    expect(html).toContain('offline');
    expect(html).toContain('50°C');
  });
});
