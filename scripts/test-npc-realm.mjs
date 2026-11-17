import assert from 'node:assert/strict';
import { normalizeNpcRealm, repairNpcRealm } from '../src/utils/npcRealm.ts';
import { repairSaveData } from '../src/utils/dataRepair.ts';
import { validateAndRepairNpcProfile } from '../src/utils/dataValidation.ts';
import { validateAndRepairCommandValue } from '../src/utils/commandValueValidator.ts';
import { generateMembers, evolveMember } from '../src/services/sectContentService.ts';
import { AIBidirectionalSystem } from '../src/utils/AIBidirectionalSystem.ts';
import { runtime } from './test-runtime-mocks.mjs';

globalThis.localStorage = { getItem: () => null };
const examples = ['练气后期','練氣・後期','煉氣/四層','练气 六层','練氣·八層','筑基-中期','元嬰圓滿','凡人'];
const expected = [['练气','后期'],['练气','后期'],['练气','四层'],['练气','六层'],['练气','八层'],['筑基','中期'],['元婴','圆满'],['凡人','']];
examples.forEach((v,i) => {
  const realm = normalizeNpcRealm(v);
  assert.deepEqual([realm.名称,realm.阶段],expected[i]);
  assert.deepEqual(normalizeNpcRealm(realm),realm);
});
const object = { 名称:'練氣', 阶段:'第六層', 当前进度:42, 下一级所需:200, 突破描述:'保持原描述', 自定义:'保留' };
assert.deepEqual(normalizeNpcRealm(object),object);
assert.equal(normalizeNpcRealm({...object,当前进度:'42'}).当前进度,42);
for (const invalid of ['未知文字',null,undefined,42,[],{}, {名称:'练气',阶段:42}]) {
  assert.equal(normalizeNpcRealm(invalid),null);
  const repaired = repairNpcRealm(invalid);
  assert.notEqual(repaired.名称,'凡人');
  assert.deepEqual(repairNpcRealm(repaired),repaired);
}
const ctx = Object.fromEntries(Object.entries({sectName:'测试宗',worldContext:{},profile:{},leadership:{},playerRealm:'练气'}).map(([k,v]) => [k,{value:v}]));
const npc = (名字,境界) => ({名字,境界,职位:'外门弟子',好感度:61,记忆:['测试记忆'],性别:'男',出生日期:{年:972,月:1,日:1}});
runtime.save = repairSaveData(null);
runtime.save.社交.关系 = {旧同门:npc('旧同门',object)};
const old = structuredClone(runtime.save.社交.关系.旧同门);
runtime.response = {members:[npc('旧同门','凡人'),...examples.map((v,i)=>npc(`测试${i}`,v))]};
assert.deepEqual(await generateMembers(ctx),{added:8,skipped:1});
assert.deepEqual(runtime.save.社交.关系.旧同门,old);
assert.equal(Object.keys(runtime.save.社交.关系).length,9);
for (let i=0;i<8;i++) assert.equal(typeof runtime.save.社交.关系[`测试${i}`].境界,'object');
const member = {key:'测试0',name:'测试0',gender:'男',position:'外门弟子',realm:'练气后期'};
for (const value of ['練氣八層',{名称:'筑基',阶段:'初期'}]) {
  runtime.response={境界:value}; await evolveMember(ctx,member);
  assert.deepEqual(runtime.save.社交.关系.测试0.境界,normalizeNpcRealm(value));
}
const before = structuredClone(runtime.save.社交.关系.测试0);
for (const value of ['乱码',null,{},42]) {
  runtime.response={职位:'内门弟子',境界:value}; await evolveMember(ctx,member);
  assert.deepEqual(runtime.save.社交.关系.测试0.境界,before.境界);
}
assert.equal(runtime.warnings.length,4);
runtime.response={members:[npc('不能写入','乱码')]};
const beforeInvalid=structuredClone(runtime.save);
await assert.rejects(()=>generateMembers(ctx),/境界无法识别/);
assert.deepEqual(runtime.save,beforeInvalid);

// Simulate imported legacy data, an unrelated real GM turn, JSON reload, repeated repair.
const legacy=structuredClone(runtime.save);
examples.forEach((v,i)=>legacy.社交.关系[`测试${i}`].境界=v);
legacy.社交.关系.未知=npc('未知','自定义未识别旧值');
const original=structuredClone(legacy);
const once=repairSaveData(legacy);
assert.deepEqual(legacy,original,'repair must not mutate input');
const twice=repairSaveData(once);
assert.deepEqual(twice.社交.关系,once.社交.关系);
assert.deepEqual(twice.角色,once.角色);
const result=await AIBidirectionalSystem.processGmResponse({text:'你在山间散步。',mid_term_memory:'散步',tavern_commands:[],action_options:[]},legacy,false);
const reloaded=repairSaveData(JSON.parse(JSON.stringify(result.saveData)));
assert.deepEqual(reloaded.社交.关系,once.社交.关系);
assert.deepEqual(reloaded.角色,once.角色);
const patchedTurn=await AIBidirectionalSystem.processGmResponse({text:'继续散步。',mid_term_memory:'散步',tavern_commands:[{action:'set',key:'社交.关系.测试2',value:{好感度:62}}],action_options:[]},legacy,false);
assert.equal(patchedTurn.saveData.社交.关系.测试2.境界.阶段,'四层');
assert.equal(patchedTurn.saveData.社交.关系.测试2.好感度,62);
for (let i=0;i<8;i++) {
  const n=reloaded.社交.关系[`测试${i}`];
  assert.deepEqual([n.境界.名称,n.境界.阶段],expected[i]);
  assert.equal(n.职位,original.社交.关系[`测试${i}`].职位); assert.equal(n.好感度,61); assert.deepEqual(n.记忆,['测试记忆']);
  const [ok,fixed]=validateAndRepairNpcProfile(npc('路径测试',examples[i]));
  assert.ok(ok); assert.deepEqual(fixed.境界,normalizeNpcRealm(examples[i]));
}
// Existing command safety still rejects raw realm strings for player and NPC.
for (const key of ['角色.属性.境界','社交.关系.测试0.境界']) {
  assert.equal(validateAndRepairCommandValue({action:'set',key,value:'练气后期'}).valid,false);
}
console.log('PASS NPC normalization, generation/evolution, legacy import, real unrelated GM turn/reload, idempotence and command protection');
