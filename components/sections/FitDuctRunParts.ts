/**
 * The pieces of FIG. 01, a duct run as AAM's shop builds it — rectangular duct only.
 *
 * Every piece is rigid panels joined along straight hinges: brake bends, or the
 * Pittsburgh seams that join a separate part. Each panel is given where it ends up
 * (formed, assembled, world units); its fold angle and its place in the flat blank
 * come from unfolding that geometry about the hinges, so the layout is the true
 * development and the metal never stretches while it forms.
 *
 * The run: a straight (TDC both ends) → a reducer → a square elbow with turning
 * vanes → an offset → a straight carrying a 45° takeoff → an end cap. Air comes in
 * along +x, the elbow turns it to −z.
 */
import { add, cross, dot, len, mul, perp, spin, sub, turn, unit, type V3 } from "./FitDuctRunMath";

export const H = 0.6; // duct depth, every piece
export const W1 = 0.9; // main width
export const WC = 0.6; // width after the reducer
export const HALF = WC / 2; // half the elbow
const LA = 0.9;
const LB = 0.5;
const LD = 0.62;
const LE = 1;
export const JOG = 0.42; // the offset's jog, along +x
export const GAP = 0.22; // clearance at each joint until CONNECT closes it (room for two TDC flanges, flat)
export const HF = 0.075; // TDC flange
const HR = 0.03; // TDC flange return
export const CW = 0.42; // takeoff collar: across the main
export const CB = 0.26; // along the main, at the top
export const CH = 0.32; // height; the upstream wall leans in at 45° over all of it
const TAB = 0.05; // collar tabs on the main
const FC = 0.07; // end-cap flange
const DEL = 0.012; // clearance for parts that wrap the outside of a duct

export const X: V3 = [1, 0, 0];
export const Y: V3 = [0, 1, 0];
export const Z: V3 = [0, 0, 1];
const NX: V3 = [-1, 0, 0];
const NZ: V3 = [0, 0, -1];

// ------------------------------------------------------------------ stations
export const XC = -HALF; // elbow inlet face
export const XB = XC - LB; // A|B joint
export const XA = XB - LA; // inlet of the run
export const ZC = -HALF; // elbow outlet face
export const ZD = ZC - LD; // D|E joint
export const ZE = ZD - LE; // end of the main, under the cap
export const ZT = ZD - 0.6 * LE; // middle of the takeoff's top opening

/** Story beats, in p. */
export const BEATS = { form: [0.09, 0.44], seam: [0.44, 0.585], connect: [0.585, 0.82], flow: [0.82, 1] } as const;
/** CONNECT, step by step. */
export const STEP = {
  lift: [0.585, 0.645], // the takeoff onto the main
  stand: [0.585, 0.62], // the end cap up ...
  slide: [0.61, 0.645], // ... and on
  inner: [0.635, 0.69], // reducer|elbow and elbow|offset close
  outer: [0.665, 0.72], // straight|reducer and offset|branch close
  welds: [0.65, 0.71], // the takeoff's tabs, spot-welded
  bolts: [0.705, 0.78], // TDC corners in, bolts on
  drives: [0.7, 0.8], // S&D: drives down the sides, ends bent over
  window: [0.745, 0.83], // the elbow's top cheek drawn removed, to show the vanes
} as const;
/** When each Pittsburgh lock closes. */
export const SEAM_AT: Record<string, number> = { straight: 0.44, reducer: 0.458, elbow: 0.476, offset: 0.494, branch: 0.512, takeoff: 0.53 };
export const SEAM_LEN = 0.05;

type Win = readonly [number, number];
type Def = { key: string; pts: V3[]; parent: number; win: Win };
/** hp/he: the hinge line; theta: flat → formed about it; n: inner normal, formed; bends[k]: edge k's hinge owner, −1 for a cut edge. */
export type Panel = Def & { hp: V3; he: V3; theta: number; n: V3; bends: number[] };

const EPS = 1e-6;
const same = (a: V3, b: V3) => len(sub(a, b)) < EPS;

