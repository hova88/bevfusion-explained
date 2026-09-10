// Small, deterministic teaching tensors. Not checkpoint activations.
export const POOL_RANKS = [3,3,3,4,4,7,7,7,7,7,9,9,11,11,11,14,14,17,17,17,17,21,21,23,23,23,23,23];
export const POOL_VALUES = POOL_RANKS.map((_, i) => (i % 5 + 1) / 10);
export function poolRank(rank: number) {
  const start = POOL_RANKS.indexOf(rank);
  const values = POOL_VALUES.filter((_,i) => POOL_RANKS[i] === rank);
  return { start, count: values.length, values, sum: values.reduce((a,b) => a+b,0) };
}
export const CAMERA_FIELD = [0,.1,.15,.2,.08,.12,.35,.72,.55,.2,.08,.46,.95,.68,.25,.05,.2,.51,.43,.16,.02,.08,.18,.12,.04];
export const LIDAR_FIELD = [0,.02,.05,.06,0,.03,.18,.8,.31,.05,.02,.27,.88,.36,.04,0,.08,.45,.21,.03,0,0,.05,.02,0];
export const CAMERA_KERNEL = [0,-.1,0,-.1,.6,-.1,0,-.1,0];
export const LIDAR_KERNEL = [0,.1,0,.1,.4,.1,0,.1,0];
export function convolveAt(field: number[], kernel: number[], index: number) {
  const row = Math.floor(index/5), col = index%5;
  return kernel.map((weight,k) => {
    const y = row+Math.floor(k/3)-1, x=col+k%3-1;
    const value = y<0 || y>=5 || x<0 || x>=5 ? 0 : field[y*5+x];
    return {value,weight,product:value*weight};
  });
}
export function fusionAt(index: number, camera = true, lidar = true) {
  const cam = camera ? convolveAt(CAMERA_FIELD,CAMERA_KERNEL,index).reduce((s,t)=>s+t.product,0) : 0;
  const li = lidar ? convolveAt(LIDAR_FIELD,LIDAR_KERNEL,index).reduce((s,t)=>s+t.product,0) : 0;
  // A chosen inference-time BN affine transform (not learned weights).
  const preActivation = 1.2*(cam+li)-.1;
  return {cam,li,preActivation,output:Math.max(0,preActivation)};
}
