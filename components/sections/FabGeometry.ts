/**
 * Isometric model of a one-piece rectangular duct wrap. A flat galvanized strip
 * — [seam lap | left side | BOTTOM | right side | top] — folds up about its bend
 * lines: the bottom stays put, the right chain turns counter-clockwise and the
 * left chain clockwise, each panel rotating about the line it shares with the
 * one before it. Every face is extruded along z, projected isometrically and
 * painter-sorted. Pure: the whole scene is a function of (fold, join) in 0..1.
 */
import { easeInOutCubic, easeOutCubic, lerp, seg } from "@/lib/motion";

type P2 = readonly [number, number];
type P3 = readonly [number, number, number];

const W = 1.5; // duct width
const H = 0.95; // duct height
const L = 2.2; // section length, along z
const LAP = 0.16; // seam lap that closes the wrap
const T = 0.03; // left side runs a sheet higher so the lap rests on the top
const RIM = 0.12; // transverse joint flange
const GAP = 0.03; // gasket between the two flanges
const SLIDE = 0.9; // travel of the second section into the joint
const PX = 62; // px per model unit
const FLAT = 0.12; // rad: a bend line reads as a dashed fold line until it turns this far
const COS30 = Math.cos(Math.PI / 6);
const HALF_PI = Math.PI / 2;

const n3len = Math.hypot(-0.25, 1, 0.5);
const LIGHT: P3 = [-0.25 / n3len, 1 / n3len, 0.5 / n3len];

export const project = ([x, y, z]: P3): P2 => [(x - z) * COS30 * PX, ((x + z) * 0.5 - y) * PX];
const pt = ([x, y]: P2) => `${x.toFixed(1)} ${y.toFixed(1)}`;

export type Face = {
  key: string;
  d: string; // fill outline
  solid: string; // hard edges
  dashed: string; // bend lines still flat
  fill: string;
  depth: number; // toward the viewer along (1,1,1); larger draws later
  pts: P2[];
};

type Panel = { p: P2; q: P2; n: P2; dashP: boolean; dashQ: boolean };

/** Galvanized grey from the lit side of a face; `k` darkens the inside of the duct. */
function steel(n: P3, k: number): string {
  const lit = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
  const g = 96 + 136 * (0.42 + 0.58 * lit) * k;
  return `rgb(${Math.round(g - 4)} ${Math.round(g - 1)} ${Math.round(g + 3)})`;
}

const step = (p: P2, a: number, len: number): P2 => [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len];

/** Cross-section chain for fold angles (rad) of right side, top, left side and lap. */
function crossSection(r: number, top: number, left: number, lap: number): Panel[] {
  const a1 = r;
  const q1 = step([W, 0], a1, H);
  const a2 = a1 + top;
  const q2 = step(q1, a2, W);
  const b1 = Math.PI - left;
  const q3 = step([0, 0], b1, H + T);
  const b2 = b1 - lap;
  const q4 = step(q3, b2, LAP);
  // Outward normal: right-hand side of travel on the CCW chain, left-hand on the CW chain.
  const rn = (a: number): P2 => [Math.sin(a), -Math.cos(a)];
  const ln = (a: number): P2 => [-Math.sin(a), Math.cos(a)];
  return [
    { p: [0, 0], q: [W, 0], n: [0, -1], dashP: left < FLAT, dashQ: r < FLAT },
    { p: [W, 0], q: q1, n: rn(a1), dashP: r < FLAT, dashQ: top < FLAT },
    { p: q1, q: q2, n: rn(a2), dashP: top < FLAT, dashQ: false },
    { p: [0, 0], q: q3, n: ln(b1), dashP: left < FLAT, dashQ: lap < FLAT },
    { p: q3, q: q4, n: ln(b2), dashP: lap < FLAT, dashQ: false },
  ];
}

function extrude(panels: Panel[], z0: number, z1: number, inside: number, tag: string): Face[] {
  return panels
    .map((pn, i) => {
      const facing = pn.n[0] + pn.n[1] >= 0; // outward normal · view (1,1,1)
      const n: P3 = facing ? [pn.n[0], pn.n[1], 0] : [-pn.n[0], -pn.n[1], 0];
      const a = project([pn.p[0], pn.p[1], z0]);
      const b = project([pn.q[0], pn.q[1], z0]);
      const c = project([pn.q[0], pn.q[1], z1]);
      const d = project([pn.p[0], pn.p[1], z1]);
      const edgeP = `M${pt(d)}L${pt(a)}`;
      const edgeQ = `M${pt(b)}L${pt(c)}`;
      return {
        key: `${tag}${i}`,
        d: `M${pt(a)}L${pt(b)}L${pt(c)}L${pt(d)}Z`,
        solid: `M${pt(a)}L${pt(b)}M${pt(c)}L${pt(d)}${pn.dashP ? "" : edgeP}${pn.dashQ ? "" : edgeQ}`,
        dashed: `${pn.dashP ? edgeP : ""}${pn.dashQ ? edgeQ : ""}`,
        fill: steel(n, facing ? 1 : inside),
        depth: (pn.p[0] + pn.q[0]) / 2 + (pn.p[1] + pn.q[1]) / 2 + (z0 + z1) / 2,
        pts: [a, b, c, d],
      };
    })
    .sort((f, g) => f.depth - g.depth);
}

