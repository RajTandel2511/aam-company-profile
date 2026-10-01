/**
 * Vectors, rigid transforms and drawing helpers for FIG. 01 (the duct run).
 * Same isometric projection and galvanized shading as the page's other figures:
 * y up, the shop floor at y = 0; +x runs down-right on the page, +z down-left.
 */
export type V3 = readonly [number, number, number];
export type P2 = readonly [number, number];
/** Rigid transform, row-major 3×4 (rotation | translation). */
export type Mat = readonly number[];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => mul(a, 1 / len(a));
/** Component of v square to the unit axis e. */
export const perp = (v: V3, e: V3): V3 => sub(v, mul(e, dot(v, e)));

export const apply = (m: Mat, [x, y, z]: V3): V3 => [
  m[0] * x + m[1] * y + m[2] * z + m[3],
  m[4] * x + m[5] * y + m[6] * z + m[7],
  m[8] * x + m[9] * y + m[10] * z + m[11],
];
/** A direction through m (no translation). */
export const turn = (m: Mat, [x, y, z]: V3): V3 => [
  m[0] * x + m[1] * y + m[2] * z,
  m[4] * x + m[5] * y + m[6] * z,
  m[8] * x + m[9] * y + m[10] * z,
];
/** a ∘ b: apply b, then a. */
export function then(a: Mat, b: Mat): Mat {
  const out: number[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      out.push(a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c] + (c === 3 ? a[r * 4 + 3] : 0));
    }
  }
  return out;
}
export const shift = ([x, y, z]: V3): Mat => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
/** Rotation by `ang` (right hand) about the line through p along the unit axis e. */
export function spin(p: V3, e: V3, ang: number): Mat {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const k = 1 - c;
  const [x, y, z] = e;
  const r = [c + x * x * k, x * y * k - z * s, x * z * k + y * s, y * x * k + z * s, c + y * y * k, y * z * k - x * s, z * x * k - y * s, z * y * k + x * s, c + z * z * k];
  const t = (i: number) => p[i] - (r[i * 3] * p[0] + r[i * 3 + 1] * p[1] + r[i * 3 + 2] * p[2]);
  return [r[0], r[1], r[2], t(0), r[3], r[4], r[5], t(1), r[6], r[7], r[8], t(2)];
}

const PX = 74; // frame units per model unit
const COS30 = Math.cos(Math.PI / 6);
export const EYE: V3 = [1, 1, 1]; // toward the viewer; larger x + y + z paints later
export const project = ([x, y, z]: V3): P2 => [(x - z) * COS30 * PX, ((x + z) * 0.5 - y) * PX];
export const depth = (v: V3) => v[0] + v[1] + v[2];
export const pt = ([x, y]: P2) => `${x.toFixed(1)} ${y.toFixed(1)}`;
export const line = (ps: V3[]) => `M${ps.map((v) => pt(project(v))).join("L")}`;

const nl = Math.hypot(-0.25, 1, 0.5);
const LIGHT: V3 = [-0.25 / nl, 1 / nl, 0.5 / nl];
const SHEEN = unit(add(LIGHT, [0.577, 0.577, 0.577]));

/** Galvanized grey from the lit side of a face, plus a soft sheen; `k` darkens surfaces inside the duct. */
export function steel(n: V3, k: number): string {
  const lit = Math.max(0, dot(n, LIGHT));
  const sheen = Math.pow(Math.max(0, dot(n, SHEEN)), 7);
  const g = Math.min(244, 100 + 128 * (0.45 + 0.55 * lit) * k + 26 * sheen * k);
  return `rgb(${Math.round(g - 4)} ${Math.round(g - 1)} ${Math.round(g + 3)})`;
}

/** Where a point's shadow falls on the floor: cast along the light, kept short (a contact shadow). */
const REACH = 0.4;
export const onFloor = ([x, y, z]: V3): V3 => [x - (REACH * LIGHT[0] * y) / LIGHT[1], 0, z - (REACH * LIGHT[2] * y) / LIGHT[1]];

/** One flat polygon, ready to paint. */
export type Face = {
  key: string;
  d: string;
  fill: string;
  solid: string; // ink: cut edges, and bend lines once folded
  dashed: string; // ink: bend lines while still flat
  depth: number;
  out: boolean; // its outer surface is the one in view
  pts: P2[];
  hole?: string; // a cut-away window ...
  reveal?: number; // ... and how far it is cut
  op?: number;
};
/** A spot weld on the page, t: 0 → 1 through its flash. */
export type Spot = { x: number; y: number; t: number };
/** A Pittsburgh lock on the page: the corner, the pocket's folded lip beside it (band, inner edge), closed to t. */
export type SeamDraw = { line: string; inset: string; band: string; t: number };
/** Paint unit: a piece, or a joint's hardware, with everything that rides on it. */
export type Group = { key: string; depth: number; faces: Face[]; seam?: SeamDraw; spots?: Spot[] };

/** Signed-area-normalised outline, so a union of shapes fills with the nonzero rule. */
export function ccw(ps: P2[]): string {
  let area = 0;
  ps.forEach(([x, y], n) => {
    const [x2, y2] = ps[(n + 1) % ps.length];
    area += x * y2 - x2 * y;
  });
  return `M${(area < 0 ? [...ps].reverse() : ps).map(pt).join("L")}Z`;
}