function hinge(d: Def, par: Panel): Panel {
  const shared = d.pts.filter((v) => par.pts.some((w) => same(v, w)));
  if (shared.length !== 2) throw new Error(`${d.key}: a hinge needs 2 shared corners, found ${shared.length}`);
  const [a, b] = shared;
  const e = unit(sub(b, a));
  const off = (ps: V3[]) => ps.map((v) => perp(sub(v, a), e)).find((v) => len(v) > EPS) as V3;
  const f = mul(unit(off(par.pts)), -1); // the flat continuation, away from the parent
  const g = unit(off(d.pts));
  const theta = Math.atan2(dot(g, cross(e, f)), dot(g, f));
  return { ...d, hp: a, he: e, theta, n: turn(spin(a, e, theta), par.n), bends: [] };
}

/** Unfold a hinge tree (parents first); the root's inner side faces `n`. */
function build(defs: Def[], n: V3): Panel[] {
  const out: Panel[] = [];
  for (const d of defs) out.push(d.parent < 0 ? { ...d, hp: [0, 0, 0], he: X, theta: 0, n, bends: [] } : hinge(d, out[d.parent]));
  const on = (c: Panel, v: V3) => len(perp(sub(v, c.hp), c.he)) < EPS;
  return out.map((pn, i) => ({
    ...pn,
    bends: pn.pts.map((v, k) => {
      const w = pn.pts[(k + 1) % pn.pts.length];
      return out.findIndex((c, j) => c.parent >= 0 && (j === i || c.parent === i) && on(c, v) && on(c, w));
    }),
  }));
}

// --------------------------------------------------------------------- tubes
type End = { bb: V3; fb: V3; ft: V3; bt: V3; into: V3; l: V3 };
/** A duct end: bottom-centre c, lateral l toward the visible side, half-width w; `into` points into the duct. */
function end(c: V3, l: V3, w: number, into: V3): End {
  const bb = sub(c, mul(l, w));
  const fb = add(c, mul(l, w));
  return { bb, fb, ft: add(fb, [0, H, 0]), bt: add(bb, [0, H, 0]), into, l };
}

/** Roll-formed TDC: a lip square to the axis on every wall, a short return, open corners. */
function tdc(E: End, tag: string, base: number, idx: number[]): Def[] {
  // idx: the bottom, front, back and top walls' places in the tube
  const sides: [number, V3, V3, V3][] = [
    [idx[0], E.bb, E.fb, mul(Y, -1)],
    [idx[1], E.fb, E.ft, E.l],
    [idx[2], E.bb, E.bt, mul(E.l, -1)],
    [idx[3], E.bt, E.ft, Y],
  ];
  return sides.flatMap(([wall, p, q, o], k): Def[] => {
    const p1 = add(p, mul(o, HF));
    const q1 = add(q, mul(o, HF));
    return [
      { key: `${tag}l${wall}`, pts: [p, q, q1, p1], parent: wall, win: [0.02, 0.32] },
      { key: `${tag}r${wall}`, pts: [p1, q1, add(q1, mul(E.into, HR)), add(p1, mul(E.into, HR))], parent: base + 2 * k, win: [0, 0.2] },
    ];
  });
}

/**
 * Four walls from one blank: three brake bends and a Pittsburgh lock where the last
 * wall comes round. `back`/`front`: the top hangs off that wall and the lock is on the
 * top's other edge; `out`: every wall rolls off the visible side, and the lock closes
 * the bottom corner on the far side, out of sight.
 */
