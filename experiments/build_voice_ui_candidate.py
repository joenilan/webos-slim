#!/usr/bin/env python3
"""Build the undeployed voice UI removal candidate from private exact-device QML.

No LG source is distributed here. Does not connect to or write to a TV.
"""
from pathlib import Path
import argparse, hashlib, json, difflib, re, subprocess
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-root',required=True,type=Path)
parser.add_argument('--output',default='research-output/voice-ui-candidate',type=Path)
args=parser.parse_args()
O=args.output.resolve()
if O.exists():raise SystemExit('Output already exists; choose a new directory')
PREFIX='usr/lib/qml/'
MOD=['InputPicker/Service/AppServices.qml','InputPicker/View/InputPickerMainView.qml','QuickSettings/AppInitializer/SystemProperties.qml','QuickSettings/Containers/QuickSettingsMainView.qml','QuickSettings/Containers/QuickSettingsCandidateListView.qml']
DELETE=['InputPicker/Service/VoiceControlService.qml','QuickSettings/Controllers/VoiceControlInterfaces/Interfaces.qml','QuickSettings/Controllers/VoiceControlInterfaces/AppServices.qml']
EXPECTED={'usr/lib/qml/InputPicker/Service/AppServices.qml': 'f7217a6a225bef6ebe69fc302344a29b2418fb60e3f994531439bb1792661059', 'usr/lib/qml/InputPicker/View/InputPickerMainView.qml': '17814c2ec3fce0b34bdc2b7cf5dba374dd3514fdf0d88b5de3723c3fbf27cc3a', 'usr/lib/qml/QuickSettings/AppInitializer/SystemProperties.qml': '0a0287a897e203d4f7ebdcdfb0d1b4525947e7cb64afad4d83bc24c6a822593f', 'usr/lib/qml/QuickSettings/Containers/QuickSettingsMainView.qml': '51fea797c48701eebcdad4c5c3842c5b14a6804f695d35f9c7c95b9ad58dee93', 'usr/lib/qml/QuickSettings/Containers/QuickSettingsCandidateListView.qml': '90e5f6ed1c4da1d8db3c61dc3aeab534d7927f8226d2d1358de981517773d926', 'usr/lib/qml/InputPicker/Service/VoiceControlService.qml': 'ceaeb7a093417d66df6aff57d2c5317ae6799408333172f04714fb5c13e0302b', 'usr/lib/qml/QuickSettings/Controllers/VoiceControlInterfaces/Interfaces.qml': 'c3c15015e56fd132d8976c7e8b007bf2075b2b97765df5dd197fa6f63a7f6e4f', 'usr/lib/qml/QuickSettings/Controllers/VoiceControlInterfaces/AppServices.qml': '9f1b21bbfd61254d3d5356f141c0bd82099a19c270e255705282dd63c5a2d0d1'}
paths=[PREFIX+s for s in MOD+DELETE]
for rel in paths:
    data=(args.source_root/rel).read_bytes()
    if hashlib.sha256(data).hexdigest()!=EXPECTED[rel]:
        raise SystemExit('Untested source bytes: '+rel)
O.mkdir(parents=True)
for rel in paths:
    dest=O/'source'/rel;dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes((args.source_root/rel).read_bytes())

def end_block(t,start):
 i=t.index('{',start);depth=0;quote=None;comment=None;escape=False
 while i<len(t):
  c=t[i];n=t[i:i+2]
  if comment=='line':
   if c=='\n':comment=None
  elif comment=='block':
   if n=='*/':comment=None;i+=1
  elif quote:
   if escape:escape=False
   elif c=='\\':escape=True
   elif c==quote:quote=None
  elif n=='//':comment='line';i+=1
  elif n=='/*':comment='block';i+=1
  elif c in ['"',"'"]:quote=c
  elif c=='{':depth+=1
  elif c=='}':
   depth-=1
   if depth==0:return i+1
  i+=1
 raise ValueError('Unbalanced block')
def cut(t,needle):
 assert t.count(needle)==1,(needle,t.count(needle))
 start=t.index(needle);start=t.rfind('\n',0,start)+1
 end=end_block(t,start)
 if t[end:end+1]=='\n':end+=1
 return t[:start]+t[end:]
