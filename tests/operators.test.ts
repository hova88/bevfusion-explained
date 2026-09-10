import test from 'node:test';
import assert from 'node:assert/strict';
import { POOL_VALUES, poolRank, convolveAt, fusionAt } from '../app/operators.ts';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('pooling preserves sums and produces zero for empty cells',()=>{
  assert.equal(poolRank(7).start,5); assert.equal(poolRank(7).count,5); close(poolRank(7).sum,1.5);
  close(Array.from({length:36},(_,i)=>poolRank(i).sum).reduce((a,b)=>a+b,0),POOL_VALUES.reduce((a,b)=>a+b,0));
  assert.equal(poolRank(0).sum,0);
});
test('3x3 convolution uses neighbors with zero padding, not a cellwise blend',()=>{
  const ones=Array(25).fill(1), kernel=Array(9).fill(1);
  close(convolveAt(ones,kernel,12).reduce((s,t)=>s+t.product,0),9);
  close(convolveAt(ones,kernel,0).reduce((s,t)=>s+t.product,0),4);
  close(fusionAt(12).cam,.333); close(fusionAt(12).li,.540); close(fusionAt(12).output,.9476);
});
test('input ablation retains identical weights and applies BN before ReLU',()=>{
  close(fusionAt(12,true,false).output,.2996);
  close(fusionAt(12,false,true).output,.548);
  assert.equal(fusionAt(0).output,0); assert.ok(fusionAt(0).preActivation<0);
  assert.equal(fusionAt(12,false,false).output,0);
});