type Layout = "back" | "front" | "out";
const ORDER: Record<Layout, [string, string][]> = {
  back: [["front", "bot"], ["back", "bot"], ["top", "back"]],
  front: [["back", "bot"], ["front", "bot"], ["top", "front"]],
  out: [["front", "bot"], ["top", "front"], ["back", "top"]],
};
/** Fold from the free end back toward the bottom, so a long blank rolls up instead of standing tall. */
const ROLL: Win[] = [[0.46, 1], [0.22, 0.66], [0, 0.44]];
function tube(A: End, B: End, layout: Layout, flanged: [boolean, boolean]): Def[] {
  const pts: Record<string, V3[]> = {
    bot: [A.bb, A.fb, B.fb, B.bb],
    front: [A.fb, B.fb, B.ft, A.ft],
    back: [A.bb, A.bt, B.bt, B.bb],
    top: [A.bt, B.bt, B.ft, A.ft],
  };
  const keys = ["bot", ...ORDER[layout].map(([k]) => k)];
  const wall = (k: string) => keys.indexOf(k);
  const side = layout === "back" || layout === "front";
  const defs: Def[] = keys.map((key, i) => ({
    key,
    pts: pts[key],
    parent: i ? wall(ORDER[layout][i - 1][1]) : -1,
    // back/front: both side walls rise together after the top has turned up off one of them
    win: i === 0 ? [0, 0] : side ? (i < 3 ? ROLL[0] : ROLL[1]) : ROLL[i - 1],
  }));
  const idx = [wall("bot"), wall("front"), wall("back"), wall("top")];
  if (flanged[0]) defs.push(...tdc(A, "a", defs.length, idx));
  if (flanged[1]) defs.push(...tdc(B, "b", defs.length, idx));
  return defs;
}

// ------------------------------------------------------------------- pieces
/** Where a piece's Pittsburgh lock closes: the panel that closes it, along `path`; `inset` runs across the lock. */
export type Seam = { panel: number; path: V3[]; inset: V3; hidden?: boolean };
export type Piece = {
  key: string;
  panels: Panel[];
  seam: Seam;
  /** world offset while exploded, before CONNECT */
  explode: V3;
  /** where the piece's form clock runs, in p */
  form: Win;
};

function tubePiece(key: string, A: End, B: End, layout: Layout, flanged: [boolean, boolean], explode: V3, form: Win): Piece {
  const seams: Record<Layout, Seam> = {
    back: { panel: 3, path: [A.ft, B.ft], inset: mul(A.l, -1) },
    front: { panel: 3, path: [A.bt, B.bt], inset: A.l },
    out: { panel: 3, path: [A.bb, B.bb], inset: Y, hidden: true },
  };
  return { key, panels: build(tube(A, B, layout, flanged), Y), seam: seams[layout], explode, form };
}

/** Square elbow, square throat: two cheeks and a heel wrapper bent once at the heel, joined by Pittsburgh locks. */
function elbow(form: Win): Piece {
  const a = HALF;
  const cheek = (y: number): V3[] => [[-a, y, -a], [-a, y, a], [a, y, a], [a, y, -a]];
  const defs: Def[] = [
    { key: "cheekB", pts: cheek(0), parent: -1, win: [0, 0] },
    { key: "heel1", pts: [[-a, 0, a], [a, 0, a], [a, H, a], [-a, H, a]], parent: 0, win: [0, 0.36] },
    { key: "heel2", pts: [[a, 0, a], [a, 0, -a], [a, H, -a], [a, H, a]], parent: 1, win: [0.3, 0.58] },
    { key: "cheekT", pts: cheek(H), parent: 2, win: [0.5, 1] },
  ];
  const seam: Seam = { panel: 3, path: [[-a, H, a], [a, H, a]], inset: NZ };
  return { key: "elbow", panels: build(defs, Y), seam, explode: [0, 0, 0], form };
}

