import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transform,projectPoint,voxelAddress,voxelize,liftPixel,inverseTransform,cameraBevCell,type Point} from '../app/sensors.ts';
const root='public/nuscenes/calibrated/',rig=JSON.parse(readFileSync(root+'rig.json','utf8'));
const bytes=readFileSync(root+'lidar-frame.bin');
const raw=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.length/4);
const points:Point[]=[];for(let i=0;i<raw.length;i+=5)points.push([raw[i],raw[i+1],raw[i+2],raw[i+3],raw[i+4]]);
test('all seven sensor assets match the source manifest',()=>{
  const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
  assert.equal(hash(bytes),rig.source_hashes.lidar_frame);assert.equal(points.length,34688);
  for(const c of rig.cameras)assert.equal(hash(readFileSync(root+c.image.split('/').pop())),c.image_sha256);
});
test('all six cameras receive real visible projected returns',()=>{
  for(const c of rig.cameras){const projected=points.map(p=>projectPoint(c,p));assert.ok(projected.filter(p=>p.visible).length>500,c.name);
    const i=projected.findIndex(p=>p.visible),p=points[i],q=projected[i],k=c.cam2img;
    const reconstructed=[(q.u-k[0][2])*q.depth/k[0][0],(q.v-k[1][2])*q.depth/k[1][1],q.depth];
    const actual=transform(c.lidar2cam,p);actual.forEach((v,j)=>assert.ok(Math.abs(v-reconstructed[j])<1e-8));
  }
});
test('native voxel addresses are half-open and preserve every retained return',()=>{
  assert.deepEqual(voxelAddress([-54,-54,-5],.075),[0,0,0]);assert.equal(voxelAddress([54,0,0],.075),null);assert.equal(voxelAddress([0,0,3],.075),null);
  const fine=voxelize(points,.075),coarse=voxelize(points,.6);
  const retained=points.filter(p=>voxelAddress(p,.075)).length;
  assert.equal([...fine.values()].reduce((n,c)=>n+c.indices.length,0),retained);
  assert.equal([...coarse.values()].reduce((n,c)=>n+c.indices.length,0),retained);
  assert.ok(fine.size>coarse.size);
});
test('calibrated lifting recovers measured returns in all six cameras',()=>{
  for(const c of rig.cameras){let checked=0;for(const p of points){const q=projectPoint(c,p);if(!q.visible)continue;
    const lifted=liftPixel(c,q.u,q.v,q.depth);
    assert.ok(Math.hypot(...lifted.map((v,i)=>v-p[i]))<1e-4,c.name);
    if(++checked===100)break;
  }assert.equal(checked,100);}
});
test('extrinsic yaw keeps camera center fixed and follows the chord displacement',()=>{
  const c=rig.cameras[1],p=points[8564],q=projectPoint(c,p),origin=inverseTransform(c.lidar2cam,[0,0,0]);
  const base=liftPixel(c,q.u,q.v,q.depth),rotated=liftPixel(c,q.u,q.v,q.depth,5);
  const expected=2*Math.hypot(base[0]-origin[0],base[1]-origin[1])*Math.sin(2.5*Math.PI/180);
  assert.ok(Math.abs(Math.hypot(...rotated.map((v,i)=>v-base[i]))-expected)<1e-10);
  const zero=liftPixel(c,q.u,q.v,0,5);assert.ok(Math.hypot(...zero.map((v,i)=>v-origin[i]))<1e-10);
});
test('camera pooling uses its own z bounds and native 0.3 m addresses',()=>{
  assert.deepEqual(cameraBevCell([-54,-54,-10]),[0,0]);
  assert.deepEqual(cameraBevCell([53.99,53.99,9.99]),[359,359]);
  assert.equal(cameraBevCell([54,0,0]),null);assert.equal(cameraBevCell([0,0,10]),null);
  assert.ok(cameraBevCell([0,0,5])); // Camera z range is not LiDAR voxel z range.
});
