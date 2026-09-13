'use client';

import { useEffect, useRef, useState } from 'react';
import { POOL_RANKS, POOL_VALUES, poolRank, CAMERA_FIELD, LIDAR_FIELD, CAMERA_KERNEL, LIDAR_KERNEL, fusionAt } from './operators';
import RealScene from './RealScene';
import ImageBranch from './ImageBranch';
import DetectionLab from './DetectionLab';
import TheoryNotes from './TheoryNotes';
import CameraBEVLab from './CameraBEVLab';

type Modality = 'camera' | 'lidar' | 'fusion';
type Stage = {
  n: string; label: string; verb: string; question: string; answer: string;
  input: string; operator: string; output: string; shape: string; assumption: string;
};

const TOKEN = 'ca9a282c9e77460f8360f564131a8af5';
const CANDIDATES = 6 * 118 * 32 * 88;
const validRanks = [3, 4, 7, 9, 11, 14, 17, 21, 23];

const stages: Stage[] = [
  { n: '00', label: 'Frame', verb: 'Sync', question: 'What is the actual input packet?', answer: 'Six camera exposures and one complete LiDAR sweep belong to this real keyframe. Their timestamps differ slightly; the supplied transforms compensate ego motion. The model configuration aggregates the keyframe with nine earlier sweeps; this browser packet contains only the current sweep.', input: '6 RGB + 10 sweeps', operator: 'time + calibration', output: 'registered sensor packet', shape: '6×3×256×704 · N×5', assumption: 'Every sensor must describe the same place at the same time.' },
  { n: '01', label: 'Image', verb: 'Encode', question: 'What does the camera branch retain?', answer: 'A shared Swin-T sees all six views. A generalized feature pyramid combines local detail with larger context, producing one 256-channel plane at one-eighth image resolution per camera.', input: 'perspective RGB', operator: 'Swin-T + FPN', output: 'view features', shape: '6×256×32×88', assumption: 'Camera identity lives in calibration, not in separate backbone weights.' },
  { n: '02', label: 'Lift', verb: 'Lift', question: 'A pixel is a ray. Where on the ray?', answer: 'This detection configuration uses DepthLSS: projected LiDAR depths are encoded and joined with image features before predicting 118 depth probabilities and 80 context channels. Their outer product distributes evidence along each calibrated ray; it is not a single-depth assignment.', input: 'image + sparse depth', operator: 'P(depth) ⊗ context', output: 'frustum samples', shape: '118×80 per feature pixel', assumption: 'The camera-to-BEV branch here is depth-assisted, not purely monocular.' },
  { n: '03', label: 'Pool', verb: 'Reduce', question: 'How do two million samples become cells?', answer: 'Transform samples to metric coordinates, reject out-of-bounds samples, and sort the rest by destination rank. The CUDA kernel sums each occupied cell and channel over its contiguous interval. Pooling at 0.3 m produces a 360×360 grid; learned stride-2 downsampling then yields 180×180.', input: `${CANDIDATES.toLocaleString()} candidates`, operator: 'rank · sum · downsample', output: 'camera BEV', shape: '80×360² → 80×180²', assumption: 'Pooling sums weighted features; it does not average them.' },
  { n: '04', label: 'LiDAR', verb: 'Voxelize', question: 'Why preserve LiDAR as 3D geometry?', answer: 'LiDAR already measures metric position. BEVFusion voxelizes the raw N×5 point set at fine resolution, applies sparse 3D convolutions only where voxels are occupied, and collapses height after geometric encoding.', input: 'raw N×5 points', operator: 'voxelize + SparseEncoder', output: 'LiDAR BEV', shape: '256×180×180', assumption: 'Native LiDAR xyz determines voxel membership; the displayed ego view is only a change of viewing coordinates.' },
  { n: '05', label: 'Align', verb: 'Register', question: 'What does a shared cell guarantee?', answer: 'Camera lifting and LiDAR voxelization must name the same ground patch. This experiment uses the real lidar2cam calibration and measured optical depth. Injected yaw rotates the camera orientation about LiDAR +Z while its center stays fixed. Their channel meanings can remain different; their metric addresses cannot.', input: 'camera BEV + LiDAR BEV', operator: 'shared metric address', output: 'co-registered evidence', shape: '80 + 256 channels', assumption: 'Calibration error moves camera evidence while LiDAR geometry stays fixed.' },
  { n: '06', label: 'Fuse', verb: 'Fuse', question: 'Where does fusion actually happen?', answer: 'The tensors are concatenated, not averaged. A 3×3 ConvFuser learns a local verdict from all 336 input channels and returns 256 channels. SECOND and SECONDFPN then expand spatial context for the task head.', input: '336 aligned channels', operator: '3×3 Conv · BN · ReLU', output: 'task feature', shape: '512×180×180 after decoder', assumption: 'Fusion can absorb small residual error, not a wrong coordinate system.' },
  { n: '07', label: 'Head', verb: 'Decode', question: 'What does the fused field finally answer?', answer: 'The official detection configuration uses TransFusion to decode 3D boxes. A separate map head can predict six semantic layers from the same BEV interface. Shared representation does not mean shared training always helps.', input: 'fused task feature', operator: 'TransFusion / map head', output: 'boxes or masks', shape: 'shared BEV → task outputs', assumption: 'Detection and segmentation results are trained as separate main experiments.' },
];

