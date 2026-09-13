import test from 'node:test';
import assert from 'node:assert/strict';
import {CONTEXT,softmax,liftedRows,liftGradients,memorySize,reduction} from '../app/cameraMechanics.ts';

test('outer product conserves signed context across normalized depths',()=>{
  for(const logits of [[0,0,0,0],[-4,2,-1,.5]]){
    const rows=liftedRows(logits);
    CONTEXT.forEach((f,c)=>assert.ok(Math.abs(rows.reduce((s,r)=>s+r[c],0)-f)<1e-12));
  }
  assert.equal(memorySize(1,8,4).points,1993728);
  assert.equal(memorySize(1,4,4).mib,4*memorySize(1,8,4).mib);
});
test('shared filtering/sorting preserves record identity and batch isolation',()=>{
  const a=reduction(false),b=reduction(true);
  assert.deepEqual(a.groups.map(g=>g.sum),[4,4,7]);
  assert.deepEqual(a.prefix,[1,4,11,10,8,12,9,15]);
  assert.ok(!a.sorted.some(r=>r.id==='I'));
  assert.deepEqual(b.groups.map(g=>g.sum),[1,3,4,7]);
  assert.equal(b.sorted.find(r=>r.id==='B')?.value,3);
});
test('softmax gradient agrees with finite differences including zero-input bins',()=>{
  const a=[-2,-.5,-1,-2],g=[0,2,0,0],actual=liftGradients(a,g),eps=1e-5;
  const loss=(logits:number[])=>softmax(logits).reduce((s,p,i)=>s+p*2*g[i],0);
  actual.logits.forEach((v,i)=>{
    const plus=a.map((x,j)=>x+(j===i?eps:0)),minus=a.map((x,j)=>x-(j===i?eps:0));
    assert.ok(Math.abs(v-(loss(plus)-loss(minus))/(2*eps))<1e-8);
  });
  assert.ok(Math.abs(actual.logits.reduce((s,v)=>s+v,0))<1e-12);
});