manifest=[];patch=[];originals={};candidates={}
for rel in paths:
 data=(O/'source'/rel).read_bytes();original=data.decode();text=original.replace('\r\n','\n');base=text
 if rel.endswith('/InputPicker/Service/AppServices.qml'):
  for line in ['    property alias voiceControlService: voiceControlService\n','            voiceControlService.registerVoiceControl();\n']:
   assert text.count(line)==1;text=text.replace(line,'')
  text=cut(text,'    VoiceControlService {')
 elif rel.endswith('/InputPicker/View/InputPickerMainView.qml'):
  for fn in ['getVoiceControllIntents','playVoiceAction']:text=cut(text,'    function '+fn+'(')
 elif rel.endswith('/QuickSettings/AppInitializer/SystemProperties.qml'):
  needle='"name": "voice"'
  assert text.count(needle)==1
  at=text.index(needle);start=text.rfind('        {',0,at);end=end_block(text,start)
  assert start>=0 and text[end:end+2]==',\n'
  text=text[:start]+text[end+2:]
 elif rel.endswith('/QuickSettings/Containers/QuickSettingsMainView.qml'):
  assert text.count('interfaces.voice.register();')==2
  text=re.sub(r'^\s*interfaces\.voice\.register\(\);\n','',text,flags=re.M)
  target=text.index('        target: interfaces.voice');start=text.rfind('    Connections {',0,target)
  assert start!=-1;text=text[:start]+text[end_block(text,start):]
  for fn in ['setEditModeContext','setNormalModeContext','normalModePerformVoiceControl','editModePerformVoiceControl']:text=cut(text,'    function '+fn+'(')
  target=text.index('        id: editMenuChangeTimer');start=text.rfind('    Timer {',0,target)
  assert start!=-1;text=text[:start]+text[end_block(text,start):]
 elif rel.endswith('/QuickSettings/Containers/QuickSettingsCandidateListView.qml'):
  for fn in ['setCandidateListContext','candidateListPerformVoiceControl']:text=cut(text,'    function '+fn+'(')
 else:text=''
 operation='delete' if rel in [PREFIX+s for s in DELETE] else 'replace'
 if operation=='replace':
  dst=O/'files'/rel;dst.parent.mkdir(parents=True,exist_ok=True)
  # Preserve source newline convention for future hash-based overlays.
  result=text.replace('\n','\r\n') if '\r\n' in original else text
  dst.write_bytes(result.encode());newhash=hashlib.sha256(dst.read_bytes()).hexdigest()
  originals[rel]=base;candidates[rel]=text
 else:newhash=None
 row={'path':'/'+rel,'operation':operation,'liveSourceSha256':hashlib.sha256(data).hexdigest(),'candidateSha256':newhash,'matchesTestedBaseline':hashlib.sha256(data).hexdigest()==EXPECTED[rel]}
 manifest.append(row)
 patch.extend(difflib.unified_diff(original.splitlines(True),(result if operation=='replace' else '').splitlines(True),fromfile='a/'+rel,tofile=('/dev/null' if operation=='delete' else 'b/'+rel)))
(O/'removal.patch').write_text(''.join(patch))
(O/'manifest.json').write_text(json.dumps({'scope':'InputPicker/QuickSettings voice client removal ONLY; not the complete native voice stack','source':'User-supplied private QML matching the exact tested baseline','deployed':False,'files':manifest,'remaining':['LG Qt5 runtime and physical navigation testing','Other native clients including lginput2, btaudiosrc and libcbe','Voice units/targets/activities and full feature keep/remove manifest','Proven early boot control before target services start']},indent=2)+'\n')
# Ensure remaining executable QML has no references to the removed interface.
for rel,text in candidates.items():
 for token in ['interfaces.voice','voiceControlService','VoiceControlInterfaces','getVoiceControllIntents','playVoiceAction','editMenuChangeTimer']:
  assert token not in text,(rel,token)
checks=[]
for rel in originals:
 file=O/'files'/rel;r=subprocess.run(['qmlformat-qt6',str(file)],capture_output=True,text=True)
 checks.append({'path':str(file),'exitCode':r.returncode,'diagnostics':r.stderr});assert r.returncode==0,(rel,r.stderr)
(O/'syntax-checks.json').write_text(json.dumps({'tool':'Qt6 qmlformat parser only; not LG Qt5 module/runtime validation','results':checks},indent=2)+'\n')
# Export actual functions/blocks for isolated behavioral checks in Node.
selected={}
def block(t,needle):
 start=t.index(needle);return t[start:end_block(t,start)]
for key,rel,needle in [
 ('quickInitialize',PREFIX+MOD[3],'function initialize()'),
 ('quickChangeMode',PREFIX+MOD[3],'function changeMode()'),
 ('inputSystemReady',PREFIX+MOD[0],'onIsSystemServiceReadyChanged:'),
 ('interfaceList',PREFIX+MOD[2],'property var interfaceList:')]:
 text=candidates[rel]
 if key=='interfaceList':
  start=text.index('[',text.index(needle));end=text.index('\n    ]',start)+6;selected[key]=text[start:end]
 else:selected[key]=block(text,needle)
(O/'behavior-inputs.json').write_text(json.dumps(selected,indent=2)+'\n')
print('Built 5 changed QML files and 3 deletion entries; all 5 syntax parses passed. No deployment.')