function TensorContract({ stage }: { stage: Stage }) {
  return <div className="tensor-contract">
    <section><small>INPUT</small><b>{stage.input}</b></section><i>→</i>
    <section><small>OPERATOR</small><b>{stage.operator}</b></section><i>→</i>
    <section><small>OUTPUT</small><b>{stage.output}</b></section>
    <code>{stage.shape}</code>
  </div>;
}

function PoolStage({ rank, setRank }: { rank: number; setRank: (n: number) => void }) {
  const {count,start,values,sum}=poolRank(rank);
  return <div className="pool-stage">
    <div className="pool-memory"><small>28 WEIGHTED VALUES · ONE CHANNEL</small><div className="memory-scroll"><div className="candidate-values">{POOL_RANKS.map((r,i)=><button key={i} aria-label={`Sample ${i}, rank ${r}, value ${POOL_VALUES[i].toFixed(1)}`} onClick={()=>setRank(r)} className={r===rank?'active':''} style={{height:`${POOL_VALUES[i]*160}%`}}><span>{POOL_VALUES[i].toFixed(1)}</span></button>)}</div><div className="rank-values">{POOL_RANKS.map((r,i)=><span key={i} className={r===rank?'active':''}>{r}</span>)}</div></div><p className="pool-equation">{values.map(v=>v.toFixed(1)).join(' + ')} <b>= {sum.toFixed(1)}</b></p><p>Each bar is one p(d) × context contribution. Values with the same destination rank are summed, not averaged.</p></div>
    <div className="pool-grid">{Array.from({length:36},(_,i)=><button key={i} disabled={!validRanks.includes(i)} onClick={()=>setRank(i)} aria-label={`Cell rank ${i}, sum ${poolRank(i).sum.toFixed(1)}`} aria-pressed={i===rank} className={`${i===rank?'active':''} ${validRanks.includes(i)?'occupied':''}`}><small>{i}</small><span>{poolRank(i).sum.toFixed(1)}</span></button>)}<small>6 × 6 TEACHING GRID · SUMS</small></div>
    <aside className="operator-panel"><b>INTERVAL INSPECTOR</b><div className="rank-buttons">{validRanks.map(r=><button key={r} onClick={()=>setRank(r)} className={rank===r?'active':''} aria-pressed={rank===r}>{r}</button>)}</div><dl><div><dt>selected rank</dt><dd>{rank}</dd></div><div><dt>start / length</dt><dd>{start} / {count}</dd></div><div><dt>sum, channel 0</dt><dd>{sum.toFixed(1)}</dd></div><div><dt>CUDA work unit</dt><dd>cell × channel</dd></div></dl><p>Teaching values, not model activations. Unoccupied cells stay zero. The real camera grid pools at 0.3 m, then a stride-2 network produces 0.6 m final cells.</p></aside>
  </div>;
}

