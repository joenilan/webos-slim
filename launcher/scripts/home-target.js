#!/usr/bin/node
/* Native webOS Home routing. Keeps LG's existing mapping for rollback. */
'use strict';
var fs = require('fs');
var cp = require('child_process');
var APP = 'org.webosbrew.lounge.launcher';
var DIR = '/var/lib/webosbrew/launch-home';
var BACKUP = DIR + '/native-home-before.json';
function luna(method, payload) {
  var text = cp.execFileSync('/usr/bin/luna-send', ['-n', '1', '-w', '4000',
    'luna://com.webos.settingsservice/' + method, JSON.stringify(payload)],
    {encoding: 'utf8', timeout: 6000});
  var result = JSON.parse(text.trim());
  if (!result.returnValue) throw new Error(result.errorText || method + ' failed');
  return result;
}
try {
  var result = luna('getSystemSettings', {category: 'general', keys: ['defaultApps']});
  var current = result.settings && result.settings.defaultApps;
  if (!current || typeof current !== 'object' || Array.isArray(current)) throw new Error('No native Home mapping');
  var action = process.argv[2];
  if (action === 'enable') {
    if (current.home !== APP) {
      try { fs.mkdirSync(DIR, {mode: 448}); } catch (e) { if (e.code !== 'EEXIST') throw e; }
      if (!fs.existsSync(BACKUP)) {
        var original = {hadHome: Object.prototype.hasOwnProperty.call(current, 'home'), home: current.home};
        fs.writeFileSync(BACKUP + '.tmp', JSON.stringify(original), {mode: 384});
        fs.renameSync(BACKUP + '.tmp', BACKUP);
      }
      current.home = APP;
      luna('setSystemSettings', {category: 'general', settings: {defaultApps: current}});
    }
  } else if (action === 'disable') {
    if (current.home === APP) {
      var old = fs.existsSync(BACKUP) ? JSON.parse(fs.readFileSync(BACKUP, 'utf8')) : {hadHome: true, home: 'com.webos.app.fullhome'};
      if (old.hadHome) current.home = old.home;
      else delete current.home;
      luna('setSystemSettings', {category: 'general', settings: {defaultApps: current}});
    }
  } else if (action !== 'status') throw new Error('Use enable, disable or status');
  var verified = luna('getSystemSettings', {category: 'general', keys: ['defaultApps']}).settings.defaultApps;
  if (action === 'enable' && verified.home !== APP) throw new Error('Native Home target did not save');
  if (action === 'disable' && verified.home === APP) throw new Error('Native Home target did not restore');
  console.log(action === 'enable' ? 'enabled native Home routing' : JSON.stringify(verified));
} catch (error) {
  console.error('Native Home routing: ' + error.message);
  process.exit(1);
}
