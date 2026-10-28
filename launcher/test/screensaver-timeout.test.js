import {afterEach, describe, expect, it} from 'vitest';
import {setScreensaverTimeout} from '../src/js/luna.js';

// Capture the root command Homebrew Channel exec is asked to run.
function stubExec(stdout) {
  const sent = [];
  window.webOS = {service: {request: function (uri, req) {
    sent.push(req.parameters.command);
    req.onSuccess({returnValue: true, stdoutString: stdout});
  }}};
  return sent;
}

afterEach(() => { delete window.webOS; });

describe('TV screensaver wait on webOS 5', () => {
  it('sets nopd\'s wait in seconds through a RAM-only configd file, without Python', async () => {
    const sent = stubExec('ok 10\n');
    const res = await setScreensaverTimeout(10);
    expect(res.returnValue).toBe(true);
    expect(res.value).toBe(10);
    const cmd = sent[0];
    expect(cmd).not.toMatch(/python/);
    expect(cmd).toContain('/var/run/tvconfig/hwoption/zz-launcher-ss.json');
    expect(cmd).toContain('{"com.webos.service.nop":{"screenSaverTimeout":600}}');
    expect(cmd).toContain('luna://com.webos.service.config/reconfigure');
    expect(cmd).toContain('"screenSaverEnabled":"on"');
    expect(cmd).not.toContain('/var/luna/preferences');
  });

  it('snaps to 3/10/20/30 minutes and turns the screensaver off for 0', async () => {
    let sent = stubExec('ok 30\n');
    expect((await setScreensaverTimeout(45)).value).toBe(30);
    expect(sent[0]).toContain('"screenSaverTimeout":1800');
    sent = stubExec('ok off\n');
    expect((await setScreensaverTimeout(0)).value).toBe(0);
    expect(sent[0]).toContain('"screenSaverEnabled":"off"');
  });

  it('hands the wait back to the TV for null', async () => {
    const sent = stubExec('ok default\n');
    expect((await setScreensaverTimeout(null)).returnValue).toBe(true);
    expect(sent[0]).toContain('rm -f "$F"');
    expect(sent[0]).not.toContain('screenSaverTimeout');
  });

  it('reports a failure when the root script does not finish', async () => {
    stubExec('');
    expect((await setScreensaverTimeout(20)).returnValue).toBe(false);
  });
});