function FusionField({ modality, setModality }: { modality: Modality; setModality: (m:Modality)=>void }) {
  const [cell,setCell]=useState(12);
  const result=fusionAt(cell,modality!=='lidar',modality!=='camera');
  const vals=CAMERA_FIELD.map((_,i)=>fusionAt(i,modality!=='lidar',modality!=='camera').output);
  const inputs=[CAMERA_FIELD.map(v=>modality==='lidar'?0:v),LIDAR_FIELD.map(v=>modality==='camera'?0:v)];
  return <div className="fusion-stage">
    <div className="fusion-field"><small>2 INPUT CHANNELS → 1 OUTPUT · TOY WEIGHTS</small><div className="input-tensors">{inputs.map((field,k)=><figure key={k}><figcaption>{k===0?'CAMERA CHANNEL':'LIDAR CHANNEL'}</figcaption><div className="mini-field">{field.map((v,i)=><span key={i} className={Math.abs(Math.floor(i/5)-Math.floor(cell/5))<=1&&Math.abs(i%5-cell%5)<=1?'neighbor':''}>{v.toFixed(2)}</span>)}</div></figure>)}</div><div className="field-grid">{vals.map((v,i)=><button key={i} onClick={()=>setCell(i)} aria-label={`Inspect output row ${Math.floor(i/5)}, column ${i%5}: ${v.toFixed(3)}`} aria-pressed={i===cell} className={i===cell?'focus':''} style={{'--v':Math.min(1,v)} as React.CSSProperties}><span>{v.toFixed(2)}</span></button>)}</div><small>SELECT AN OUTPUT CELL · FIXED 0–1 COLOR SCALE</small></div>
    <div className="kernel-card"><b>3 × 3</b>{[CAMERA_KERNEL,LIDAR_KERNEL].map((kernel,k)=><section key={k}><h4>{k===0?'Camera weights':'LiDAR weights'}</h4><div className="kernel-weights">{kernel.map((v,i)=><span key={i}>{v.toFixed(1)}</span>)}</div></section>)}<span>Zero padding · stride 1</span><em>Actual model: 336 → 256</em></div>
    <aside className="operator-panel"><b>ZERO ONE INPUT · KEEP WEIGHTS FIXED</b><div className="modality-switch">{(['camera','lidar','fusion'] as const).map(m=><button key={m} onClick={()=>setModality(m)} className={modality===m?'active':''} aria-pressed={modality===m}>{m==='fusion'?'both':m}</button>)}</div><dl><div><dt>output [row, col]</dt><dd>[{Math.floor(cell/5)}, {cell%5}]</dd></div><div><dt>Σ camera × weights</dt><dd>{result.cam.toFixed(3)}</dd></div><div><dt>Σ LiDAR × weights</dt><dd>{result.li.toFixed(3)}</dd></div><div><dt>BN: 1.2 × sum − 0.1</dt><dd>{result.preActivation.toFixed(3)}</dd></div><div><dt>ReLU: max(0, BN)</dt><dd>{result.output.toFixed(3)}</dd></div></dl><p>Each output depends on a 3 × 3 neighborhood in both input channels. This is a computed convolution, not a blend of heatmaps. The displayed weights and inference-time BN affine parameters are chosen for teaching—not trained BEVFusion weights.</p></aside>
  </div>;
}

