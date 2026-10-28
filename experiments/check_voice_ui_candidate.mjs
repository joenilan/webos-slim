import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dir=new URL('file://'+process.cwd()+'/'+(process.argv[2] || 'research-output/voice-ui-candidate').replace(/\/$/, '')+'/');
const input=JSON.parse(fs.readFileSync(new URL('behavior-inputs.json',dir),'utf8'));
const results=[];
function test(name,fn){fn();results.push({name,passed:true});}
test('Quick Settings opens with no voice interface',()=>{
 const seen=[];const ctx={debug:{printLog(){}},interfaces:{menu:{fetchMenuData(){seen.push('fetch');}}},startMainView(){seen.push('open');}};
 vm.createContext(ctx);vm.runInContext(input.quickInitialize+'; initialize();',ctx);
 assert.deepEqual(seen,['fetch','open']);
});
for(const focus of [true,false]){
 test('Quick Settings enters edit mode and keeps guidance, focus='+focus,()=>{
  const spoken=[];const ctx={mainList:{currentIndex:-1,editEnabled:false},editModeCount:0,initListItemState(){},editButton:{focus},stringSheet:{closeEditMode:'Close edit',add:'Add',button:'Button'},startTTS(t){spoken.push(t);}};
  vm.createContext(ctx);vm.runInContext(input.quickChangeMode+'; changeMode();',ctx);
  assert.equal(ctx.mainList.editEnabled,true);assert.equal(ctx.editModeCount,1);assert.equal(ctx.mainList.readEditGuide,true);
  assert.deepEqual(spoken,[(focus?'Close edit':'Add')+'\nButton']);
 });
}
test('Quick Settings keeps selected-item Audio Guidance on entering edit',()=>{
 const spoken=[];const ctx={mainList:{currentIndex:2,editEnabled:false,currentItem:{listItem:{titleText:'Picture'}}},editModeCount:0,initListItemState(){},getAudioGuideText(t,s){return t+'|'+s;},startTTS(t){spoken.push(t);}};
 vm.createContext(ctx);vm.runInContext(input.quickChangeMode+'; changeMode();',ctx);
 assert.equal(ctx.mainList.currentIndex,2);assert.deepEqual(spoken,['Picture|']);
});
test('Quick Settings exits edit mode, closes candidates and keeps guidance',()=>{
 const spoken=[];const ctx={mainList:{currentIndex:2,editEnabled:true,isEditModeForShadow:true,currentItem:{listItem:{titleText:'Picture',subTitleText:'Standard'}}},showCandidateList:true,editButton:{focus:false},getAudioGuideText(t,s){return t+'|'+s;},startTTS(t){spoken.push(t);}};
 vm.createContext(ctx);vm.runInContext(input.quickChangeMode+'; changeMode();',ctx);
 assert.equal(ctx.mainList.editEnabled,false);assert.equal(ctx.showCandidateList,false);assert.equal(ctx.mainList.isEditModeForShadow,false);assert.deepEqual(spoken,['Picture|Standard']);
});
for(const ready of [true,false]){
 test('InputPicker readiness preserves all nonvoice service calls, ready='+ready,()=>{
  const seen=[];const ctx={isSystemServiceReady:ready};
  for(const [service,method] of [['eimService','getInputDeviceValues'],['foregroundAppService','getForegroundAppInfo'],['asmService','getInputDeviceValues'],['iepgService','getChannelListValues'],['utpService','getCurrentChannelMode'],['mrcuService','getMRCUConnectionStatus']])ctx[service]={[method](){seen.push(service);}};
  vm.createContext(ctx);vm.runInContext(input.inputSystemReady.slice(input.inputSystemReady.indexOf('{')),ctx);
  assert.deepEqual(seen,ready?['eimService','foregroundAppService','asmService','iepgService','utpService','mrcuService']:[]);
 });
}
test('Dynamic interface list keeps TTS and other feature modules',()=>{
 const list=JSON.parse(input.interfaceList);
 assert.deepEqual(list.map(x=>x.name),['submenumodel','popupmenumodel','tts','menu','network','picture','soundmode','soundout','timer']);
 assert.equal(list.find(x=>x.name==='tts').prefix,'AudioGuidanceInterfaces');
});
fs.writeFileSync(new URL('behavior-checks.json',dir),JSON.stringify({scope:'Isolated shipped QML JavaScript bodies with test-owned mocks; no Qt runtime or physical navigation claim',results},null,2)+'\n');
console.log(results.length+' behavior checks passed.');
