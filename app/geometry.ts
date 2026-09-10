/** Explicit teaching calibration, NOT the calibration of the displayed nuScenes frame.
 * Ego: x forward, y left, z up. Camera: x right, y down, z optical depth.
 * Displayed image coordinates are normalized; no claim about an unavailable crop transform.
 */
export const TEACHING_CAMERA = { fx: 1.2, fy: 1.2, cx: .5, cy: .5, height: 1.5 };
export const DEPTH_BINS = Array.from({ length: 118 }, (_, i) => 1 + i * .5);
export const BEV = { min: -54, max: 54, resolution: .6, size: 180 };

export function projectToBev(camera: { angle: number }, probe: { x: number; y: number }, depth: number, yaw = 0) {
  const right = (probe.x / 100 - TEACHING_CAMERA.cx) * depth / TEACHING_CAMERA.fx;
  const down = (probe.y / 100 - TEACHING_CAMERA.cy) * depth / TEACHING_CAMERA.fy;
  const theta = (camera.angle + yaw) * Math.PI / 180;
  const x = Math.cos(theta) * depth + Math.sin(theta) * right;
  const y = Math.sin(theta) * depth - Math.cos(theta) * right;
  const z = TEACHING_CAMERA.height - down;
  const insideXY = x >= BEV.min && x < BEV.max && y >= BEV.min && y < BEV.max;
  // The camera pooling z bound is [-10, 10), distinct from LiDAR's [-5, 3).
  const inside = insideXY && z >= -10 && z < 10;
  return { x, y, z, inside, cx: inside ? Math.floor((x - BEV.min) / BEV.resolution) : null,
    cy: inside ? Math.floor((y - BEV.min) / BEV.resolution) : null };
}

export function depthProbabilities() {
  const weights = DEPTH_BINS.map(d => .72 * Math.exp(-((d - 24) ** 2) / 32) + .28 * Math.exp(-((d - 12) ** 2) / 12));
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

export function screenPoint(p: { x: number; y: number }, centerX: number, centerY: number, scale: number) {
  return { x: centerX - p.y * scale, y: centerY - p.x * scale };
}
