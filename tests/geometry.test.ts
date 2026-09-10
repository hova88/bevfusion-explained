import assert from 'node:assert/strict';
import { test } from 'node:test';
import { projectToBev, depthProbabilities, DEPTH_BINS, screenPoint } from '../app/geometry.ts';

test('ego x points forward and screen up; image right maps to ego right', () => {
  const center = projectToBev({angle:0},{x:50,y:50},20);
  assert.equal(center.x,20); assert.equal(center.y,0); assert.equal(center.z,1.5);
  const right = projectToBev({angle:0},{x:75,y:50},20);
  assert.ok(right.y<0);
  assert.ok(screenPoint(right,200,200,2).x>200);
  assert.equal(screenPoint(center,200,200,2).y,160);
});
test('camera rotations, vertical coordinates and yaw displacement are consistent', () => {
  assert.ok(projectToBev({angle:55},{x:50,y:50},20).y>0);
  assert.ok(projectToBev({angle:-55},{x:50,y:50},20).y<0);
  assert.ok(projectToBev({angle:180},{x:50,y:50},20).x<0);
  assert.ok(projectToBev({angle:0},{x:50,y:75},20).z<1.5);
  const a=projectToBev({angle:0},{x:50,y:50},20), b=projectToBev({angle:0},{x:50,y:50},20,3);
  assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-40*Math.sin(1.5*Math.PI/180))<1e-10);
});
test('out-of-range samples are rejected, never clamped to border cells', () => {
  assert.equal(projectToBev({angle:0},{x:50,y:50},54).inside,false);
  assert.equal(projectToBev({angle:0},{x:50,y:50},59.5).cx,null);
  assert.equal(projectToBev({angle:0},{x:50,y:50},53.9).cx,179);
  assert.equal(projectToBev({angle:0},{x:50,y:0},40).inside,false);
});
test('distribution is normalized over exactly 118 half-meter hypotheses', () => {
  assert.equal(DEPTH_BINS.length,118); assert.equal(DEPTH_BINS[0],1); assert.equal(DEPTH_BINS[117],59.5);
  assert.ok(Math.abs(depthProbabilities().reduce((a,b)=>a+b,0)-1)<1e-12);
});
