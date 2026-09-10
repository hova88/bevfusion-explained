import test from 'node:test';
import assert from 'node:assert/strict';
import {featureRay,imageToNetwork,networkToImage,nearestFeature} from '../app/imageGeometry.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9);
test('validation resize and bottom-center crop invert exactly',()=>{
  near(imageToNetwork(1600,900).u,736);near(imageToNetwork(1600,900).v,256);
  near(networkToImage(0,0).u,32/.48);near(networkToImage(0,0).v,176/.48);
});
test('all 2816 frustum samples preserve endpoint-inclusive geometry',()=>{
  for(let row=0;row<32;row++)for(let col=0;col<88;col++){
    const ray=featureRay(col,row),net=imageToNetwork(ray.original.u,ray.original.v);
    near(net.u,ray.network.u);near(net.v,ray.network.v);
    assert.deepEqual(nearestFeature(net.u,net.v),{column:col,row});
  }
  assert.deepEqual(featureRay(87,31).network,{u:703,v:255});
  assert.deepEqual(featureRay(0,0).network,{u:0,v:0});
  assert.throws(()=>featureRay(88,0));
});
