'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {loadSensors,projectPoint,transform,voxelAddress,voxelize,liftPixel,inverseTransform,type Point,type Rig} from './sensors';
import {DEPTH_BINS,depthProbabilities} from './geometry';
import RayInspector from './RayInspector';

export default function RealScene({selected,onSelect,voxel=false,point,setPoint,rayMode,depth=24,setDepth=()=>{},yaw=0,setYaw=()=>{}}:{selected:string;onSelect:(id:string)=>void;voxel?:boolean;point:number;setPoint:(n:number)=>void;rayMode?:'lift'|'align';depth?:number;setDepth?:(n:number)=>void;yaw?:number;setYaw?:(n:number)=>void}) {
  const [data,setData]=useState<{rig:Rig;points:Point[]}|null>(null),[error,setError]=useState('');
  const [xy,setXY]=useState(.075),[height,setHeight]=useState(false),[zoom,setZoom]=useState(1);
  const cloud=useRef<HTMLCanvasElement>(null),photo=useRef<HTMLCanvasElement>(null);
  const pickCloud=useRef<{x:number;y:number;i:number}[]>([]),pickPhoto=useRef<{x:number;y:number;i:number}[]>([]);
  useEffect(()=>{let live=true;loadSensors().then(d=>{if(live)setData(d)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[]);
  const camera=data?.rig.cameras.find(c=>c.name==='CAM_'+selected.replaceAll('-','_').toUpperCase());
  const cells=useMemo(()=>data?voxelize(data.points,xy):new Map<string,{address:number[];indices:number[]}>(),[data,xy]);
  const address=data?voxelAddress(data.points[point],xy):null,key=address?.join(',');
  const members=key?cells.get(key)?.indices??[]:[];
  useEffect(()=>{
    if(!data||!camera||!cloud.current||!photo.current)return;
    const canvas=cloud.current,imageCanvas=photo.current;
    const draw=()=>{
      if(!canvas.isConnected||!imageCanvas.isConnected)return;
      const setup=(el:HTMLCanvasElement)=>{const r=el.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);el.width=Math.round(r.width*dpr);el.height=Math.round(r.height*dpr);const c=el.getContext('2d')!;c.scale(dpr,dpr);return {c,w:r.width,h:r.height}};
      const {c,w,h}=setup(canvas),cx=w/2,cy=h/2,scale=Math.min(w,h)*.87/108*zoom;
      const screen=(p:number[])=>({x:cx-p[1]*scale,y:cy-p[0]*scale*(height?.6:1)-p[2]*scale*(height?2:0)});
      c.fillStyle='#f8f6ef';c.fillRect(0,0,w,h);c.strokeStyle='#dedbd1';c.lineWidth=1;
      for(let i=-50;i<=50;i+=10){const a=screen([i,-54,0]),b=screen([i,54,0]),d=screen([-54,i,0]),e=screen([54,i,0]);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.moveTo(d.x,d.y);c.lineTo(e.x,e.y);c.stroke();}
      const selectedSet=new Set(voxel?members:[point]);pickCloud.current=[];
      data.points.forEach((p,i)=>{const q=screen(transform(data.rig.lidar2ego,p));if(q.x<0||q.x>w||q.y<0||q.y>h)return;pickCloud.current.push({...q,i});c.fillStyle=selectedSet.has(i)?'#d95730':voxel&&!voxelAddress(p,xy)?'#cbc8be':'#24292270';const size=selectedSet.has(i)?4:1.2;c.fillRect(q.x-size/2,q.y-size/2,size,size)});
      if(voxel&&address){
        const corners=Array.from({length:8},(_,i)=>screen(transform(data.rig.lidar2ego,[-54+(address[0]+(i&1))*xy,-54+(address[1]+((i>>1)&1))*xy,-5+(address[2]+((i>>2)&1))*.2])));
        c.strokeStyle='#d95730';c.lineWidth=1.5;
        corners.forEach((a,i)=>[1,2,4].forEach(bit=>{if(i&bit)return;const b=corners[i|bit];c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke()}));
        // Local XY inset shows sub-voxel positions at a readable scale.
        const side=120,left=w-side-22,top=42;
        c.fillStyle='#f8f6efed';c.fillRect(left-10,top-25,side+20,side+62);c.strokeStyle='#d95730';c.strokeRect(left,top,side,side);
        c.font='12px ui-monospace, monospace';c.fillStyle='#4a5148';c.fillText('SELECTED VOXEL · XY',left-5,top-10);
        members.forEach(i=>{const p=data.points[i],x=(p[0]+54-address[0]*xy)/xy,y=(p[1]+54-address[1]*xy)/xy;c.fillStyle=i===point?'#d95730':'#698fa1';c.beginPath();c.arc(left+x*side,top+(1-y)*side,i===point?4:2.5,0,Math.PI*2);c.fill()});
        c.fillStyle='#4a5148';c.fillText(`${xy} × ${xy} × 0.2 m`,left-5,top+side+21);
      }
      const q=screen(transform(data.rig.lidar2ego,data.points[point]));c.strokeStyle=rayMode?'#477e9e':'#d95730';c.lineWidth=2;c.beginPath();c.arc(q.x,q.y,9,0,Math.PI*2);c.stroke();
      const measured=projectPoint(camera,data.points[point]);
      if(rayMode&&measured.visible){
        const toScreen=(p:number[])=>screen(transform(data.rig.lidar2ego,p));
        const origin=toScreen(inverseTransform(camera.lidar2cam,[0,0,0]));
        const target=toScreen(liftPixel(camera,measured.u,measured.v,rayMode==='lift'?depth:measured.depth,rayMode==='align'?yaw:0));
        c.strokeStyle='#d95730';c.lineWidth=1.5;c.beginPath();c.moveTo(origin.x,origin.y);c.lineTo(target.x,target.y);c.stroke();
        if(rayMode==='lift'){const probabilities=depthProbabilities(),peak=Math.max(...probabilities);DEPTH_BINS.forEach((d,i)=>{const s=toScreen(liftPixel(camera,measured.u,measured.v,d));c.fillStyle=`rgba(217,87,48,${.12+.65*probabilities[i]/peak})`;c.beginPath();c.arc(s.x,s.y,1.2+2*probabilities[i]/peak,0,Math.PI*2);c.fill()})}
        c.fillStyle='#d95730';c.beginPath();c.arc(target.x,target.y,5,0,Math.PI*2);c.fill();
        if(rayMode==='align'){c.setLineDash([4,3]);c.strokeStyle='#477e9e';c.beginPath();c.moveTo(q.x,q.y);c.lineTo(target.x,target.y);c.stroke();c.setLineDash([])}
      }
      c.fillStyle='#4a5148';c.font='12px ui-monospace, monospace';c.fillText(height?'EGO VIEW · HEIGHT × 2':'EGO VIEW · +X UP / +Y LEFT',14,22);c.fillText('10 m grid · select a return',14,h-16);
      const origin=screen([0,0,0]);c.fillStyle='#698fa1';c.fillRect(origin.x-4,origin.y-7,8,14);
      const im=setup(imageCanvas);im.c.clearRect(0,0,im.w,im.h);pickPhoto.current=[];
      data.points.forEach((p,i)=>{const q=projectPoint(camera,p);if(!q.visible)return;const x=q.u/1600*im.w,y=q.v/900*im.h;pickPhoto.current.push({x,y,i});im.c.fillStyle=`hsla(${Math.min(220,q.depth*4)},70%,55%,.7)`;im.c.fillRect(x-1,y-1,2,2)});
      const projected=projectPoint(camera,data.points[point]);if(projected.visible){im.c.strokeStyle='#fff';im.c.lineWidth=3;im.c.beginPath();im.c.arc(projected.u/1600*im.w,projected.v/900*im.h,8,0,Math.PI*2);im.c.stroke();im.c.strokeStyle='#d95730';im.c.lineWidth=1.5;im.c.stroke();}
    };
    draw();const ro=new ResizeObserver(draw);ro.observe(canvas);ro.observe(imageCanvas);return()=>ro.disconnect();
  },[data,camera,point,xy,voxel,height,zoom,key,rayMode,depth,yaw]);
  function pick(e:React.MouseEvent<HTMLCanvasElement>,list:{x:number;y:number;i:number}[]) {const r=e.currentTarget.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=Infinity,index=-1;for(const p of list){const d=(p.x-x)**2+(p.y-y)**2;if(d<best){best=d;index=p.i}}if(index>=0&&best<625)setPoint(index);}
  if(error)return <p className="sensor-status" role="alert">{error} Reload this page to retry.</p>;
  if(!data||!camera)return <p className="sensor-status" role="status">Loading the calibrated nuScenes frame…</p>;
  const p=data.points[point],ego=transform(data.rig.lidar2ego,p),projection=projectPoint(camera,p);
  return <div className="real-scene">
    <div className="real-cloud"><div className="scene-toolbar"><button onClick={()=>setHeight(!height)} aria-pressed={height}>{height?'Height view':'Top view'}</button><label>Zoom <input aria-label="Point cloud zoom" type="range" min="1" max="4" step=".25" value={zoom} onChange={e=>setZoom(+e.target.value)}/></label></div><canvas ref={cloud} onClick={e=>pick(e,pickCloud.current)} tabIndex={0} aria-label="Real LiDAR cloud. Click a return; left and right arrows select adjacent records." onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();setPoint((point+(e.key==='ArrowRight'?1:-1)+data.points.length)%data.points.length)}}}/><p>34,688 measured returns · one sweep · {rayMode?'blue = measurement · orange = lifted evidence':voxel?'orange = same 3D voxel':'orange = selected return'}</p></div>
    <div className="real-camera"><div className="camera-selector">{data.rig.cameras.map(c=>{const id=c.name.slice(4).toLowerCase().replaceAll('_','-');return <button key={id} onClick={()=>onSelect(id)} aria-pressed={id===selected} className={id===selected?'active':''}>{id.split('-').map(s=>s[0].toUpperCase()).join('')}</button>})}</div><figure><img src={(process.env.NEXT_PUBLIC_BASE_PATH || '')+'/nuscenes/calibrated/'+camera.image.split('/').pop()} alt={`Original nuScenes ${camera.name} with calibrated LiDAR projection`}/><canvas ref={photo} onClick={e=>pick(e,pickPhoto.current)} aria-label="Click a projected LiDAR return to inspect it in both views"/></figure><p>{camera.name} · 1600 × 900 · {((camera.timestamp-data.rig.timestamp)*1000).toFixed(1)} ms from LiDAR. Pose-compensated lidar2cam projection; moving objects may still shift.</p>{rayMode&&<RayInspector camera={camera} point={p} mode={rayMode} depth={depth} setDepth={setDepth} yaw={yaw} setYaw={setYaw}/>}<details className="sensor-record" open={!rayMode}><summary>Sensor record #{point}</summary><aside className="operator-panel"><b>{voxel?'VOXEL MEMBERSHIP':'ONE RETURN / TWO SENSOR VIEWS'}</b>{voxel&&<label className="voxel-size">XY cell size <select value={xy} onChange={e=>setXY(+e.target.value)}><option value={.075}>0.075 m — model setting</option><option value={.3}>0.30 m — compare</option><option value={.6}>0.60 m — compare</option><option value={1.2}>1.20 m — compare</option></select></label>}<dl><div><dt>raw record</dt><dd>#{point}</dd></div><div><dt>LiDAR xyz / m</dt><dd>{p.slice(0,3).map(v=>v.toFixed(2)).join(', ')}</dd></div><div><dt>ego xyz / m</dt><dd>{ego.map(v=>v.toFixed(2)).join(', ')}</dd></div><div><dt>camera depth</dt><dd>{projection.depth.toFixed(2)} m</dd></div><div><dt>image pixel</dt><dd>{projection.visible?`${projection.u.toFixed(1)}, ${projection.v.toFixed(1)}`:'Outside this view'}</dd></div>{voxel&&<><div><dt>native voxel [x,y,z]</dt><dd>{address?address.join(', '):'Outside range'}</dd></div><div><dt>returns in voxel</dt><dd>{members.length}</dd></div><div><dt>occupied voxels</dt><dd>{cells.size.toLocaleString()}</dd></div></>}</dl><p>{voxel?'floor((p − min) / size), with z size fixed at 0.2 m. Membership uses native LiDAR coordinates and all returns, before the model’s 10-point cap. The fifth raw field is ring ID; the detector replaces it with sweep time lag.':'Click a projected point or the cloud to trace the same measured return. Projection is geometric evidence, not a neural-network prediction.'}</p></aside></details></div>
  </div>;
}
