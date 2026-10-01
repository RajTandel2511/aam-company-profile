/**
 * The small parts of FIG. 01: TDC corners and bolts, S&D slips and drives, the
 * elbow's vane runner and turning vanes (its top cheek drawn removed, as a phantom),
 * and the spot welds that tack the takeoff to the main.
 */
import { easeInOutCubic as io, easeOutCubic, seg } from "@/lib/motion";
import { EYE, add, apply, depth, dot, line, mul, project, pt, steel, unit, type Face, type Group, type Mat, type P2, type Spot, type V3 } from "./FitDuctRunMath";
import { CB, CH, CW, H, HALF, HF, JOG, STEP, W1, X, XA, XB, XC, Y, Z, ZC, ZD, ZT } from "./FitDuctRunParts";

const tw = (p: number, a: number, b: number) => io(seg(p, a, b));
const quad = (ps: V3[]) => ps.map(project);
const path = (ps: P2[]) => `M${ps.map(pt).join("L")}Z`;
const avg = (vs: V3[]) => vs.reduce((s, v) => s + depth(v), 0) / vs.length;

function face(key: string, q: V3[], n: V3, k = 1, ink = true): Face {
  const pts = quad(q);
  const out = dot(n, EYE) >= 0;
  return { key, d: path(pts), fill: steel(out ? n : mul(n, -1), k), solid: ink ? `${path(pts)}` : "", dashed: "", depth: avg(q), out, pts };
}

// ------------------------------------------------------------------- vanes
const A = HALF;
const VANES = 5;
const RV = 0.12; // small vanes: tight radius, single wall ...
const TAIL = 0.07; // ... with a short straight tail each end
const DIAG: V3 = [Math.SQRT1_2, 0, Math.SQRT1_2]; // throat -> heel
const ACROSS: V3 = [Math.SQRT1_2, 0, -Math.SQRT1_2];
/** Chord midpoints sit on the miter line, throat to heel. */
const VANE_AT = Array.from({ length: VANES }, (_, k) => -A + ((k + 0.7) / (VANES + 0.4)) * 2 * A);

/** One turning vane: a quarter-round blade with short straight tails, convex toward the heel. */
function vane(k: number, drop: number): Face[] {
  const m = VANE_AT[k];
  const o: V3 = [m - RV / 2, 0, m - RV / 2]; // arc centre
  const arc = (phi: number): V3 => [o[0] + RV * Math.sin(phi), 0, o[2] + RV * Math.cos(phi)];
  const plan: V3[] = [add(arc(0), [-TAIL, 0, 0]), ...[0, 1, 2, 3, 4].map((i) => arc((i * Math.PI) / 8)), add(arc(Math.PI / 2), [0, 0, -TAIL])];
  const top = plan.map(([x, , z]): V3 => [x, H - 0.02 + drop, z]);
  const facets = plan.slice(1).map((b, i) => {
    const a = plan[i];
    const q: V3[] = [[a[0], 0.01 + drop, a[2]], [b[0], 0.01 + drop, b[2]], top[i + 1], top[i]];
    const n = unit([b[2] - a[2], 0, a[0] - b[0]]);
    const f = face(`vane${k}-${i}`, q, n, 1.1, false);
    const ends = (i === 0 ? line([q[0], q[3]]) : "") + (i === plan.length - 2 ? line([q[1], q[2]]) : "");
    return { ...f, solid: line([q[3], q[2]]) + ends };
  });
  // Light on the rolled top edge, shade down in the channel to the next blade.
  const outline = [...top, ...plan.map(([x, , z]): V3 => [x, 0.01 + drop, z]).reverse()].map(project);
  const sheen: Face = { key: `vane${k}-sheen`, d: path(outline), fill: "url(#fdr-blade)", solid: "", dashed: "", depth: 0, out: true, pts: outline };
  return [...facets.sort((a, b) => a.depth - b.depth), sheen];
}

