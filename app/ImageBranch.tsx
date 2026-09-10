'use client';
import {useEffect,useState} from 'react';
import {featureRay,imageToNetwork,nearestFeature} from './imageGeometry';
import {loadSensors,liftPixel,projectPoint,type Rig,type Point} from './sensors';

export default function ImageBranch({selected,onSelect,point}:{selected:string;onSelect:(s:string)=>void;point:number}) {
  const [data,setData]=useState<{rig:Rig;points:Point[]}|null>(null),[error,setError]=useState('');
  const [column,setColumn]=useState(43),[row,setRow]=useState(13),[skip,setSkip]=useState(false);
  useEffect(()=>{let live=true;loadSensors().then(d=>{if(live)setData(d)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[]);
  if(error)return <p role="alert" className="sensor-status">{error}</p>;
  if(!data)return <p role="status" className="sensor-status">Loading original camera pixels…</p>;
  const camera=data.rig.cameras.find(c=>c.name==='CAM_'+selected.replaceAll('-','_').toUpperCase())!;
  const src=(process.env.NEXT_PUBLIC_BASE_PATH || '')+'/nuscenes/calibrated/'+camera.image.split('/').pop(),ray=featureRay(column,row);
  const reference=projectPoint(camera,data.points[point]);
  const network=imageToNetwork(reference.u,reference.v),inCrop=reference.visible&&network.u>=0&&network.u<704&&network.v>=0&&network.v<256;
  const correct=liftPixel(camera,ray.original.u,ray.original.v,20),wrong=liftPixel(camera,ray.network.u,ray.network.v,20);
  const errorMeters=Math.hypot(...correct.map((v,i)=>v-wrong[i]));
  const choose=(u:number,v:number)=>{const f=nearestFeature(u,v);setColumn(f.column);setRow(f.row)};
  return <div className="image-branch"><div className="image-views"><div className="camera-selector">{data.rig.cameras.map(c=>{const id=c.name.slice(4).toLowerCase().replaceAll('_','-');return <button key={id} onClick={()=>onSelect(id)} aria-pressed={id===selected} className={id===selected?'active':''}>{id.split('-').map(s=>s[0].toUpperCase()).join('')}</button>})}</div>
    <figure><figcaption>01 / ORIGINAL · 1600 × 900</figcaption><div className="original-crop"><img src={src} alt={`Original ${camera.name}; orange rectangle is the validation crop`}/><div className="crop-window"/><span className="image-dot" style={{left:`${ray.original.u/1600*100}%`,top:`${ray.original.v/900*100}%`}}/></div></figure>
    <figure><figcaption>02 / RESIZE × 0.48 → CROP [32,176,736,432]</figcaption><div className="network-crop" tabIndex={0} role="group" aria-label="Feature sampling plane. Click or use arrow keys to choose an index." onClick={e=>{const r=e.currentTarget.getBoundingClientRect();choose((e.clientX-r.left)/r.width*704,(e.clientY-r.top)/r.height*256)}} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();setColumn(c=>Math.max(0,Math.min(87,c+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0))));setRow(r=>Math.max(0,Math.min(31,r+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0))))}}><img src={src} alt="704 by 256 validation crop with feature sampling coordinates"/><div className="sampling-grid"/><span className="image-dot" style={{left:`${ray.network.u/704*100}%`,top:`${ray.network.v/256*100}%`}}/></div></figure>
    <p>Same source image, two coordinate systems. The orange dot follows the exact frustum sampling rule. The overlaid grid is geometry—not a captured feature activation.</p>
  </div><aside className="operator-panel"><b>TRACE ONE FEATURE LOCATION</b><h4>[{row}, {column}]</h4><label className="image-index">Column <input type="range" aria-label="Feature column" min="0" max="87" value={column} onChange={e=>setColumn(+e.target.value)}/></label><label className="image-index">Row <input type="range" aria-label="Feature row" min="0" max="31" value={row} onChange={e=>setRow(+e.target.value)}/></label><button className="ray-reset" disabled={!inCrop} onClick={()=>choose(network.u,network.v)}>Nearest feature to return #{point}</button>{!inCrop&&<p>The shared selected return is outside this crop.</p>}
    <dl><div><dt>network pixel (u,v)</dt><dd>{ray.network.u.toFixed(2)}, {ray.network.v.toFixed(2)}</dd></div><div><dt>original pixel (u,v)</dt><dd>{ray.original.u.toFixed(2)}, {ray.original.v.toFixed(2)}</dd></div><div><dt>feature tensor / camera</dt><dd>256 × 32 × 88</dd></div><div><dt>spatial sampling</dt><dd>linspace endpoints</dd></div></dl>
    <button className={`inverse-toggle ${skip?'active':''}`} aria-pressed={skip} onClick={()=>setSkip(!skip)}>{skip?'Bug injected: skip inverse crop':'Correct: undo crop before K⁻¹'}</button><code className="image-equation">{skip?'WRONG: K⁻¹ [u_net, v_net, 1]':'u = (u_net + 32) / 0.48\nv = (v_net + 176) / 0.48'}</code><p className={skip?'projection-error':''}>At optical depth 20 m, {skip?`skipping inverse augmentation displaces this ray by ${errorMeters.toFixed(2)} m.`:'the crop-aware ray matches the original-image ray. Coordinate transforms change no physical point.'}</p>
    <details><summary>Why not simply multiply by eight?</summary><p>The feature plane is 8× downsampled, but this implementation places its frustum samples with linspace(0,703,88) and linspace(0,255,32). That is a geometry sampling convention, not a claim that a feature sees only an 8×8 patch. Swin and the feature pyramid build a much larger receptive field.</p></details>
    <p className="source-links"><a href="https://github.com/mit-han-lab/bevfusion/blob/main/mmdet3d/datasets/pipelines/transforms_3d.py" target="_blank" rel="noreferrer">ImageAug3D ↗</a> · <a href="https://github.com/mit-han-lab/bevfusion/blob/main/mmdet3d/models/vtransforms/base.py" target="_blank" rel="noreferrer">create_frustum ↗</a></p>
  </aside></div>;
}
