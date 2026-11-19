import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile } from '@vue/compiler-dom';
import * as Vue from 'vue';
import { renderToString } from '@vue/server-renderer';
import { getPlayerAgeForDisplay, updateNpcLifespanFromGameTime } from '../src/utils/lifespanCalculator.ts';

const makeSave = time => ({
  角色: { 身份: { 出生日期: { 年: 988, 月: 6, 日: 15 } }, 属性: { 寿命: { 当前: 12, 上限: 80 } } },
  元数据: { 时间: time },
});
const cases = [
  [{年:1000,月:6,日:15},12],
  [{年:1001,月:6,日:14},12],
  [{年:1001,月:6,日:15},13],
  [{年:1001,月:6,日:16},13],
  [{年:1005,月:6,日:15},17],
];
for (const [time, age] of cases) {
  const save = makeSave(time), before = structuredClone(save);
  assert.equal(getPlayerAgeForDisplay(save), age);
  assert.equal(getPlayerAgeForDisplay(JSON.parse(JSON.stringify(save))), age);
  assert.deepEqual(save, before, 'display must not modify the saved age, birthday or lifespan');
}
for (const invalid of [undefined,null,{}, {年:1001}, {年:1001,月:0,日:15}, {年:NaN,月:6,日:15}]) {
  const missingBirth = makeSave({年:1005,月:6,日:15}); missingBirth.角色.身份.出生日期 = invalid;
  assert.equal(getPlayerAgeForDisplay(missingBirth),12);
  const missingTime = makeSave(invalid);
  assert.equal(getPlayerAgeForDisplay(missingTime),12);
}
assert.equal(getPlayerAgeForDisplay(null),18);
assert.equal(getPlayerAgeForDisplay({}),18);
const newborn = makeSave(null); newborn.角色.属性.寿命.当前=0;
assert.equal(getPlayerAgeForDisplay(newborn),0);
for (const value of [NaN,Infinity,-1,'12',null]) {
  assert.equal(getPlayerAgeForDisplay({角色:{属性:{寿命:{当前:value}}}}),18);
}
// Render both actual age-badge bindings from CharacterManagement, with different slot dates.
const source = readFileSync('src/components/character-creation/CharacterManagement.vue','utf8');
const badges = [...source.matchAll(/<span class="age-badge">([\s\S]*?)<\/span>/g)].map(m=>m[0]);
assert.equal(badges.length,2);
for (const badge of badges) assert.ok(badge.includes('getPlayerAgeForDisplay('));
const {code} = compile(`<div>${badges.join('')}</div>`,{mode:'function',prefixIdentifiers:true});
const render = new Function('Vue',code)(Vue);
const oldSlot = makeSave({年:1000,月:6,日:15});
const recentSlot = makeSave({年:1005,月:6,日:15});
const html = await renderToString(Vue.createSSRApp({
  setup:()=>({getPlayerAgeForDisplay,normalizeSaveDataV3:v=>v,slot:{存档数据:oldSlot},selectedCharacter:{存档列表:{云端修行:{存档数据:recentSlot}}}}),
  render,
}));
assert.match(html,/>12岁<\/span>/);
assert.match(html,/>17岁<\/span>/);
assert.equal(recentSlot.角色.属性.寿命.当前,12);
// NPC display/sync remains based on the same birthday calculation.
const npc = {出生日期:{年:988,月:6,日:15},年龄:12};
assert.equal(updateNpcLifespanFromGameTime(npc,{年:1001,月:6,日:14}),12);
assert.equal(updateNpcLifespanFromGameTime(npc,{年:1001,月:6,日:15}),13);
console.log('PASS: birthday boundary, independent slot dates, legacy fallback, nonmutation, both actual save-list bindings, NPC aging');