/** The runner on the bottom cheek, with a slot at every vane. */
function runner(op: number): Face[] {
  if (op <= 0) return [];
  const w = 0.032;
  const e0 = mul(DIAG, -A * Math.SQRT2 + 0.05);
  const e1 = mul(DIAG, A * Math.SQRT2 - 0.05);
  const at = (c: V3, s: number): V3 => add(add([0, 0.004, 0], c), mul(ACROSS, s));
  const f = face("runner", [at(e0, -w), at(e1, -w), at(e1, w), at(e0, w)], Y, 0.74);
  const slots = VANE_AT.map((m) => line([at([m, 0, m], -w * 0.75), at([m, 0, m], w * 0.75)])).join("");
  return [{ ...f, solid: f.solid + slots, depth: -9, op }];
}

export const elbowReveal = (p: number) => tw(p, STEP.window[0], STEP.window[1]);

/**
 * The elbow's own faces, with the runner and the vanes slotted in between its inside and
 * outside surfaces. Once it is built, its top cheek is drawn as a phantom (removed for
 * clarity, the drafting way) so the vanes can be seen.
 */
export function elbowInside(f: number, p: number, faces: Face[]): Face[] {
  // Blades far to near (throat to heel), each one whole before the next.
  const vanes = Array.from({ length: VANES }, (_, k) => {
    const t = easeOutCubic(seg(f, 0.3 + k * 0.035, 0.44 + k * 0.035));
    return t > 0 ? vane(k, (1 - t) * 0.95) : [];
  }).flat();
  const reveal = elbowReveal(p);
  const lift = (x: Face) => (x.key === "elbow-cheekT" && reveal > 0 ? { ...x, reveal } : x);
  return [...faces.filter((x) => !x.out), ...runner(seg(f, 0.12, 0.3)), ...vanes, ...faces.filter((x) => x.out).map(lift)];
}

// ---------------------------------------------------------------- joints
type Frame = { c: V3; a: V3; l: V3; w: number }; // bottom centre, downstream axis, visible side, half-width

/** TDC: corner pieces slide into the open corners of the flanges, a bolt through each. */
function tdcCorners(key: string, J: Frame, t: number, bolts: number): Face[] {
  if (t <= 0) return [];
  const { c, a, l, w } = J;
  const corners: [V3, V3, V3][] = [
    [add(add(c, mul(l, w)), [0, H, 0]), Y, l], // top, visible side
    [add(add(c, mul(l, -w)), [0, H, 0]), Y, mul(l, -1)], // top, far side
    [add(c, mul(l, w)), mul(Y, -1), l], // bottom, visible side
  ];
  return corners.flatMap(([k0, u, v], i) => {
    const slide = mul(add(u, v), 0.14 * (1 - t));
    const at = (s: number, r: number): V3 => add(add(add(add(k0, mul(u, s)), mul(v, r)), slide), mul(a, 0.006));
    const lo = -0.012;
    const hi = HF + 0.014;
    const plate = face(`${key}c${i}`, [at(lo, lo), at(hi, lo), at(hi, hi), at(lo, hi)], a, 1.04);
    if (bolts <= 0) return [{ ...plate, op: t }];
    const r = 0.021 * bolts;
    const ring = Array.from({ length: 10 }, (_, j) => {
      const g = (j / 10) * Math.PI * 2;
      return add(at(HF * 0.55, HF * 0.55), add(add(mul(u, r * Math.cos(g)), mul(v, r * Math.sin(g))), mul(a, 0.008)));
    });
    const bolt = { ...face(`${key}b${i}`, ring, a, 0.62), depth: plate.depth + 0.001 };
    return [{ ...plate, op: t }, bolt];
  });
}

