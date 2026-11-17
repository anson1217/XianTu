// Run with REGRESSION_BASELINE=1 to load the pinned upstream baseline.
import assert from 'node:assert/strict';
import { repairSaveData } from '../src/utils/dataRepair.ts';
import { generateMembers } from '../src/services/sectContentService.ts';
import { AIBidirectionalSystem } from '../src/utils/AIBidirectionalSystem.ts';
import { runtime } from './test-runtime-mocks.mjs';
globalThis.localStorage={getItem:()=>null};
runtime.save=repairSaveData(null);
runtime.response={members:Array.from({length:8},(_,i)=>({名字:`测试同门${i}`,境界:['练气后期','练气四层','练气六层','练气八层'][i%4]}))};
const ctx={sectName:{value:'测试宗'},worldContext:{value:{}},profile:{value:{}}};
await generateMembers(ctx);
const before=Object.values(runtime.save.社交.关系).map(n=>n.境界);
const {saveData}=await AIBidirectionalSystem.processGmResponse({text:'独自在山间散步。',mid_term_memory:'散步',tavern_commands:[],action_options:[]},runtime.save,false);
const after=Object.values(saveData.社交.关系).map(n=>n.境界);
if(process.env.REGRESSION_BASELINE==='1') assert.ok(after.every(r=>r.名称==='凡人'));
else assert.ok(after.every(r=>r.名称==='练气'));
console.log(JSON.stringify({baseline:process.env.REGRESSION_BASELINE==='1',before,after}));
