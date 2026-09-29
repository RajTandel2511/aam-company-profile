/**
 * Flat-pattern engine for the fitting library. A fitting is modelled FOLDED, as
 * flat panels joined in a hinge tree: every child panel shares one edge with its
 * parent. Unfolding turns each child about that edge into its parent's plane, so
 * at fold 0 the whole tree lies on the floor as the fitting's development and at
 * fold 1 it is the fitting. Hinge angles are derived from the folded model, never
 * typed, so the edges always meet. Pure: a frame is a function of (fitting, fold).
 */
import { easeInOutCubic, lerp, seg } from "@/lib/motion";
import { project } from "./FabGeometry";

export type V3 = [number, number, number];
type P2 = readonly [number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => mul(a, 1 / Math.hypot(a[0], a[1], a[2]));
export const mean = (ps: V3[]): V3 => mul(ps.reduce(add, [0, 0, 0]), 1 / ps.length);

/** Rigid motion: row-major rotation `r`, then translation `t`. */
type Rigid = { r: number[]; t: V3 };
const ID: Rigid = { r: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] };
const rot = (r: number[], v: V3): V3 => [
  r[0] * v[0] + r[1] * v[1] + r[2] * v[2],
  r[3] * v[0] + r[4] * v[1] + r[5] * v[2],
  r[6] * v[0] + r[7] * v[1] + r[8] * v[2],
];
const apply = (m: Rigid, v: V3) => add(rot(m.r, v), m.t);
function compose(a: Rigid, b: Rigid): Rigid {
  const r: number[] = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r.push(a.r[i * 3] * b.r[j] + a.r[i * 3 + 1] * b.r[3 + j] + a.r[i * 3 + 2] * b.r[6 + j]);
  return { r, t: apply(a, b.t) };
}
/** Turn by `ang` about the line through `p` along unit `u` (Rodrigues). */
function about(p: V3, [x, y, z]: V3, ang: number): Rigid {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const k = 1 - c;
  const r = [c + x * x * k, x * y * k - z * s, x * z * k + y * s, y * x * k + z * s, c + y * y * k, y * z * k - x * s, z * x * k - y * s, z * y * k + x * s, c + z * z * k];
  return { r, t: sub(p, rot(r, p)) };
}

export type Kind = "panel" | "cheek" | "slat";
export type Spec = {
  pts: V3[]; // outline in the FOLDED fitting
  inside: V3; // any point inside the duct: tells the outer face from the inner
  kind: Kind;
  parent?: number; // index of an earlier spec
  hinge?: [V3, V3]; // the edge shared with the parent
  win?: [number, number]; // when this hinge turns, within fold 0..1
  slide?: V3; // a separate piece: it also slides this far (parent frame) as it lies down
};
export type FittingDef = { name: string; specs: Spec[]; flow: V3[]; inlet: number; outlet: number };

type Panel = Spec & { n: V3; a: V3; u: V3; theta: number; edges: number[] };
export type Fitting = {
  name: string;
  label: string;
  panels: Panel[];
  boxes: number[][];
  flow: { tail: string; inside: string; head: string; tip: string; tailFront: boolean };
};

const VIEW: V3 = [1, 1, 1]; // toward the viewer in project()'s isometric view
const FLAT = 0.12; // rad: a fold reads as a dashed fold line until it has turned this far
const MINOR = (20 * Math.PI) / 180; // smaller turns are roll steps in a curved strip, not folds
const STEPS = 20; // camera keyframes across the fold
const LN = Math.hypot(-0.25, 1, 0.5);
const LIGHT: V3 = [-0.25 / LN, 1 / LN, 0.5 / LN]; // same key light as FabGeometry

/** Galvanized grey from the lit side of a face (FabGeometry's steel); `k` darkens the inside. */
function steel(n: V3, k: number): string {
  const lit = Math.max(0, dot(n, LIGHT));
  const g = 96 + 136 * (0.42 + 0.58 * lit) * k;
  return `rgb(${Math.round(g - 4)} ${Math.round(g - 1)} ${Math.round(g + 3)})`;
}

const pt = ([x, y]: P2) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const near = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-6;

function newell(ps: V3[]): V3 {
  return ps.reduce<V3>((n, p, i) => {
    const q = ps[(i + 1) % ps.length];
    return add(n, [(p[1] - q[1]) * (p[2] + q[2]), (p[2] - q[2]) * (p[0] + q[0]), (p[0] - q[0]) * (p[1] + q[1])]);
  }, [0, 0, 0]);
}

/** Hinge axis and the signed angle that lays a child flat in its parent's plane. */
function hingeOf(sp: Spec, parent: Spec) {
  const [a, b] = sp.hinge!;
  const u = unit(sub(b, a));
  const across = (p: V3) => {
    const v = sub(p, a);
    return unit(sub(v, mul(u, dot(v, u))));
  };
  const dc = across(mean(sp.pts));
  const dp = mul(across(mean(parent.pts)), -1);
  return { a, u, theta: Math.atan2(dot(u, cross(dc, dp)), dot(dc, dp)) };
}

/** World transform of every panel at fold `f`, and how far each hinge has turned. */
function pose(panels: Panel[], f: number) {
  const M: Rigid[] = [];
  const turned: number[] = [];
  panels.forEach((p, i) => {
    if (p.parent === undefined) {
      M.push(ID);
      turned.push(0);
      return;
    }
    const [w0, w1] = p.win ?? [0, 1];
    const h = easeInOutCubic(seg(f, w0, w1));
    const s = 1 - h; // how far this hinge is still unfolded
    const base = p.slide ? compose(M[p.parent], { r: ID.r, t: mul(p.slide, s) }) : M[p.parent];
    M.push(compose(base, about(p.a, p.u, s * p.theta)));
    turned.push(h * Math.abs(p.theta));
  });
  return { M, turned };
}