function HeadStage() {
  return <div className="head-stage"><figure><img src={(process.env.NEXT_PUBLIC_BASE_PATH || '')+'/bevfusion-demo.gif'} alt="Official BEVFusion repository demo showing six cameras, LiDAR boxes, and BEV map output" /><figcaption><span>6 CAMERAS</span><span>LIDAR + 3D BOXES</span><span>BEV MAP</span></figcaption></figure><aside className="operator-panel"><b>OFFICIAL REPOSITORY REEL</b><dl><div><dt>left</dt><dd>camera ring</dd></div><div><dt>center</dt><dd>LiDAR + boxes</dd></div><div><dt>right</dt><dd>semantic map</dd></div></dl><p>This supplied demo is a different sequence, not an inference result for the sample above. The browser does not run a BEVFusion checkpoint.</p></aside></div>;
}

function StageSurface(props: { point:number; setPoint:(n:number)=>void; stage: number; selected: string; setSelected:(s:string)=>void; depth:number; setDepth:(n:number)=>void; rank:number; setRank:(n:number)=>void; yaw:number; setYaw:(n:number)=>void; modality:Modality; setModality:(m:Modality)=>void }) {
  const {stage}=props;
  if(stage===0) return <RealScene selected={props.selected} onSelect={props.setSelected} point={props.point} setPoint={props.setPoint}/>;
  if(stage===1) return <ImageBranch selected={props.selected} onSelect={props.setSelected} point={props.point}/>;
  if(stage===2) return <RealScene selected={props.selected} onSelect={props.setSelected} point={props.point} setPoint={props.setPoint} rayMode="lift" depth={props.depth} setDepth={props.setDepth}/>;
  if(stage===3) return <PoolStage rank={props.rank} setRank={props.setRank}/>;
  if(stage===4) return <RealScene selected={props.selected} onSelect={props.setSelected} point={props.point} setPoint={props.setPoint} voxel/>;
  if(stage===5) return <RealScene selected={props.selected} onSelect={props.setSelected} point={props.point} setPoint={props.setPoint} rayMode="align" yaw={props.yaw} setYaw={props.setYaw}/>;
  if(stage===6) return <FusionField modality={props.modality} setModality={props.setModality}/>;
  return <><DetectionLab/><HeadStage/></>;
}

