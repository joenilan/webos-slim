#!/usr/bin/env python3
"""Inspect, or explicitly trial, one exact-device RAM service unregistration."""
import argparse
import json
from pathlib import Path
import re
import shlex
import subprocess
import time

HUB_SHA256 = '775c47e424e340956d4311ad4eb76c685b8981f04fe78f6a114b972729f43d94'
MANIFEST = '/usr/share/luna-service2/manifests.d/voice-framework.manifest.json'
MANIFEST_SHA256 = '1c552499fe08191c08be77f4f7e2ad696f7a10bf90275d54836007f890de3b4d'
PAYLOAD = {'prefix': '', 'path': MANIFEST}
VOICE_URI = 'luna://com.webos.service.voiceconductor/getSupportedLanguages'
BUS_URI = 'luna://com.webos.service.bus/'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


class TV:
    def __init__(self, host, output):
        require(bool(re.fullmatch(r'[A-Za-z0-9_][A-Za-z0-9_.@:-]*', host)), 'Use an SSH alias or user@host')
        self.host, self.output, self.rows = host, Path(output), []
        self.output.mkdir(parents=True, exist_ok=False)

    def run(self, label, command, timeout=12):
        start = time.monotonic()
        result = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes',
                                 '-o', 'ConnectTimeout=6', self.host, command],
                                capture_output=True, text=True, timeout=timeout)
        row = {'label': label, 'elapsedSeconds': round(time.monotonic()-start, 3),
               'exitCode': result.returncode, 'stdout': result.stdout, 'stderr': result.stderr}
        self.rows.append(row)
        self.save()
        require(result.returncode == 0, label + ': SSH/shell command failed')
        return row

    def save(self):
        (self.output/'commands.json').write_text(json.dumps(self.rows, indent=2)+'\n')

    def luna(self, label, uri, payload, deadline=4000):
        command = 'luna-send -n 1 -w ' + str(deadline) + ' ' + shlex.quote(uri) + ' ' + shlex.quote(json.dumps(payload)) + ' </dev/null'
        row = self.run(label, command, deadline/1000+8)
        try:
            row['response'] = json.loads(row['stdout'])
        except ValueError:
            row['response'] = None
        self.save()
        return row


def inspect(tv):
    row = tv.run('exact-device-file-gate', 'sha256sum /usr/sbin/ls-hubd ' + MANIFEST)
    hashes = {line.split()[1]: line.split()[0] for line in row['stdout'].splitlines()}
    require(hashes.get('/usr/sbin/ls-hubd') == HUB_SHA256 and hashes.get(MANIFEST) == MANIFEST_SHA256,
            'Untested hub/manifest bytes; refusing this experiment')
    tv.run('core-processes-before', 'pidof ls-hubd surface-manager sam')
    tv.run('voice-must-already-be-stopped', 'if pidof voiceconductor >/dev/null; then exit 1; fi')
    tv.luna('foreground-before', 'luna://com.webos.applicationManager/getForegroundAppInfo', {})
    return tv.luna('permissions-before', BUS_URI+'queryServicePermissions', {'service': 'com.webos.service.voiceconductor'})