/** Transverse flange frame around the duct end at z, standing out by `rim`. */
function ring(z: number, rim: number, tag: string): Face {
  const top = H + T;
  const outer = [[-rim, -rim], [W + rim, -rim], [W + rim, top + rim], [-rim, top + rim]] as const;
  const inner = [[0, 0], [W, 0], [W, top], [0, top]] as const;
  const loop = (q: readonly (readonly [number, number])[]) =>
    `M${q.map(([x, y]) => pt(project([x, y, z]))).join("L")}Z`;
  const d = loop(outer) + loop(inner);
  return {
    key: tag,
    d,
    solid: d,
    dashed: "",
    fill: steel([0, 0, 1], 1),
    depth: 0,
    pts: outer.map(([x, y]) => project([x, y, z])),
  };
}

export type Scene = {
  first: Face[]; // the section that folds, back flange first
  second: Face[]; // the section that slides in (behind), empty until it appears
  secondOpacity: number;
  bolts: P2[];
  boltOpacity: number;
  bends: number; // total bend so far, degrees (0..360)
};

export function scene(fold: number, join: number): Scene {
  const r = HALF_PI * easeInOutCubic(seg(fold, 0, 0.32));
  const left = HALF_PI * easeInOutCubic(seg(fold, 0.16, 0.48));
  const top = HALF_PI * easeInOutCubic(seg(fold, 0.42, 0.78));
  const lap = HALF_PI * easeInOutCubic(seg(fold, 0.74, 1));
  const inside = lerp(1, 0.62, fold);

  const grow = easeOutCubic(seg(join, 0, 0.35));
  const slide = easeOutCubic(seg(join, 0.15, 0.85));
  const firstRing = grow > 0 ? [ring(0, RIM * grow, "ra")] : [];
  const first = [...firstRing, ...extrude(crossSection(r, top, left, lap), 0, L, inside, "a")];

  let second: Face[] = [];
  if (join > 0.15) {
    const zf = -GAP - SLIDE * (1 - slide); // front face of the second section
    const done = crossSection(HALF_PI, HALF_PI, HALF_PI, HALF_PI);
    second = [...extrude(done, zf - L, zf, 0.62, "b"), ring(zf, RIM, "rb")];
  }

  const top1 = H + T + RIM / 2;
  const bolts = [
    project([-RIM / 2, top1, 0]),
    project([W + RIM / 2, top1, 0]),
    project([W + RIM / 2, -RIM / 2, 0]),
  ];
  return {
    first,
    second,
    secondOpacity: seg(join, 0.15, 0.4),
    bolts,
    boltOpacity: seg(join, 0.85, 1),
    bends: Math.round(((r + top + left + lap) * 180) / Math.PI),
  };
}

/** Airflow centreline: drops in behind the second section, runs through the joined pair, lifts out the front. */
function streamPoints(): P2[] {
  const zBack = -(2 * L + GAP);
  const z0 = zBack - 1.0;
  const z1 = L + 1.1;
  const out: P2[] = [];
  for (let i = 0; i <= 48; i++) {
    const z = lerp(z0, z1, i / 48);
    const off = z < zBack ? 0.4 * ((zBack - z) / 1.0) ** 2 : z > L ? 0.3 * ((z - L) / 1.1) ** 2 : 0;
    out.push(project([W / 2, (H + T) / 2 + off, z]));
  }
  return out;
}

const STREAM = streamPoints();
export const STREAM_D = `M${STREAM.map(pt).join("L")}`;

function arrowHead(): string {
  const tip = STREAM[STREAM.length - 1];
  const prev = STREAM[STREAM.length - 3];
  const len = Math.hypot(tip[0] - prev[0], tip[1] - prev[1]);
  const ux = (tip[0] - prev[0]) / len;
  const uy = (tip[1] - prev[1]) / len;
  const bx = tip[0] - ux * 12;
  const by = tip[1] - uy * 12;
  return `M${pt([tip[0] + ux * 4, tip[1] + uy * 4])}L${pt([bx - uy * 6, by + ux * 6])}L${pt([bx + uy * 6, by - ux * 6])}Z`;
}
export const STREAM_HEAD = arrowHead();

/** One fixed frame that holds the flat strip, the second section's run-in and the stream. */
function frame() {
  const pts: P2[] = [...STREAM];
  for (const s of [scene(0, 0), scene(1, 0.16), scene(1, 1)]) {
    for (const f of [...s.first, ...s.second]) pts.push(...f.pts);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const pad = 16;
  const x = Math.floor(Math.min(...xs) - pad);
  const y = Math.floor(Math.min(...ys) - pad);
  return { x, y, width: Math.ceil(Math.max(...xs) + pad - x), height: Math.ceil(Math.max(...ys) + pad - y) };
}
export const VIEW = frame();
export const VIEWBOX = `${VIEW.x} ${VIEW.y} ${VIEW.width} ${VIEW.height}`;
