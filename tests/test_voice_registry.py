import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('voice_registry', Path(__file__).parents[1]/'experiments/voice_registry.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class FakeTV:
    def __init__(self, output, fail=None):
        self.output, self.fail = Path(output), fail
        self.rows = [{'label':'core-processes-before','stdout':'1 2 3\n'}]
        self.calls = []
    def run(self, label, command, timeout=12):
        self.calls.append(label)
        value = '/tmp/slim-registry-test.abcdef\n' if label == 'arm-independent-restore' else '1 2 3\n'
        row = {'label':label,'stdout':value}
        self.rows.append(row)
        return row
    def luna(self, label, uri, payload, deadline=4000):
        self.calls.append(label)
        if label == self.fail:
            raise RuntimeError('simulated transport failure')
        response = {'returnValue':True}
        if label in ['registered-stopped-baseline','registered-stopped-restored']:
            response = None
        elif label == 'restore-permission-preflight':
            response = {'returnValue':False,'errorText':'Cannot add manifest: reason unknown'}
        elif label == 'unregistered-probe':
            response = {'returnValue':False,'errorText':'Service does not exist: com.webos.service.voiceconductor.'}
        row = {'label':label,'response':response,'elapsedSeconds':0.2}
        self.rows.append(row)
        return row

class RegistryTests(unittest.TestCase):
    def test_default_is_inspection_only(self):
        with patch.object(m,'TV') as tv, patch.object(m,'inspect'), patch.object(m,'trial') as trial:
            m.main(['example-tv'])
            trial.assert_not_called()
            tv.assert_called_once()
    def test_hash_mismatch_refuses_before_any_registry_call(self):
        with tempfile.TemporaryDirectory() as out:
            tv=FakeTV(out)
            tv.run=lambda *args,**kwargs: {'stdout':'wrong /usr/sbin/ls-hubd\n'}
            with self.assertRaisesRegex(RuntimeError,'Untested hub'):
                m.inspect(tv)
            self.assertEqual(tv.calls,[])
    def test_health_failure_restores_original_registration(self):
        with tempfile.TemporaryDirectory() as out:
            tv=FakeTV(out,'settings')
            with self.assertRaisesRegex(RuntimeError,'simulated'):
                m.trial(tv,{'response':{'returnValue':True}})
            self.assertIn('restore-original',tv.calls)
            self.assertIn('disarm-restore',tv.calls)
    def test_lost_removal_reply_still_attempts_restore(self):
        with tempfile.TemporaryDirectory() as out:
            tv=FakeTV(out,'unregister')
            with self.assertRaisesRegex(RuntimeError,'simulated'):
                m.trial(tv,{'response':{'returnValue':True}})
            self.assertIn('restore-original',tv.calls)
    def test_failed_restore_leaves_independent_guard_armed(self):
        with tempfile.TemporaryDirectory() as out:
            tv=FakeTV(out,'restore-original')
            with self.assertRaisesRegex(RuntimeError,'simulated'):
                m.trial(tv,{'response':{'returnValue':True}})
            self.assertIn('arm-independent-restore',tv.calls)
            self.assertNotIn('disarm-restore',tv.calls)
    def test_success_records_restoration_and_process_checks(self):
        with tempfile.TemporaryDirectory() as out:
            tv=FakeTV(out)
            result=m.trial(tv,{'response':{'returnValue':True}})
            self.assertTrue(result['permissionsRestoredExactly'])
            self.assertTrue(result['coreProcessesUnchanged'])
            self.assertFalse(result['persistentPolicyInstalled'])
            self.assertTrue((Path(out)/'result.json').exists())

if __name__=='__main__':
    unittest.main()
