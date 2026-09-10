# Calibrated sensor packet

nuScenes v1.0-mini sample `ca9a282c9e77460f8360f564131a8af5`.

The six original 1600×900 JPEGs and 34,688-record LiDAR binary are mirrored from the user-provided reference repository:
https://github.com/hova88/lss-explained/tree/main/public/data

That repository records the upstream source as OpenMMLab MMDetection3D commit `fe25f7a51d36e3702f961e198894580d83c4387b`, directory `demo/data/nuscenes`. Per-file SHA-256 values are retained in `rig.json` and checked in `tests/sensors.test.ts`.

`rig.json` contains exported camera intrinsics, pose-compensated lidar2cam transforms, lidar2ego, sensor timestamps, and source metadata. Only those sensor fields are consumed here. Its LSS grid, network preprocessing, annotations and model-related hashes are NOT BEVFusion configuration or outputs and are not used to construct BEVFusion predictions.

Raw binary format: little-endian float32 records `[x,y,z,intensity,ring]` in LIDAR_TOP coordinates. The browser uses one complete sweep. A multi-sweep detector input uses a time-lag feature instead of the raw ring field. Voxel membership uses the BEVFusion detector's native LiDAR range and voxel size, before point-count and voxel-count caps.

The overview renders points in ego coordinates for orientation. Projection uses the supplied lidar2cam matrix directly, not cam2ego composed as though sensor exposures were simultaneous. Static-scene pose compensation does not remove motion of other objects.

nuScenes data remains subject to its original non-commercial dataset terms: https://www.nuscenes.org/terms-of-use

No LSS checkpoint activations are reused. No BEVFusion checkpoint is executed by this page.