export default function Home() {
  const [point,setPoint]=useState(8564), [stage,setStage]=useState(0), [selected,setSelected]=useState('front');
  const [depth,setDepth]=useState(24);
  const [rank,setRank]=useState(7), [yaw,setYaw]=useState(0), [modality,setModality]=useState<Modality>('fusion');
  const s=stages[stage];
  const firstStage=useRef(true);
  useEffect(()=>{if(firstStage.current){firstStage.current=false;return;}const frame=requestAnimationFrame(()=>{document.querySelector('.stage-heading')?.scrollIntoView({block:'start',behavior:'instant'});document.querySelector('.stage-nav button.active')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});});return()=>cancelAnimationFrame(frame)},[stage]);
  useEffect(()=>{const f=(e:KeyboardEvent)=>{const target=e.target as HTMLElement|null;if(target?.closest('input, select, textarea, summary, button, a, [contenteditable="true"]'))return;if(e.key==='ArrowRight')setStage(v=>Math.min(7,v+1));if(e.key==='ArrowLeft')setStage(v=>Math.max(0,v-1));};addEventListener('keydown',f);return()=>removeEventListener('keydown',f)},[]);

  return <main id="top">
    <header className="site-header"><a href="#top" className="wordmark">BEVFusion <span>/ field guide</span></a><div className="header-meta"><span>nuScenes · {TOKEN.slice(0,8)}</span><a href="#review">THEORY REVIEW ↓</a></div></header>





    <section className="workbench" id="workbench"><div className="section-intro"><span>BEVFUSION / AN OPERATOR FIELD GUIDE</span><p>Real nuScenes inputs. Inspectable teaching computations. Follow the evidence from perspective to bird’s-eye view.</p></div>
      <div className="bench-shell">
        <nav className="stage-nav" aria-label="BEVFusion operators">{stages.map((x,i)=><button key={x.n} className={stage===i?'active':''} onClick={()=>setStage(i)} aria-current={stage===i?'step':undefined}><i>{x.n}</i><span>{x.label}</span><b>{x.verb}</b></button>)}</nav>
        <article className="stage-story" key={stage}><div className="stage-heading"><span>{s.n} / {s.verb}</span><h3>{s.question}</h3><div><p>{s.answer.split('. ')[0]}.</p><details className="stage-rationale"><summary>Mechanism & assumptions</summary><p>{s.answer}</p><small>ASSUMPTION · {s.assumption}</small></details></div></div>
          <StageSurface point={point} setPoint={setPoint} stage={stage} selected={selected} setSelected={setSelected} depth={depth} setDepth={setDepth} rank={rank} setRank={setRank} yaw={yaw} setYaw={setYaw} modality={modality} setModality={setModality}/>
          <TensorContract stage={s}/>
          {(stage===2||stage===3)&&<a className="deep-entry" href="#camera-deep">Go deeper: outer products, memory, interval reduction and gradients ↓</a>}
        </article>
      </div>
    </section>

    <CameraBEVLab point={point} selected={selected}/>

    <section className="review" id="review"><div className="review-title"><span>THEORY REVIEW</span><h2>What BEVFusion<br/>actually contributes.</h2><p>The novelty is not a mystical fusion block. It is a disciplined systems boundary: an optimized camera-to-BEV transform plus a task-agnostic shared-metric interface where mature encoders can meet.</p></div>
      <div className="review-grid"><article><i>01</i><h3>Dense semantics</h3><p>Point-level fusion throws away most image evidence because only projected LiDAR locations are sampled. BEV-level fusion keeps camera semantics dense across the ground plane.</p></article><article><i>02</i><h3>Efficient lifting</h3><p>The paper reports more than 40× lower BEV-pooling latency through precomputed indexing and interval reduction. Do not confuse this systems result with BEVPoolv2: this repository’s DepthLSS code still explicitly forms depth-weighted features.</p></article><article><i>03</i><h3>Clean interface</h3><p>Camera and LiDAR encoders can evolve independently as long as their outputs address the same metric coordinate frame and grid. The BEV becomes a practical software contract.</p></article><article><i>04</i><h3>Real limits</h3><p>Depth smearing, calibration drift, temporal misalignment, memory cost, weather-corrupted sensors, and negative transfer between tasks remain unsolved engineering risks.</p></article></div>
      <TheoryNotes/><div className="metrics"><span>nuScenes validation · official repository</span><div><small>CAMERA</small><b>35.56</b><i>mAP</i></div><em>→</em><div><small>LIDAR</small><b>64.68</b><i>mAP</i></div><em>→</em><div className="accent"><small>FUSION</small><b>68.52</b><i>mAP · 71.38 NDS</i></div></div>
      <p className="evidence-policy"><b>Evidence policy.</b> The Frame and LiDAR stages use six original nuScenes images, 34,688 metric returns, and supplied calibration for one sample. Lift and Align use the same sensor packet and calibrated ray, with a shared selected return across stages. Depth probabilities, pooling values and fusion weights are transparent teaching tensors, not checkpoint activations. The official demo is a different sequence. Sensor provenance and hashes are available with the data.</p>
    </section>

    <footer><div><b>BEVFusion / field guide</b><span>Independent visual explanation · non-commercial educational use.</span></div><nav><a href="https://arxiv.org/abs/2205.13542" target="_blank" rel="noreferrer">PAPER ↗</a><a href="https://github.com/mit-han-lab/bevfusion" target="_blank" rel="noreferrer">CODE ↗</a><a href="https://www.nuscenes.org/" target="_blank" rel="noreferrer">DATA ↗</a></nav></footer>
  </main>;
}
