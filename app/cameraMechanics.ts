// Small, explicit teaching tensors; never checkpoint predictions.
export const CONTEXT = [2, -1, 0.5];
export const TOY_DEPTHS = [5, 10, 15, 20];
export function softmax(logits: number[]) {
  const e = logits.map(x => Math.exp(x - Math.max(...logits)));
  const sum = e.reduce((a,b)=>a+b,0);
  return e.map(x=>x/sum);
}
export function liftedRows(logits: number[]) {
  return softmax(logits).map(p=>CONTEXT.map(f=>p*f));
}
export function liftGradients(logits: number[], upstream: number[]) {
  const p=softmax(logits), dp=upstream.map(g=>g*CONTEXT[0]);
  const mean=p.reduce((s,v,i)=>s+v*dp[i],0);
  return {feature:p.reduce((s,v,i)=>s+v*upstream[i],0), logits:p.map((v,i)=>v*(dp[i]-mean))};
}
export function memorySize(batch:number,stride:number,bytes:number) {
  const h=256/stride,w=704/stride,points=batch*6*118*h*w;
  return {h,w,points,scalars:points*80,mib:points*80*bytes/2**20};
}
export type RecordRow={id:string;x:number;y:number;z:number;b:number;value:number};
// Deliberately shuffled input, including one out-of-grid record.
export const RECORDS:RecordRow[]=[
  {id:'A',x:0,y:0,z:0,b:0,value:1}, {id:'C',x:1,y:0,z:0,b:0,value:7},
  {id:'F',x:2,y:0,z:0,b:0,value:4}, {id:'B',x:0,y:0,z:0,b:0,value:3},
  {id:'D',x:1,y:0,z:0,b:0,value:-1}, {id:'G',x:2,y:0,z:0,b:0,value:-3},
  {id:'E',x:1,y:0,z:0,b:0,value:-2}, {id:'H',x:2,y:0,z:0,b:0,value:6},
  {id:'I',x:-1,y:0,z:0,b:0,value:99},
];
export function rankOf(r:RecordRow,batches:number){return r.x*3*batches+r.y*batches+r.b;}
export function reduction(split:boolean) {
  const batches=split?2:1;
  const rows=RECORDS.map(r=>({...r,b:split&&r.id==='B'?1:0}));
  const sorted=rows.filter(r=>r.x>=0&&r.x<3&&r.y>=0&&r.y<3&&r.z===0)
    .sort((a,b)=>rankOf(a,batches)-rankOf(b,batches));
  const groups:{rank:number;start:number;rows:RecordRow[];sum:number}[]=[];
  sorted.forEach((r,i)=>{const rank=rankOf(r,batches);if(groups.at(-1)?.rank!==rank)groups.push({rank,start:i,rows:[],sum:0});groups.at(-1)!.rows.push(r);groups.at(-1)!.sum+=r.value;});
  let total=0;const prefix=sorted.map(r=>total+=r.value);
  return {rows,sorted,groups,prefix,batches};
}