def trial(tv, before):
    require(before['response'] and before['response'].get('returnValue') is True, 'No permission baseline')
    baseline = tv.luna('registered-stopped-baseline', VOICE_URI, {}, 23000)
    require(baseline['response'] is None, 'Baseline differs from the tested registered/stopped state')
    # Native AddManifest rejects duplicates without unloading the existing manifest.
    pre = tv.luna('restore-permission-preflight', BUS_URI+'addOneManifest', PAYLOAD)
    require(pre['response'] and pre['response'].get('returnValue') is False and
            'Cannot add manifest' in pre['response'].get('errorText', ''), 'Restore preflight failed')
    restore = 'luna-send -n 1 -w 6000 ' + BUS_URI+'addOneManifest ' + shlex.quote(json.dumps(PAYLOAD)) + ' </dev/null'
    script = '''#!/bin/sh
D=$1
n=0
while [ "$n" -lt 90 ]; do
    [ -e "$D/armed" ] || exit 0
    sleep 1
    n=$((n+1))
done
[ -e "$D/armed" ] || exit 0
'''+restore+'\n'
    arm = ('set -eu\nD=$(mktemp -d /tmp/slim-registry-test.XXXXXX)\nprintf %s '+shlex.quote(script)+
           ' > "$D/guard.sh"\ntouch "$D/armed"\nnohup sh "$D/guard.sh" "$D" </dev/null >"$D/guard.log" 2>&1 &\nprintf "%s\\n" "$D"\n')
    guard = tv.run('arm-independent-restore', arm)['stdout'].strip()
    require(bool(re.fullmatch(r'/tmp/slim-registry-test\.[A-Za-z0-9]+', guard)), 'Invalid guard address')
    try:
        row = tv.luna('unregister', BUS_URI+'removeOneManifest', PAYLOAD)
        require(row['response'] and row['response'].get('returnValue') is True, 'Removal not confirmed')
        removed = tv.luna('unregistered-probe', VOICE_URI, {})
        require(removed['response'] and 'Service does not exist' in removed['response'].get('errorText', ''),
                'Expected an explicit absent-service response')
        require(removed['elapsedSeconds'] < 4, 'Absence response was unexpectedly slow')
        for label, uri, payload in [
            ('settings', 'luna://com.webos.service.settings/getSystemSettings', {'category': 'option', 'keys': ['audioGuidance']}),
            ('inputs', 'luna://com.webos.service.eim/getLastInput', {}),
            ('foreground-during', 'luna://com.webos.applicationManager/getForegroundAppInfo', {})]:
            row = tv.luna(label, uri, payload)
            require(row['response'] and row['response'].get('returnValue') is True, label+' check failed')
        during = tv.run('core-processes-during', 'pidof ls-hubd surface-manager sam')
    finally:
        row = tv.luna('restore-original', BUS_URI+'addOneManifest', PAYLOAD, 6000)
        require(row['response'] and row['response'].get('returnValue') is True,
                'Restoration unconfirmed; the timed guard remains armed at '+guard)
        tv.run('disarm-restore', 'rm -f '+shlex.quote(guard+'/armed'))
    after = tv.luna('permissions-after', BUS_URI+'queryServicePermissions', {'service': 'com.webos.service.voiceconductor'})
    require(after['response'] == before['response'], 'Permissions differ after restoration')
    final = tv.run('core-processes-after', 'pidof ls-hubd surface-manager sam')
    original = next(row for row in tv.rows if row['label']=='core-processes-before')
    require(original['stdout'] == during['stdout'] == final['stdout'], 'A core process changed')
    restored_probe = tv.luna('registered-stopped-restored', VOICE_URI, {}, 4000)
    require(restored_probe['response'] is None, 'Restored service does not match registered/stopped baseline')
    tv.luna('foreground-after', 'luna://com.webos.applicationManager/getForegroundAppInfo', {})
    summary = {'passed': True, 'registeredStoppedSeconds': baseline['elapsedSeconds'],
               'unregisteredSeconds': removed['elapsedSeconds'], 'permissionsRestoredExactly': True,
               'coreProcessesUnchanged': True, 'persistentPolicyInstalled': False,
               'timedGuardAutomaticallyExercised': False}
    (tv.output/'result.json').write_text(json.dumps(summary, indent=2)+'\n')
    return summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('host', help='An existing root SSH alias or root@host; host key must already be trusted')
    parser.add_argument('--run-test', action='store_true', help='Temporarily unregister voice, probe, and restore; never installs a boot hook')
    parser.add_argument('--output', default='research-output/voice-registry-'+time.strftime('%Y%m%d-%H%M%S'))
    args = parser.parse_args(argv)
    tv = TV(args.host, args.output)
    before = inspect(tv)
    if args.run_test:
        print(json.dumps(trial(tv, before), indent=2))
    else:
        print('Inspection only. No registry changes made. Use --run-test for the bounded trial.')


if __name__ == '__main__':
    main()
