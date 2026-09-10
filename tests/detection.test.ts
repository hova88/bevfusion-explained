import test from 'node:test';
import assert from 'node:assert/strict';
import {HEAD_HEAT,localPeaks,topQueries,decodeBox} from '../app/detection.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-10);
test('peak suppression prevents neighboring high cells consuming both queries',()=>{
 assert.deepEqual(topQueries(HEAD_HEAT,2).map(q=>q.index),[23,24]);
 assert.deepEqual(topQueries(localPeaks(HEAD_HEAT),2).map(q=>q.index),[23,40]);
 assert.equal(localPeaks(HEAD_HEAT)[24],0);
});
test('decoder uses 0.6 m cells, exponential dimensions, atan2 yaw, and bottom center',()=>{
 const box=decodeBox(82.5,113.5,1,0,[Math.log(8),Math.log(2.5),Math.log(3)],-.3,1,0);
 near(box.x,-3.9);near(box.y,14.1);near(box.dims[0],8);near(box.dims[2],3);near(box.zBottom,-1.8);near(box.yaw,Math.PI/2);
 const wider=decodeBox(82.5,113.5,0,0,[Math.log(8),Math.log(2.5),Math.log(4)],-.3,0,-1);
 near(wider.zBottom,-2.3);near(Math.abs(wider.yaw),Math.PI);
});