/** S&D: an S-slip across the top (and the bottom, out of sight), drive cleats down the sides, their ends bent over. */
function sd(key: string, J: Frame, t: number): Face[] {
  const { c, a, l, w } = J;
  const out: Face[] = [];
  const at = (s: number, along: number, y: number): V3 => add(add(add(c, mul(l, s)), mul(a, along)), [0, y, 0]);
  const slip = 0.034;
  const slipOp = seg(t, 0, 0.25);
  if (slipOp > 0) {
    const top = face(`${key}s`, [at(-w - 0.018, -slip, H + 0.007), at(w + 0.018, -slip, H + 0.007), at(w + 0.018, slip, H + 0.007), at(-w - 0.018, slip, H + 0.007)], Y, 1.03);
    out.push({ ...top, op: slipOp });
  }
  const drive = easeOutCubic(seg(t, 0.2, 0.75));
  if (drive > 0) {
    const dw = 0.022;
    const lift = (1 - drive) * (H + 0.3);
    const side = face(`${key}d`, [at(w + 0.009, -dw, -0.02 + lift), at(w + 0.009, dw, -0.02 + lift), at(w + 0.009, dw, H + 0.02 + lift), at(w + 0.009, -dw, H + 0.02 + lift)], l, 1);
    out.push({ ...side, op: seg(drive, 0, 0.3) });
  }
  const bend = seg(t, 0.75, 1);
  if (bend > 0) {
    const reach = 0.07 * bend;
    out.push(face(`${key}t1`, [at(w + 0.009, -0.022, H + 0.012), at(w + 0.009, 0.022, H + 0.012), at(w - reach, 0.022, H + 0.012), at(w - reach, -0.022, H + 0.012)], Y, 1));
    out.push(face(`${key}t2`, [at(-w - 0.009, -0.022, H + 0.012), at(-w - 0.009, 0.022, H + 0.012), at(-w + reach, 0.022, H + 0.012), at(-w + reach, -0.022, H + 0.012)], Y, 1));
  }
  return out;
}

export function joints(p: number, off: (k: string) => V3, depthOf: (k: string) => number): Group[] {
  const bolts = (i: number) => tw(p, STEP.bolts[0] + 0.035 + i * 0.006, STEP.bolts[0] + 0.065 + i * 0.006);
  const corner = tw(p, STEP.bolts[0], STEP.bolts[0] + 0.04);
  const drive = (i: number) => seg(p, STEP.drives[0] + i * 0.02, STEP.drives[0] + 0.06 + i * 0.02);
  const J = (c: V3, a: V3, l: V3, w: number, k: string): Frame => ({ c: add(c, off(k)), a, l, w });
  const near = (ks: string[]) => Math.max(...ks.map(depthOf)) + 0.01;
  return [
    { key: "tdc-in", depth: near(["straight"]), faces: tdcCorners("ti", J([XA, 0, 0], mul(X, -1), Z, W1 / 2, "straight"), corner, bolts(0)) },
    { key: "tdc-ab", depth: near(["straight", "reducer"]), faces: tdcCorners("tj", J([XB, 0, 0], X, Z, W1 / 2, "reducer"), corner, bolts(1)) },
    { key: "sd-bc", depth: near(["reducer", "elbow"]), faces: sd("bc", J([XC, 0, 0], X, Z, HALF, "reducer"), drive(0)) },
    { key: "sd-cd", depth: near(["elbow", "offset"]), faces: sd("cd", J([0, 0, ZC], mul(Z, -1), X, HALF, "offset"), drive(1)) },
    { key: "sd-de", depth: near(["offset", "branch"]), faces: sd("de", J([JOG, 0, ZD], mul(Z, -1), X, HALF, "branch"), drive(2)) },
  ];
}

// ------------------------------------------------------------------ welds
const SPOTS: V3[] = [
  ...[0.2, 0.5, 0.8].map((s): V3 => [JOG + CW / 2 + 0.025, H + 0.003, ZT - CB / 2 + s * (CB + CH)]),
  ...[0.3, 0.7].map((s): V3 => [JOG - CW / 2 + s * CW, H + 0.003, ZT + CB / 2 + CH + 0.025]),
];
/** Spot welds along the takeoff's tabs, once it sits on the main: a red flash, then a dark nugget. */
export function welds(m: Mat, p: number): Spot[] {
  return SPOTS.map((v, k) => {
    const [x, y] = project(apply(m, v));
    return { x, y, t: seg(p, STEP.welds[0] + k * 0.01, STEP.welds[0] + 0.022 + k * 0.01) };
  }).filter((s) => s.t > 0);
}
