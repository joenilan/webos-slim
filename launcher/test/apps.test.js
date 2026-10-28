import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('../src/js/luna.js', () => ({
  listApps: vi.fn(),
  getAppInfo: vi.fn(),
  launchApp: vi.fn(async () => 'ok'),
  launchAppViaRoot: vi.fn(async () => 'ok'),
  readFileAsDataUrl: vi.fn(async () => '')
}));

import {launchApp, listApps, getAppInfo} from '../src/js/luna.js';
import {createAppGrid} from '../src/js/apps.js';
import {createAllApps} from '../src/js/all-apps.js';

function makeConfig(pinnedApps, numberKeyLaunch) {
  return function () {
    return {
      launcher: {
        pinnedApps: pinnedApps,
        customApps: [],
        iconSize: 'medium',
        allAppsTile: true,
        numberKeyLaunch: numberKeyLaunch
      }
    };
  };
}

function mockInstalled(ids) {
  listApps.mockResolvedValue({
    apps: ids.map((id) => ({id: id, title: id}))
  });
  getAppInfo.mockImplementation(async (id) => ({id: id, title: id}));
}

function buildGrid(pinnedApps, numberKeyLaunch) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const grid = createAppGrid(container, makeConfig(pinnedApps, numberKeyLaunch), {});
  return {container, grid};
}

beforeEach(() => {
  vi.mocked(launchApp).mockClear();
  document.body.innerHTML = '';
});

describe('home row numbering and badges', () => {
  it('numbers every tile in reading order and shows a badge', async () => {
    mockInstalled(['netflix', 'youtube.leanback.v4']);
    const {container, grid} = buildGrid(['netflix', 'youtube.leanback.v4']);
    await grid.refresh();

    const tiles = container.querySelectorAll('.app-tile');
    // netflix, youtube, All apps, TV Settings
    expect(tiles.length).toBe(4);
    tiles.forEach((tile, i) => {
      expect(tile.dataset.appKey).toBe(String(i + 1));
      const badge = tile.querySelector('.app-key');
      expect(badge).not.toBeNull();
      expect(badge.textContent).toBe(String(i + 1));
    });
  });

  it('numbers only the first nine tiles', async () => {
    const ids = [];
    for (let i = 0; i < 12; i += 1) ids.push('app' + i);
    mockInstalled(ids);
    const {container, grid} = buildGrid(ids);
    await grid.refresh();

    expect(container.querySelectorAll('.app-tile[data-app-key]').length).toBe(9);
    expect(container.querySelectorAll('.app-key').length).toBe(9);
  });
});

describe('launchByNumber', () => {
  it('opens the tile at that position', async () => {
    mockInstalled(['netflix', 'youtube.leanback.v4']);
    const {grid} = buildGrid(['netflix', 'youtube.leanback.v4']);
    await grid.refresh();

    expect(grid.launchByNumber(2)).toBe(true);
    expect(launchApp).toHaveBeenCalledWith('youtube.leanback.v4');
  });

  it('returns false for 0, out of range and missing tiles', async () => {
    mockInstalled(['netflix']);
    const {grid} = buildGrid(['netflix']);
    await grid.refresh();

    expect(grid.launchByNumber(0)).toBe(false);
    expect(grid.launchByNumber(9)).toBe(false);
    expect(launchApp).not.toHaveBeenCalled();
  });
});

describe('All apps overlay', () => {
  it('shows no number badges on its tiles', async () => {
    mockInstalled(['netflix', 'youtube.leanback.v4']);
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const allApps = createAllApps({
      mount: mount,
      focus: {focusWithin: function () {}},
      launch: function () {}
    });

    await allApps.show();

    expect(mount.querySelectorAll('.app-tile').length).toBeGreaterThan(0);
    expect(mount.querySelectorAll('.app-key').length).toBe(0);
    expect(mount.querySelectorAll('[data-app-key]').length).toBe(0);
  });
});

describe('numberKeyLaunch off', () => {
  it('numbers no tiles and does not launch by number', async () => {
    mockInstalled(['netflix', 'youtube.leanback.v4']);
    const {container, grid} = buildGrid(['netflix', 'youtube.leanback.v4'], false);
    await grid.refresh();

    expect(container.querySelectorAll('.app-tile[data-app-key]').length).toBe(0);
    expect(container.querySelectorAll('.app-key').length).toBe(0);
    expect(grid.launchByNumber(1)).toBe(false);
    expect(launchApp).not.toHaveBeenCalled();
  });
});