/** The 45° takeoff: a collar whose upstream wall leans into the flow, tabbed onto the main. */
function takeoff(explode: V3, form: Win): Piece {
  const [xl, xr] = [JOG - CW / 2, JOG + CW / 2];
  const zd = ZT - CB / 2; // downstream wall
  const zu1 = ZT + CB / 2; // top of the lean
  const zu0 = zu1 + CH; // foot of the lean, on the main
  const [y0, y1] = [H, H + CH];
  const defs: Def[] = [
    { key: "down", pts: [[xl, y0, zd], [xr, y0, zd], [xr, y1, zd], [xl, y1, zd]], parent: -1, win: [0, 0] },
    { key: "side1", pts: [[xr, y0, zd], [xr, y0, zu0], [xr, y1, zu1], [xr, y1, zd]], parent: 0, win: [0.25, 0.6] },
    { key: "side2", pts: [[xl, y0, zd], [xl, y1, zd], [xl, y1, zu1], [xl, y0, zu0]], parent: 0, win: [0.25, 0.6] },
    { key: "lean", pts: [[xl, y0, zu0], [xl, y1, zu1], [xr, y1, zu1], [xr, y0, zu0]], parent: 2, win: [0.55, 1] },
    { key: "tabD", pts: [[xl, y0, zd], [xr, y0, zd], [xr, y0, zd - TAB], [xl, y0, zd - TAB]], parent: 0, win: [0.1, 0.4] },
    { key: "tab1", pts: [[xr, y0, zd], [xr, y0, zu0], [xr + TAB, y0, zu0], [xr + TAB, y0, zd]], parent: 1, win: [0.1, 0.4] },
    { key: "tab2", pts: [[xl, y0, zd], [xl, y0, zu0], [xl - TAB, y0, zu0], [xl - TAB, y0, zd]], parent: 2, win: [0.1, 0.4] },
    { key: "tabU", pts: [[xl, y0, zu0], [xr, y0, zu0], [xr, y0, zu0 + TAB], [xl, y0, zu0 + TAB]], parent: 3, win: [0.1, 0.4] },
  ];
  const seam: Seam = { panel: 3, path: [[xr, y0, zu0], [xr, y1, zu1]], inset: NX };
  return { key: "takeoff", panels: build(defs, Z), seam, explode, form };
}

/** End cap: a pan, four flanges brake-bent from one blank, slipped over the end of the main. */
function cap(explode: V3, form: Win): Piece {
  const [xl, xr] = [JOG - HALF - DEL, JOG + HALF + DEL];
  const [y0, y1] = [-DEL, H + DEL];
  const z0 = ZE - DEL;
  const z1 = z0 + FC;
  const defs: Def[] = [
    { key: "plate", pts: [[xl, y0, z0], [xr, y0, z0], [xr, y1, z0], [xl, y1, z0]], parent: -1, win: [0, 0] },
    { key: "fB", pts: [[xl, y0, z0], [xr, y0, z0], [xr, y0, z1], [xl, y0, z1]], parent: 0, win: [0, 0.55] },
    { key: "fR", pts: [[xr, y0, z0], [xr, y1, z0], [xr, y1, z1], [xr, y0, z1]], parent: 0, win: [0.15, 0.7] },
    { key: "fT", pts: [[xr, y1, z0], [xl, y1, z0], [xl, y1, z1], [xr, y1, z1]], parent: 0, win: [0.3, 0.85] },
    { key: "fL", pts: [[xl, y1, z0], [xl, y0, z0], [xl, y0, z1], [xl, y1, z1]], parent: 0, win: [0.45, 1] },
  ];
  return { key: "cap", panels: build(defs, Z), seam: { panel: 0, path: [], inset: X }, explode, form };
}

// ---------------------------------------------------------------------- run
const MAIN = (x: number, w: number, into: V3) => end([x, 0, 0], Z, w, into);
const LEG2 = (x: number, z: number, into: V3) => end([x, 0, z], X, HALF, into);

export const PIECES: Piece[] = [
  tubePiece("straight", MAIN(XA, W1 / 2, X), MAIN(XB, W1 / 2, NX), "back", [true, true], [-2 * GAP, 0, 0], [0.09, 0.22]),
  tubePiece("reducer", MAIN(XB, W1 / 2, X), MAIN(XC, HALF, NX), "front", [true, false], [-GAP, 0, 0], [0.14, 0.27]),
  elbow([0.18, 0.34]),
  tubePiece("offset", LEG2(0, ZC, NZ), LEG2(JOG, ZD, Z), "out", [false, false], [0, 0, -GAP], [0.24, 0.37]),
  tubePiece("branch", LEG2(JOG, ZD, NZ), LEG2(JOG, ZE, Z), "back", [false, false], [0, 0, -2 * GAP], [0.28, 0.41]),
  takeoff([0, 0, -2 * GAP], [0.31, 0.43]),
  cap([0, 0, -2 * GAP], [0.33, 0.44]),
];
