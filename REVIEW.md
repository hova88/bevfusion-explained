# Completion audit — 2026-09-10

## Camera-to-BEV expansion — 2026-09-13

- Added four deep-dive panels based on the supplied detailed LSS/pooling explanation, checked against official LSS, DepthLSS, BaseTransform, pooling wrapper, CUDA kernel and segmentation configuration sources.
- Outer-product values conserve signed context; softmax-logit gradients match finite differences. Batch-aware sorting rejects the invalid record and prevents cross-batch sums. Memory estimates distinguish points, scalars and storage bytes.
- Explicitly separate geometric addresses from grouping ranks and CUDA offsets, strict metric bounds from truncation behavior, and the segmentation LSSTransform contract from the detection DepthLSSTransform contract.
- Mobile and desktop browser checks cover all four panels, probability edits, calibrated address selection, precision changes, sorting, batch splitting, backward gradients, height concatenation, cache invalidation and configuration comparison. No overflow or page errors observed at 390 and 1440 px.
- Existing eight-stage real-sensor workbench remains intact; the additional lab shares its selected return and camera. No new checkpoint or latency claims.

The implementation and local acceptance review are complete. Publication is tracked separately; earlier publication alone is not evidence of correctness.

## Verified in this revision

- Pure geometry tests cover ego x-forward/y-left convention, image-right direction, camera yaw, screen mapping, z from vertical pixel position, half-open bounds, rejection instead of clamping, and 118 normalized depth probabilities.
- Lift cursor chooses a fixed probability bin instead of moving a purported predicted distribution.
- Browser range control at 59.5 m reports “Outside pooling bounds”; it does not fabricate a border-cell address.
- Camera fan and points now use the same projected coordinate function.
- Canvas redraws on resize. Font variables have valid fallbacks.
- Type checking found four invalid setter calls previously missed by build-only validation; corrected.
- Pooling now displays actual weighted sample values, interval start/length, and destination sums; tests confirm conservation and empty-cell zeros.
- Fusion now computes two-channel 3×3 convolution, fixed inference BN affine transform, and ReLU. Inspecting a cell highlights its input neighborhood; ablation zeroes one input without changing weights. Tests cover boundaries and exact values.
- Official DepthLSS and CUDA source checked: corrected sparse LiDAR depth assistance, raw 360² vs final 180² grid, and cell-channel work unit. Removed inaccurate no-frustum-materialization claim.
- Removed the long hero and duplicate premise. The operator workbench is now the opening experience; stage navigation stays accessible. Removed decorative noise and transition fading.
- Removed fictional feature heat spots; diagram explicitly discloses preview-vs-model-crop distinction. Probe supports keyboard arrows.
- Official reel now explicitly says different sequence, not inference for the inspected sample.

## Sensor, algorithm and theory review

- Completed sensor-packet replacement: six original 1600×900 images, 34,688 raw LiDAR returns, intrinsics, pose-compensated lidar2cam, lidar2ego and timestamps. All seven assets hash-verified against the reference provenance. Same-return projection is now inspectable in Frame and LiDAR.
- Completed actual sparse voxel membership: native LiDAR coordinates, configurable XY resolution, fixed 0.2 m Z, cell indices, member count, total occupied voxels, a local XY inset, and real cell boundary. Tests confirm bounds and retention conservation. Browser verified selected return #8564 projects to front pixel (797.7, 586.0), depth 18.53 m; changing XY from 0.075 to 0.6 m changes membership from 1 to 6 and occupied count from 17,508 to 4,740.
- Completed calibrated Lift/Align: selected return is shared across Frame/Lift/LiDAR/Align. Inverse rigid transform and original-image intrinsics recover real returns; yaw is injected about native LiDAR +Z at fixed camera center. Tests cover 100 visible returns per camera, camera-center invariance, exact yaw chord displacement, and camera pooling bounds distinct from voxel bounds. Browser: record #8564 at 5° shifts 1.619 m; 0° restores 0.000 m displayed error; nearest 18.5 m bin differs by 0.031 m from the 18.531 m measurement. Depth probabilities remain explicitly synthetic teaching values.
- Removed the unused teaching-camera stages and fictional voxel component from page source.
- Completed validation crop geometry: .48 resize, 768×432 intermediate, crop [32,176,736,432] -> 704×256. Original and crop displays share an exact marker. Frustum sampling uses endpoint-inclusive 88×32 linspace rather than a false index×8 shortcut. Tests exhaustively cover all 2,816 mappings and inverses. UI bug-injection example at feature [13,43], depth 20 m gives 10.35 m displacement when inverse augmentation is skipped. Displayed RGB uses browser resampling and is not claimed bit-identical to PIL normalization; no backbone activations are claimed.
- Fixed a browser-observed ResizeObserver/unmount race by capturing canvas elements and ignoring detached surfaces.
- Completed detection-head study: one-class peak suppression vs raw top-2, selectable queries, query-center + offset conversion at 0.6 m/cell, exponential dimensions, atan2 yaw, gravity-center to bottom-center conversion, footprint over real native LiDAR and a vertical extent inset. Learned attention is explained but not impersonated by fake outputs. Teaching heatmap/box controls are explicitly distinguished from real inference. Unit tests cover peaks, coordinates, dimensions, yaw and Z conversion. Official demo remains separate.
- Added theory notes defining the chosen implementation, feature fusion vs probabilities, training-only assignment/losses, the independent sigmoid map head, practical failure modes, and metric interpretation with source links.
- Browser regression at 847 px width: all eight stages and repeated Frame/Head switching had no page overflow or visible runtime error after canvas cleanup fix. This is not mobile QA.
- Refined stage density: one-sentence premise, expandable mechanism/assumptions, immediate workbench, restrained paper/ink/orange visual system. Stage navigation scrolls the heading below the sticky bar without an initial page jump.
- Responsive acceptance: all eight stages at 320, 390, 768 and 1440 px. Automated checks find no horizontal overflow, clipped controls/canvases, obscured heading, visible leaf text smaller than 12 px, missing images or runtime exceptions. Representative screenshots checked for actual layout, crop alignment and density. On mobile the fusion channels stack instead of squeezing numerical values.
- Browser interaction acceptance at 390 and 1440 px: all six camera selectors, shared-return keyboard selection, crop keyboard selection and inverse-augmentation bug toggle, depth endpoints and measured-bin reset, every pooling rank, voxel-size membership update, yaw perturbation/reset, all fusion ablations and a boundary output, peak suppression/query selection, center/yaw decoding controls, and repeated canvas mount/unmount. Both runs pass with no page errors. Reproducible scripts: tests/browser-audit.mjs and tests/interaction-audit.mjs.
- Final visual/computation consistency fix: an ablated fusion input now displays zeros in its input tensor, matching the convolution contribution and output. Browser regression checks every displayed value of each disabled channel.
- Source review covers the selected MIT implementation's image augmentation, depth-assisted lifting, native-frame pooling, sparse LiDAR branch, ConvFuser, TransFusion decoding, training losses and independent sigmoid map head. The teaching tensors are not checkpoint activations; the official demo is explicitly a separate sequence.

## Scope and acceptance boundary

The requested all-English interactive article is implemented end to end. It traces a real nuScenes sensor packet through geometric operations, uses computed and disclosed teaching tensors where neural activations are unavailable, and includes an official inference reel plus primary-source theory notes. It does not execute a BEVFusion checkpoint in the browser, claim teaching boxes are detections, or claim real-time neural inference. The 17 unit tests verify numerical contracts and sensor provenance; browser checks verify their interactive presentation. These are targeted acceptance checks, not a claim that every possible browser/device state is exhaustively proven.
