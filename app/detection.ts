export const HEAD_HEAT = [
 .02,.03,.04,.02,.01,.02,.01,
 .04,.15,.21,.12,.08,.14,.02,
 .05,.38,.72,.51,.18,.32,.03,
 .04,.46,.93,.88,.22,.25,.02,
 .02,.19,.36,.25,.15,.20,.01,
 .01,.06,.10,.08,.18,.81,.02,
 .01,.02,.02,.03,.04,.05,.01,
];
/** Interior 3×3 peak suppression for this one-class teaching patch. */
export function localPeaks(values:number[],size=7) {
 return values.map((value,i)=>{const row=Math.floor(i/size),col=i%size;if(!row||!col||row===size-1||col===size-1)return 0;
  for(let y=row-1;y<=row+1;y++)for(let x=col-1;x<=col+1;x++)if(values[y*size+x]>value)return 0;
  return value;
 });
}
export function topQueries(values:number[],k:number){return values.map((score,index)=>({score,index})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,k);}
export function decodeBox(queryX:number,queryY:number,offsetX:number,offsetY:number,logDims:number[],gravityZ:number,sinYaw:number,cosYaw:number){
 const dims=logDims.map(Math.exp);
 return {x:(queryX+offsetX)*.6-54,y:(queryY+offsetY)*.6-54,zBottom:gravityZ-dims[2]/2,gravityZ,dims,yaw:Math.atan2(sinYaw,cosYaw)};
}
