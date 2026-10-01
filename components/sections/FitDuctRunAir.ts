/**
 * Air through FIG. 01, and the camera that frames it.
 *
 * Three streams enter the straight, squeeze through the reducer, turn on the
 * vanes (each turns where it meets the miter, on a vane's own small radius), jog
 * through the offset and, the main being capped, all rise up the 45° takeoff —
 * blue in the main, green in the branch.
 */
import { lerp, seg } from "@/lib/motion";
import { project, pt, type P2, type V3 } from "./FitDuctRunMath";
import { CB, CH, H, HALF, JOG, W1, WC, XA, XB, XC, ZC, ZD, ZT } from "./FitDuctRunParts";

const LANES = [-1, 0, 1];
const MID = H * 0.5;
const SPREAD = 0.5; // of the half-width
const RV = 0.13; // turn radius on the vanes
const LEAD = 0.75; // stream length outside the inlet
const RISE = 1.2; // plume above the collar

export type Stream = { inlet: string; inside: string; branch: string; plume: string; lens: number[]; headIn: string; headOut: string };

const line = (ps: P2[]) => `M${ps.map(pt).join("L")}`;
const length = (ps: P2[]) => ps.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - ps[i][0], q[1] - ps[i][1]), 0);
const range = (n: number, f: (t: number) => V3): V3[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

/** A filled arrowhead at `tip`, pointing along from → tip. */
function head(from: P2, tip: P2, size: number): string {
  const l = Math.hypot(tip[0] - from[0], tip[1] - from[1]) || 1;
  const [ux, uy] = [(tip[0] - from[0]) / l, (tip[1] - from[1]) / l];
  const [bx, by] = [tip[0] - ux * size * 1.9, tip[1] - uy * size * 1.9];
  return `M${pt(tip)}L${pt([bx - uy * size, by + ux * size])}L${pt([bx + uy * size, by - ux * size])}Z`;
}

function stream(u: number, k: number): Stream {
  const z0 = u * (W1 / 2) * SPREAD; // across the main
  const z1 = u * (WC / 2) * SPREAD; // across the reduced run
  const inlet = range(4, (t): V3 => [XA - LEAD + LEAD * t, MID, z0]);
  const main = range(8, (t): V3 => [lerp(XA, XB, t), MID, z0]);
  const reduce = range(8, (t): V3 => [lerp(XB, XC, t), MID, lerp(z0, z1, t)]);
  // Elbow: straight to the miter, a vane's quarter turn, straight out.
  const turnAt = z1 - RV;
  const toVane = range(4, (t): V3 => [lerp(XC, turnAt, t), MID, z1]);
  const vane = range(8, (t): V3 => [turnAt + RV * Math.sin((t * Math.PI) / 2), MID, z1 - RV + RV * Math.cos((t * Math.PI) / 2)]);
  const fromVane = range(4, (t): V3 => [z1, MID, lerp(z1 - RV, ZC, t)]);
  const jog = range(8, (t): V3 => [z1 + JOG * t, MID, lerp(ZC, ZD, t)]);
  // Branch: on along the main, then up through the collar; the far lane turns up last.
  const x = z1 + JOG;
  const xo = JOG + u * 0.13;
  const zTurn = ZT + CB / 2 + CH * 0.7 - (1 - u) * 0.14;
  const run = range(6, (t): V3 => [x, MID, lerp(ZD, zTurn, t)]);
  const R = H + CH - MID;
  const up = range(12, (t): V3 => {
    const a = (t * Math.PI) / 2;
    return [lerp(x, xo, t), MID + R * (1 - Math.cos(a)), zTurn - (zTurn - ZT + u * CB * 0.2) * Math.sin(a)];
  });
  const top = up[up.length - 1];
  const plume = range(6, (t): V3 => [top[0] + u * 0.05 * t * t, top[1] + RISE * t * (1 - 0.1 * Math.abs(u)), top[2]]);
  const P = (vs: V3[]) => vs.map(project);
  const inside = P([...main, ...reduce.slice(1), ...toVane.slice(1), ...vane.slice(1), ...fromVane.slice(1), ...jog.slice(1), ...run.slice(1)]);
  const branch = P(up);
  const [a, b, c, d] = [P(inlet), inside, branch, P(plume)];
  const big = k === 1;
  return {
    inlet: line(a),
    inside: line(b),
    branch: line(c),
    plume: line(d),
    lens: [a, b, c, d].map(length),
    headIn: head(project([XA - LEAD * 0.5, MID, z0]), project([XA - LEAD * 0.42, MID, z0]), big ? 5 : 3.6),
    headOut: head(d[d.length - 2], d[d.length - 1], big ? 6 : 4.2),
  };
}

export const STREAMS = LANES.map(stream);

/** How much of each piece of a stream is drawn when a fraction `r` of the whole has run in. */
export function reveal(st: Stream, r: number): number[] {
  const total = st.lens.reduce((s, l) => s + l, 0);
  let at = 0;
  return st.lens.map((l) => {
    const t = seg(r * total, at, at + l);
    at += l;
    return t;
  });
}

// ---------------------------------------------------------------- camera
/**
 * The frame: wide enough for the flat layout, then it closes in on the formed run during
 * SEAM. Measured so that every face, shadow, stream and callout stays inside it at every p;
 * re-measure if the geometry or the timeline changes.
 */
export const ASPECT = 1.5;
const WIDE = { x: -220, y: -214, w: 467 };
const TIGHT = { x: -180, y: -221, w: 400 };
const ZOOM = [0.4, 0.54] as const;
export function frame(p: number) {
  const t = seg(p, ZOOM[0], ZOOM[1]);
  const k = t * t * (3 - 2 * t);
  const w = lerp(WIDE.w, TIGHT.w, k);
  return { x: lerp(WIDE.x, TIGHT.x, k), y: lerp(WIDE.y, TIGHT.y, k), w, h: w / ASPECT };
}
