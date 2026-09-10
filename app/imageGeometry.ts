// Official nuScenes validation ImageAug3D: resize .48, bottom crop, centered X.
export const IMAGE_AUG = {resize:.48,width:704,height:256,cropX:32,cropY:176,featureWidth:88,featureHeight:32};
export function imageToNetwork(u:number,v:number){return {u:u*.48-32,v:v*.48-176};}
export function networkToImage(u:number,v:number){return {u:(u+32)/.48,v:(v+176)/.48};}
export function featureRay(column:number,row:number){
  if(column<0||column>87||row<0||row>31||!Number.isInteger(column)||!Number.isInteger(row))throw Error('Feature index outside 88×32 plane');
  // create_frustum uses endpoint-inclusive linspace, not 8*(index+.5).
  const network={u:column*703/87,v:row*255/31};
  return {network,original:networkToImage(network.u,network.v)};
}
export function nearestFeature(u:number,v:number){return {column:Math.max(0,Math.min(87,Math.round(u/703*87))),row:Math.max(0,Math.min(31,Math.round(v/255*31)))};}
