# BEVFusion — Field Guide

[Read the interactive article](https://hova88.github.io/bevfusion-explained/) · [Vis collection](https://hova88.github.io/vis/)

An all-English, interactive dissection of MIT Han Lab's BEVFusion. Trace one real nuScenes packet—six cameras and 34,688 LiDAR returns—through eight stages: Frame, Image, Lift, Pool, LiDAR, Align, Fuse and Head.

## What is real, and what is illustrative?

- The images, LiDAR sweep, calibration and timestamps are real. Pixel projection, inverse augmentation, lifting, voxel membership and calibration perturbations are computed from those data.
- Pooling, convolution and box decoding use disclosed teaching values. They are not checkpoint activations or predicted boxes.
- The official BEVFusion reel is a separate sequence. The browser does not execute a neural-network checkpoint.

## Develop and verify

Use Node.js 22.13 or newer and pnpm 10.

```sh
pnpm install --frozen-lockfile
pnpm dev:pages
node --experimental-strip-types --test tests/*.test.ts
pnpm exec tsc --noEmit --incremental false
```

## GitHub Pages

```sh
pnpm build:pages
```

This produces a static `out/` directory with `/bevfusion-explained` as its base path. The Pages workflow builds and publishes it on pushes to `main`. No server, API keys or model download is required. The default `pnpm build` retains the original Vinext deployment target.

## Sources and third-party material

- [BEVFusion paper](https://arxiv.org/abs/2205.13542) and [official implementation](https://github.com/mit-han-lab/bevfusion).
- Design references: [PointPillars Explained](https://hova88.github.io/pointpillars-explained/) and [LSS Explained](https://hova88.github.io/lss-explained/).
- Sensor provenance, upstream revision and dataset terms: [PROVENANCE.md](public/nuscenes/calibrated/PROVENANCE.md). Hashes are checked by the sensor tests.
- `public/bevfusion-demo.gif` comes from the official BEVFusion repository and retains its upstream rights. nuScenes data remains subject to the original non-commercial dataset terms. No blanket software license is granted over third-party datasets or media.

See [REVIEW.md](REVIEW.md) for the acceptance checks and the limits of the demonstrations.