const worldPts = (panels: Panel[], M: Rigid[]) => panels.map((p, i) => p.pts.map((v) => apply(M[i], v)));

function describe(specs: Spec[], panels: Panel[]): string {
  const count = (k: Kind) => specs.filter((s) => s.kind === k).length;
  const strips = specs.filter((s) => s.kind === "slat" && (s.parent === undefined || specs[s.parent].kind !== "slat")).length;
  const folds = panels.filter((p) => p.parent !== undefined && !p.slide && Math.abs(p.theta) >= MINOR).length;
  const parts: string[] = [];
  if (count("panel")) parts.push(`${count("panel")} panels`);
  if (count("cheek")) parts.push(`${count("cheek")} cheeks`);
  if (strips) parts.push(`${strips} rolled strips`);
  else parts.push(`${folds} folds`);
  return parts.join(" · ");
}

function flowPaths(def: FittingDef) {
  const s = def.flow.map((v) => project(v));
  const line = (a: number, b: number) => `M${s.slice(a, b + 1).map(pt).join("L")}`;
  const tip = s[s.length - 1];
  const prev = s[s.length - 2];
  const len = Math.hypot(tip[0] - prev[0], tip[1] - prev[1]);
  const [ux, uy] = [(tip[0] - prev[0]) / len, (tip[1] - prev[1]) / len];
  const [bx, by] = [tip[0] - ux * 10, tip[1] - uy * 10];
  return {
    tail: line(0, def.inlet),
    inside: line(def.inlet, def.outlet),
    head: line(def.outlet, s.length - 1),
    tip: `M${pt([tip[0] + ux * 3, tip[1] + uy * 3])}L${pt([bx - uy * 5, by + ux * 5])}L${pt([bx + uy * 5, by - ux * 5])}Z`,
    // Air arriving from the viewer's side enters in front of the fitting, not behind it.
    tailFront: dot(sub(def.flow[def.inlet], def.flow[0]), VIEW) < 0,
  };
}

export function prepare(def: FittingDef): Fitting {
  const panels: Panel[] = def.specs.map((sp, i) => {
    const c = mean(sp.pts);
    let n = unit(newell(sp.pts));
    if (dot(n, sub(c, sp.inside)) < 0) n = mul(n, -1);
    if (sp.parent === undefined) return { ...sp, n, a: c, u: [0, 1, 0], theta: 0, edges: [] };
    if (sp.parent >= i || !sp.hinge) throw new Error(`${def.name}: panel ${i} needs an earlier parent and a hinge`);
    return { ...sp, n, ...hingeOf(sp, def.specs[sp.parent]), edges: [] };
  });
  // Tag each outline edge with the hinge it is (a fold line) or -1 (a cut edge / seam).
  panels.forEach((p, i) => {
    p.edges = p.pts.map((v, e) => {
      const w = p.pts[(e + 1) % p.pts.length];
      return panels.findIndex((q, j) => {
        if (!q.hinge || q.slide || (j !== i && q.parent !== i)) return false;
        const [a, b] = q.hinge;
        return (near(a, v) && near(b, w)) || (near(a, w) && near(b, v));
      });
    });
  });
  const flowScreen = def.flow.map((v) => project(v));
  const boxes = Array.from({ length: STEPS + 1 }, (_, k) => {
    const f = k / STEPS;
    const pts: P2[] = worldPts(panels, pose(panels, f).M).flat().map((v) => project(v));
    if (f >= 0.9) pts.push(...flowScreen);
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
  return { name: def.name, label: describe(def.specs, panels), panels, boxes, flow: flowPaths(def) };
}

export type FaceOut = { d: string; solid: string; dashed: string; faint: string; fill: string };

/** Painter-sorted faces at fold `f`: inner faces first (seen through the openings), then outer, each back to front. */
export function faces(fit: Fitting, f: number): FaceOut[] {
  const { M, turned } = pose(fit.panels, f);
  const world = worldPts(fit.panels, M);
  const inside = lerp(1, 0.62, f);
  return fit.panels
    .map((p, i) => {
      const n = rot(M[i].r, p.n);
      const outer = dot(n, VIEW) >= 0;
      const s = world[i].map((v) => project(v));
      const out = { d: `M${s.map(pt).join("L")}Z`, solid: "", dashed: "", faint: "", fill: steel(outer ? n : mul(n, -1), outer ? 1 : inside) };
      p.edges.forEach((j, e) => {
        const edge = `M${pt(s[e])}L${pt(s[(e + 1) % s.length])}`;
        if (j < 0) out.solid += edge;
        else if (Math.abs(fit.panels[j].theta) < MINOR) out.faint += edge;
        else if (turned[j] < FLAT) out.dashed += edge;
        else out.solid += edge;
      });
      return { out, key: (outer ? 1e3 : 0) + dot(mean(world[i]), VIEW) };
    })
    .sort((a, b) => a.key - b.key)
    .map((x) => x.out);
}

/** Camera: frames the drawing tightly at every stage of the fold. */
export function viewBox(fit: Fitting, f: number): string {
  const x = Math.min(1, Math.max(0, f)) * STEPS;
  const k = Math.min(STEPS - 1, Math.floor(x));
  const [x0, y0, x1, y1] = fit.boxes[k].map((v, i) => lerp(v, fit.boxes[k + 1][i], x - k));
  const pad = 0.07 * Math.max(x1 - x0, y1 - y0);
  return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].map((v) => v.toFixed(1)).join(" ");
}