describe('immediate Home tiles', () => {
  it('paints usable cached pins before the catalog answers, then keeps the selected node', async () => {
    let answer;
    listApps.mockImplementationOnce(() => new Promise(resolve => { answer = resolve; }));
    getAppInfo.mockImplementation(async id => ({id, title: id}));
    const {container, grid} = buildGrid(['youtube.leanback.v4']);
    await grid.refresh({cached: true});
    const tile = container.querySelector('[data-app-id]');
    expect(tile.textContent).toContain('YouTube');
    tile.focus();
    const refresh = grid.refresh({reuse: true});
    expect(document.activeElement).toBe(tile);
    answer({complete: true, apps: [{id: 'youtube.leanback.v4', title: 'YouTube'}]});
    await refresh;
    expect(container.querySelector('[data-app-id]')).toBe(tile);
    expect(document.activeElement).toBe(tile);
  });

  it('removes confirmed missing cached pins and keeps shortcuts in visible order', async () => {
    const {container, grid} = buildGrid(['missing', 'youtube.leanback.v4']);
    await grid.refresh({cached: true});
    listApps.mockResolvedValueOnce({complete: true, apps: [{id: 'youtube.leanback.v4', title: 'YouTube'}]});
    await grid.refresh({reuse: true});
    expect(container.querySelector('[data-app-id="missing"]')).toBeNull();
    expect(container.querySelector('[data-app-id]').dataset.appKey).toBe('1');
    expect(container.querySelector('[data-app-id] .app-key').textContent).toBe('1');
  });
});

describe('app launch feedback', () => {
  it('shows Opening immediately and coalesces repeated clicks and number keys', async () => {
    let finish;
    launchApp.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    mockInstalled(['youtube.leanback.v4']);
    const {container, grid} = buildGrid(['youtube.leanback.v4']);
    await grid.refresh();
    const tile = container.querySelector('[data-app-id]');
    tile.click(); tile.click(); grid.launchByNumber(1);
    expect(tile.getAttribute('aria-busy')).toBe('true');
    expect(tile.querySelector('[role=status]').textContent).toBe('Opening…');
    expect(launchApp).toHaveBeenCalledTimes(1);
    finish('ok');
    await Promise.resolve(); await Promise.resolve();
    grid.clearLaunch();
    expect(tile.querySelector('[role=status]')).toBeNull();
    expect(tile.hasAttribute('aria-busy')).toBe(false);
  });

  it('leaves a failed launch retryable and reports a useful error', async () => {
    const {launchAppViaRoot} = await import('../src/js/luna.js');
    launchApp.mockRejectedValue(new Error('missing'));
    launchAppViaRoot.mockRejectedValue(new Error('missing'));
    const container = document.createElement('div'); document.body.appendChild(container);
    const toast = vi.fn(); const failed = vi.fn();
    const grid = createAppGrid(container, makeConfig(['app.test']), {onToast: toast, onLaunchFailed: failed});
    await grid.refresh({cached: true});
    await grid.launchApp({id: 'app.test', title: 'Test'});
    expect(container.querySelector('[role=status]').textContent).toBe('Retry');
    expect(failed).toHaveBeenCalledOnce();
    expect(toast).toHaveBeenCalledWith('Could not open Test. Press OK to retry.');
    launchApp.mockResolvedValue('ok');
    await grid.launchApp({id: 'app.test', title: 'Test'});
    expect(container.querySelector('[role=status]').textContent).toBe('Opening…');
    grid.clearLaunch();
    launchAppViaRoot.mockResolvedValue('ok');
  });

  it('clears accepted-launch feedback after the transition grace period', async () => {
    vi.useFakeTimers();
    launchApp.mockResolvedValue('ok');
    const {container, grid} = buildGrid(['app.test']);
    await grid.refresh({cached: true});
    await grid.launchApp({id:'app.test'});
    await vi.advanceTimersByTimeAsync(1500);
    expect(container.querySelector('[role=status]')).toBeNull();
    vi.useRealTimers();
  });
});
