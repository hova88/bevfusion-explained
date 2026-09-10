export type Point = [number,number,number,number,number];
export type Matrix = number[][];
export type SensorCamera = {name:string;image:string;cam2img:Matrix;lidar2cam:Matrix;timestamp:number};
export type Rig = {sample_token:string;timestamp:number;lidar2ego:Matrix;cameras:SensorCamera[]};
export function transform(m:Matrix,p:number[]):number[] {return m.slice(0,3).map(r=>r[0]*p[0]+r[1]*p[1]+r[2]*p[2]+r[3]);}
/** Inverse of a rigid sensor transform: Rᵀ(p − t). */
export function inverseTransform(m:Matrix,p:number[]):number[] {
  const q=p.map((v,i)=>v-m[i][3]);
  return [0,1,2].map(i=>m[0][i]*q[0]+m[1][i]*q[1]+m[2][i]*q[2]);
}
/** Original-image pixel and optical Z depth -> native LiDAR coordinates.
 * Injected yaw rotates the camera orientation about LiDAR +Z, keeping its center fixed.
 */
export function liftPixel(camera:SensorCamera,u:number,v:number,depth:number,yaw=0) {
  const k=camera.cam2img,origin=inverseTransform(camera.lidar2cam,[0,0,0]);
  const p=inverseTransform(camera.lidar2cam,[(u-k[0][2])*depth/k[0][0],(v-k[1][2])*depth/k[1][1],depth]);
  const a=yaw*Math.PI/180,dx=p[0]-origin[0],dy=p[1]-origin[1];
  return [origin[0]+Math.cos(a)*dx-Math.sin(a)*dy,origin[1]+Math.sin(a)*dx+Math.cos(a)*dy,p[2]];
}
export function cameraBevCell(p:number[],resolution=.3) {
  if(p[0]<-54||p[0]>=54||p[1]<-54||p[1]>=54||p[2]<-10||p[2]>=10)return null;
  return [Math.floor((p[0]+54)/resolution),Math.floor((p[1]+54)/resolution)];
}
export function projectPoint(camera:SensorCamera,p:number[]) {
  const q=transform(camera.lidar2cam,p), k=camera.cam2img;
  const u=k[0][0]*q[0]/q[2]+k[0][2],v=k[1][1]*q[1]/q[2]+k[1][2];
  return {u,v,depth:q[2],visible:q[2]>1&&u>=0&&u<1600&&v>=0&&v<900};
}
export function voxelAddress(p:number[],xy:number,z=.2) {
  if(p[0]<-54||p[0]>=54||p[1]<-54||p[1]>=54||p[2]<-5||p[2]>=3)return null;
  return [Math.floor((p[0]+54)/xy),Math.floor((p[1]+54)/xy),Math.floor((p[2]+5)/z)];
}
export function voxelize(points:Point[],xy:number) {
  const cells=new Map<string,{address:number[];indices:number[]}>();
  points.forEach((p,i)=>{const a=voxelAddress(p,xy);if(!a)return;const key=a.join(',');const cell=cells.get(key);if(cell)cell.indices.push(i);else cells.set(key,{address:a,indices:[i]});});
  return cells;
}
let packet:Promise<{rig:Rig;points:Point[]}>|undefined;
export function loadSensors() {
  if(!packet)packet=Promise.all([fetch((process.env.NEXT_PUBLIC_BASE_PATH || '')+'/nuscenes/calibrated/rig.json'),fetch((process.env.NEXT_PUBLIC_BASE_PATH || '')+'/nuscenes/calibrated/lidar-frame.bin')]).then(async([r,b])=>{
    if(!r.ok||!b.ok)throw Error('Sensor data could not be loaded.');
    const rig=await r.json() as Rig,raw=new Float32Array(await b.arrayBuffer());
    if(raw.length%5)throw Error('Invalid LiDAR record length.');
    const points:Point[]=[];for(let i=0;i<raw.length;i+=5)points.push([raw[i],raw[i+1],raw[i+2],raw[i+3],raw[i+4]]);
    return {rig,points};
  }).catch(e=>{packet=undefined;throw e});
  return packet;
}
