/**
 * Home-screen TV status card: free memory, SoC temperature, uptime, CPU usage
 * and LAN address, read in one root shell call through the Homebrew Channel
 * exec service. Refreshes only while the home screen is visible.
 */
import {execRoot} from './luna.js';

const REFRESH_MS = 30000;
// One call, one value per line, in this order (see parseStats).
const COMMAND = [
  "awk '/^MemTotal:|^MemAvailable:/{print $2}' /proc/meminfo",
  'cat /sys/class/thermal/thermal_zone0/temp',
  "cut -d' ' -f1 /proc/uptime",
  // CPU usage from two /proc/stat samples a second apart. The load average is
  // useless here: this kernel keeps dozens of threads in D state (load ~36).
  'head -1 /proc/stat', 'sleep 1', 'head -1 /proc/stat',
  "ip -4 -o addr show 2>/dev/null | awk '$2 != \"lo\" {split($4, a, \"/\"); print a[1]; exit}'"
].join('; ');

/** Parse the command's output into numbers; missing values become null. */
export function parseStats(text) {
  const lines = String(text || '').split('\n').map(function (l) { return l.trim(); });
  function num(i) {
    const n = parseFloat(lines[i]);
    return isFinite(n) ? n : null;
  }
  const totalKb = num(0);
  const availKb = num(1);
  const milliC = num(2);
  const ip = /^\d+\.\d+\.\d+\.\d+$/.test(lines[6] || '') ? lines[6] : null;
  return {
    memTotalMb: totalKb === null ? null : Math.round(totalKb / 1024),
    memAvailMb: availKb === null ? null : Math.round(availKb / 1024),
    tempC: milliC === null ? null : milliC / 1000,
    uptimeSec: num(3),
    cpuPct: cpuPercent(lines[4], lines[5]),
    ip: ip
  };
}

/** Busy share between two "cpu ..." lines of /proc/stat (idle = idle + iowait). */
export function cpuPercent(a, b) {
  function parse(line) {
    const f = String(line || '').trim().split(/\s+/);
    if (f[0] !== 'cpu') return null;
    const v = f.slice(1).map(Number);
    if (v.length < 5 || v.some(function (n) { return !isFinite(n); })) return null;
    const total = v.reduce(function (x, y) { return x + y; }, 0);
    return {total: total, idle: v[3] + v[4]};
  }
  const x = parse(a);
  const y = parse(b);
  if (!x || !y || y.total <= x.total) return null;
  const busy = 1 - (y.idle - x.idle) / (y.total - x.total);
  return Math.round(Math.min(1, Math.max(0, busy)) * 100);
}

export function formatUptime(sec) {
  if (sec === null || sec === undefined) return '—';
  const m = Math.floor(sec / 60);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + (m % 60) + 'm';
  return (m % 60) + 'm';
}

export function formatTemp(c, units) {
  if (c === null || c === undefined) return '—';
  return units === 'f' ? Math.round(c * 9 / 5 + 32) + '°F' : Math.round(c) + '°C';
}

function row(label, value) {
  return '<div class="stats-row"><span class="stats-label">' + label +
    '</span><span class="stats-value">' + value + '</span></div>';
}

// Electronics temperature is always shown in Celsius (weather uses its own units).
export function renderStats(s) {
  const usedPct = s.memTotalMb && s.memAvailMb !== null ?
    Math.min(100, Math.max(0, Math.round(100 * (1 - s.memAvailMb / s.memTotalMb)))) : null;
  const mem = s.memAvailMb === null ? '—' : s.memAvailMb + ' MB free';
  const bar = usedPct === null ? '' :
    '<div class="stats-bar" aria-hidden="true"><span style="width:' + usedPct + '%"></span></div>';
  return '<div class="stats-title">TV status</div>' +
    row('Memory', mem) + bar +
    row('Temperature', formatTemp(s.tempC, 'c')) +
    row('CPU', s.cpuPct === null ? '—' : s.cpuPct + '%') +
    row('Uptime', formatUptime(s.uptimeSec)) +
    row('Network', s.ip || 'offline');
}

export function createStatsPanel(el, getConfig, options) {
  const isVisible = (options && options.isVisible) || function () { return true; };
  let timer = null;
  let busy = false;
  let lastStats = null;
  let updatedAt = 0;

  function enabled() {
    const c = getConfig();
    return !(c.stats && c.stats.enabled === false);
  }

  function refresh() {
    if (!el) return Promise.resolve();
    if (!enabled()) {
      el.hidden = true;
      return Promise.resolve();
    }
    if (busy || !isVisible()) return Promise.resolve();
    busy = true;
    return execRoot(COMMAND, 8000).then(function (res) {
      const out = res && res.stdoutString ? String(res.stdoutString) : '';
      if (!out) throw new Error('No status data');
      if (!enabled()) return;
      lastStats = parseStats(out);
      updatedAt = Date.now();
      el.innerHTML = renderStats(lastStats) + '<div class="stats-update">Updates every 30 seconds</div>';
      el.hidden = false;
    }).catch(function () {
      if (!enabled()) return;
      el.innerHTML = (lastStats ? renderStats(lastStats) : '<div class="stats-title">TV status</div>') +
        '<div class="stats-update">' + (lastStats ? 'Saved reading · ' +
          Math.max(1, Math.floor((Date.now() - updatedAt) / 60000)) + 'm ago. ' : '') +
        'Status unavailable. Retrying automatically.</div>';
      el.hidden = false;
    }).then(function () {
      busy = false;
    });
  }

  function start() {
    refresh();
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      if (isVisible()) refresh();
    }, REFRESH_MS);
  }

  return {refresh: refresh, start: start, stop: function () { clearInterval(timer); timer = null; }};
}
