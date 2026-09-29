/**
 * Five-gore 90° round elbow, developed the way a sheet-metal shop lays one out.
 *
 * Every gore is a cylinder segment cut by planes tilted β = 11.25° off square, and
 * a tilted cut through a cylinder unrolls to a sine curve. Lay every other gore out
 * turned half a revolution and neighbours share their cut, so the whole elbow comes
 * from ONE rectangle, πD by 8·R·tanβ, divided by four sine curves.
 *
 * Forming, all rigid or isometric, so the metal never stretches or tears:
 *   roll — the sheet curls with curvature k from 0 to 1/r: arc length s lands at
 *          (sin ks / k, (1 − cos ks) / k), exact at every frame;
 *   part — the pieces slide apart along the cuts by 2·r·tanβ, exactly the clearance
 *          a gore needs to turn over between its neighbours;
 *   flip — the odd gores turn 180° about their own axis (their heels come down);
 *   fold — each joint hinges shut about its heel contact point, 2β per joint, until
 *          the throats close: 4 × 22.5° = 90°.
 *
 * World: y up, the sheet on the floor (y = 0), stretch-out s along z, pipe axis
 * along −x. Pure: the scene is a function of the Pose.
 */
import { easeInOutCubic, seg } from "@/lib/motion";

export type P2 = readonly [number, number];
type V3 = readonly [number, number, number];

const r = 1; // duct radius, model units
export const RADIUS = 3 * r; // centreline radius, 1.5 D
export const FULL = 3; // full gores, plus a half gore at each end
export const GORES = FULL + 2;
export const JOINTS = GORES - 1;
export const BETA = Math.PI / 2 / (2 * JOINTS); // half a joint's turn: 11.25°
const TB = Math.tan(BETA);
const LEN = 2 * JOINTS * RADIUS * TB; // sheet length along the pipe axis
const GAP = 2 * r * TB; // heel-to-heel clearance to turn a gore over
const FACETS = 64; // around the circumference; fine enough that the shade reads as a curve, not stripes
const ELEMENT = 8; // every 8th facet line is a development element, 45° apart
const PX = 60;
const COS30 = Math.cos(Math.PI / 6);
const EYE: V3 = [1, 1, 1]; // toward the viewer; larger x+y+z draws later
export const CENTRE: V3 = [0, r + RADIUS, 0]; // the bend centre once formed

const nl = Math.hypot(-0.25, 1, 0.5);
const LIGHT: V3 = [-0.25 / nl, 1 / nl, 0.5 / nl];

export const project = ([x, y, z]: V3): P2 => [(x - z) * COS30 * PX, ((x + z) * 0.5 - y) * PX];
const pt = ([x, y]: P2) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const poly = (ps: P2[]) => `M${ps.map(pt).join("L")}`;
const plan = (ps: V3[]) => ps.map(([x, , z]) => project([x, 0, z])); // straight down to the floor

const hl = Math.hypot(LIGHT[0] + 0.577, LIGHT[1] + 0.577, LIGHT[2] + 0.577);
const SHEEN: V3 = [(LIGHT[0] + 0.577) / hl, (LIGHT[1] + 0.577) / hl, (LIGHT[2] + 0.577) / hl];

/** Galvanized grey from the lit side of a face, plus a soft sheen; `k` darkens the inside of the pipe. */
function steel(n: V3, k: number): string {
  const lit = Math.max(0, dot(n, LIGHT));
  const sheen = Math.pow(Math.max(0, dot(n, SHEEN)), 7); // broad, so neighbouring facets step gently
  const g = Math.min(244, 100 + 128 * (0.45 + 0.55 * lit) * k + 26 * sheen * k);
  return `rgb(${Math.round(g - 4)} ${Math.round(g - 1)} ${Math.round(g + 3)})`;
}

/** Axial position on the sheet of cut j (between gores j and j+1): a sine of the stretch-out. */
const cut = (j: number, s: number) => (2 * j + 1) * RADIUS * TB + (j % 2 ? -1 : 1) * r * TB * Math.cos(s / r);
const lo = (i: number, s: number) => (i === 0 ? 0 : cut(i - 1, s));
const hi = (i: number, s: number) => (i === GORES - 1 ? LEN : cut(i, s));
const heelX = (j: number) => -(2 * j * RADIUS * TB + j * GAP + TB * (RADIUS + r));

/** Sheet point (s, w) with the sheet curled to curvature k about its middle element. */
function rolled(s: number, w: number, k: number): V3 {
  if (k < 1e-6) return [-w, 0, s];
  return [-w, (1 - Math.cos(k * s)) / k, Math.sin(k * s) / k];
}
const rollNormal = (s: number, k: number): V3 => [0, -Math.cos(k * s), Math.sin(k * s)];

export type Pose = { roll: number; part: number; flip: number; fold: readonly number[] };

/**
 * Scroll progress 0..1 to the forming pose plus the camera, weld and flow beats.
 * Hold the layout, roll, part along the cuts, turn the odd gores, stack them, weld, flow.
 */
export const BEATS = {
  roll: [0.1, 0.28],
  part: [0.28, 0.4],
  flip: [0.4, 0.51],
  fold: [0.51, 0.66],
  weld: [0.66, 0.78],
  flow: [0.78, 0.9],
  tilt: [0.07, 0.28], // the camera follows the sheet up as it rolls, centring the pipe for the part and turn
  rise: [0.47, 0.58], // then climbs ahead of the stacking gores to leave room for the outlet and its air
} as const;
const beat = (p: number, [a, b]: readonly [number, number]) => seg(p, a, b);

export function timeline(p: number) {
  const f = beat(p, BEATS.fold);
  return {
    tilt: easeInOutCubic(beat(p, BEATS.tilt)),
    rise: easeInOutCubic(beat(p, BEATS.rise)),
    roll: easeInOutCubic(beat(p, BEATS.roll)),
    part: easeInOutCubic(beat(p, BEATS.part)),
    flip: easeInOutCubic(beat(p, BEATS.flip)),
    fold: Array.from({ length: JOINTS }, (_, j) => easeInOutCubic(seg(f, j * 0.12, j * 0.12 + 0.64))),
    weld: beat(p, BEATS.weld),
    flow: beat(p, BEATS.flow),
  };
}
const FORMED: Pose = timeline(1);

/** Rigid motion of gore i: part along the axis, flip about it, then the hinged fold chain. */
function mover(i: number, pose: Pose) {
  const g = i % 2 ? Math.PI * pose.flip : 0;
  const cg = Math.cos(g);
  const sg = Math.sin(g);
  let [a, b, c, d, e, f] = [1, 0, 0, 1, 0, 0];
  for (let j = 0; j < i; j++) {
    const t = -2 * BETA * pose.fold[j];
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const qx = heelX(j); // rotate about the heel contact (qx, 0), parallel to z
    const [A, B, C, D, E, F] = [ct, -st, st, ct, qx * (1 - ct), -st * qx];
    [a, b, c, d, e, f] = [a * A + b * C, a * B + b * D, c * A + d * C, c * B + d * D, a * E + b * F + e, c * E + d * F + f];
  }
  return (v: V3, isPoint: boolean): V3 => {
    let [x, y, z] = v;
    if (isPoint) {
      x -= i * GAP * pose.part;
      y -= r;
    }
    [y, z] = [y * cg - z * sg, y * sg + z * cg];
    if (isPoint) y += r;
    return isPoint ? [a * x + b * y + e, c * x + d * y + f, z] : [a * x + b * y, c * x + d * y, z];
  };
}

export type Face = {
  key: string;
  d: string;
  solid: string; // cut edges, sheet edges, silhouettes
  dashed: string; // development elements, on the marked (inner) side only
  fill: string;
  depth: number;
  pts: P2[];
  foot: P2[]; // straight down onto the floor: the face's plan shadow (may twist, so split in two)
};

const STATIONS = Array.from({ length: FACETS + 1 }, (_, q) => -Math.PI * r + (2 * Math.PI * r * q) / FACETS);

/** Gore i's edge stations (3D and projected) and facet normals in a pose. */
function goreMesh(i: number, pose: Pose, k: number) {
  const move = mover(i, pose);
  const bot3 = STATIONS.map((s) => move(rolled(s, lo(i, s), k), true));
  const top3 = STATIONS.map((s) => move(rolled(s, hi(i, s), k), true));
  const normals = STATIONS.slice(1).map((s1, q) => move(rollNormal((STATIONS[q] + s1) / 2, k), false));
  return { bot3, top3, B: bot3.map(project), T: top3.map(project), normals, out: normals.map((n) => dot(n, EYE) > 0) };
}

type Mesh = ReturnType<typeof goreMesh>;

function goreFaces(i: number, { bot3, top3, B, T, normals, out }: Mesh, inside: number): Face[] {
  // out: the facet shows its outer surface to the viewer
  const gen = (q: number) => `M${pt(B[q])}L${pt(T[q])}`;
  return normals.map((n, q) => {
    let solid = `M${pt(B[q])}L${pt(B[q + 1])}M${pt(T[q + 1])}L${pt(T[q])}`;
    if (q === 0) solid += gen(0);
    if (q === FACETS - 1) solid += gen(FACETS);
    if (out[q] && q > 0 && !out[q - 1]) solid += gen(q);
    if (out[q] && q < FACETS - 1 && !out[q + 1]) solid += gen(q + 1);
    const pts = [B[q], B[q + 1], T[q + 1], T[q]];
    const corners = [bot3[q], bot3[q + 1], top3[q + 1], top3[q]];
    const depth = corners.reduce((sum, p) => sum + dot(p, EYE), 0) / 4;
    return {
      key: `g${i}f${q}`,
      d: `${poly(pts)}Z`,
      solid,
      dashed: !out[q] && (q + 1) % ELEMENT === 0 && q + 1 < FACETS ? gen(q + 1) : "",
      fill: out[q] ? steel(n, 1) : steel([-n[0], -n[1], -n[2]], inside),
      depth,
      pts,
      foot: plan(corners),
    };
  });
}

/** Signed-area-normalised outline, so a union of faces fills with the nonzero rule. */
function ccw(ps: P2[]): string {
  let area = 0;
  ps.forEach(([x, y], n) => {
    const [x2, y2] = ps[(n + 1) % ps.length];
    area += x * y2 - x2 * y;
  });
  return `${poly(area < 0 ? [...ps].reverse() : ps)}Z`;
}

export type Scene = { faces: Face[]; union: string; shadow: string };

export function scene(pose: Pose): Scene {
  const k = pose.roll / r;
  const inside = 1 - 0.38 * pose.roll;
  const meshes = Array.from({ length: GORES }, (_, i) => goreMesh(i, pose, k));
  const faces = meshes
    .flatMap((m, i) => goreFaces(i, m, inside))
    .sort((f, g) => f.depth - g.depth);
  // Plan shadow of each gore as a closed solid: its facets (split, since a facet's plan can twist) plus both
  // end discs, or overhead light would leak through the open ends of a steep gore.
  const walls = faces.map(({ foot: [a, b, c, d] }) => ccw([a, b, c]) + ccw([a, c, d]));
  const caps = meshes.map((m) => ccw(plan(m.bot3)) + ccw(plan(m.top3)));
  return { faces, union: faces.map((f) => ccw(f.pts)).join(""), shadow: walls.join("") + caps.join("") };
}

/** The development left on the table: outline plus the four sine cuts. */
function ghost(): string {
  const S = Array.from({ length: 65 }, (_, q) => -Math.PI * r + (2 * Math.PI * r * q) / 64);
  const on = (s: number, w: number) => project(rolled(s, w, 0));
  const edge = [on(-Math.PI * r, 0), on(Math.PI * r, 0), on(Math.PI * r, LEN), on(-Math.PI * r, LEN)];
  const cuts = Array.from({ length: JOINTS }, (_, j) => poly(S.map((s) => on(s, cut(j, s)))));
  return `${poly(edge)}Z${cuts.join("")}`;
}
export const GHOST = ghost();

/** Visible arc of each finished joint, the path the weld runs along. */
function joints(): P2[][] {
  const N = 120;
  const move = (j: number) => mover(j, FORMED);
  return Array.from({ length: JOINTS }, (_, j) => {
    const m = move(j);
    const S = Array.from({ length: N }, (_, q) => -Math.PI * r + (2 * Math.PI * r * q) / N);
    const pts = S.map((s) => project(m(rolled(s, hi(j, s), 1 / r), true)));
    const vis = S.map((s) => dot(m(rollNormal(s, 1 / r), false), EYE) > 0);
    const start = vis.findIndex((v, q) => v && !vis[(q + N - 1) % N]);
    const run: P2[] = [];
    for (let q = start; vis[q % N] && run.length < N; q++) run.push(pts[q % N]);
    return run;
  });
}
export const JOINT_RUNS = joints();
export const JOINT_D = JOINT_RUNS.map(poly);

/** Ripples of a weld bead: small chevrons pointing along the run, each with its fraction u of the run. */
function ripples(ps: P2[]): { u: number; d: string }[] {
  const len = ps.slice(1).reduce((a, p, n) => a + Math.hypot(p[0] - ps[n][0], p[1] - ps[n][1]), 0);
  const count = Math.floor(len / 3.4);
  return Array.from({ length: count }, (_, n) => {
    const u = (n + 0.5) / count;
    const [x, y] = along(ps, u);
    const [x2, y2] = along(ps, Math.min(1, u + 0.01));
    const [x1, y1] = along(ps, Math.max(0, u - 0.01));
    const tl = Math.hypot(x2 - x1, y2 - y1) || 1;
    const [tx, ty] = [(x2 - x1) / tl, (y2 - y1) / tl];
    const wing = (side: number): P2 => [x - tx * 1.3 - ty * 1.7 * side, y - ty * 1.3 + tx * 1.7 * side];
    return { u, d: poly([wing(1), [x, y], wing(-1)]) };
  });
}
export const JOINT_RIPPLES = JOINT_RUNS.map(ripples);

/** Phantom outline of the finished elbow (contours, visible joints, both openings): where the metal is going. */
function phantom(): string {
  const parts = Array.from({ length: GORES }, (_, i) => {
    const { B, T, out } = goreMesh(i, FORMED, 1 / r);
    const contour = out.map((o, q) => (o !== out[(q + FACETS - 1) % FACETS] ? `M${pt(B[q])}L${pt(T[q])}` : "")).join("");
    const ends = `${i === 0 ? `${poly(B)}Z` : ""}${i === GORES - 1 ? `${poly(T)}Z` : ""}`;
    return contour + ends;
  });
  return parts.join("") + JOINT_D.join("");
}
export const PHANTOM = phantom();

/** Point at fraction u of a polyline's length. */
export function along(ps: P2[], u: number): P2 {
  const lens = ps.slice(1).map((p, n) => Math.hypot(p[0] - ps[n][0], p[1] - ps[n][1]));
  let left = u * lens.reduce((a, b) => a + b, 0);
  for (let n = 0; n < lens.length; n++) {
    if (left <= lens[n]) {
      const t = lens[n] ? left / lens[n] : 0;
      return [ps[n][0] + (ps[n + 1][0] - ps[n][0]) * t, ps[n][1] + (ps[n + 1][1] - ps[n][1]) * t];
    }
    left -= lens[n];
  }
  return ps[ps.length - 1];
}

/**
 * Streamlines through the formed elbow at radius ρ from the bend centre, in its
 * plane: straight in, a quarter turn inside the fitting, straight out the top.
 */
export type Stream = { d: string; inner: string; outer: string; head: string; rho: number; top: number };
const LEAD_IN = 1.2;
const LEAD_OUT = 1;

/** `big` is the centre stream: the one the eye follows, with the outlet's arrowhead. */
function stream(rho: number, big: boolean): Stream {
  const [cx, cy] = CENTRE;
  const arc: V3[] = Array.from({ length: 33 }, (_, n) => {
    const phi = (n / 32) * (Math.PI / 2);
    return [cx - rho * Math.sin(phi), cy - rho * Math.cos(phi), 0];
  });
  const pin = project([cx + LEAD_IN, cy - rho, 0]);
  const pout = project([cx - rho, cy + LEAD_OUT, 0]);
  const mid = arc.map(project);
  const [len, half, over] = big ? [17, 7.5, 5] : [9, 4, 3]; // straight up the screen
  const [x, y] = pout;
  const head = `M${pt([x, y - over])}L${pt([x - half, y + len - over])}L${pt([x + half, y + len - over])}Z`;
  return {
    d: poly([pin, ...mid, pout]),
    inner: poly(mid),
    outer: `${poly([pin, mid[0]])}${poly([mid[mid.length - 1], pout])}`,
    head,
    rho,
    top: y - over,
  };
}
export const STREAMS = [RADIUS - 0.58 * r, RADIUS, RADIUS + 0.58 * r].map((rho, n) => stream(rho, n === 1));

/**
 * The camera: a fixed window, wider than tall, that tilts up with the metal. It frames
 * the flat sheet at the start and the elbow with its air at the end; the development
 * left on the table may run off the bottom edge by then.
 */
const CAM_W = 640;
const CAM_H = 440;
const CAM_PAD = 12;
function camera() {
  const span = (p: number) => {
    const ys = scene(timeline(p)).faces.flatMap((f) => f.pts.map((q) => q[1]));
    return Math.min(...ys) + Math.max(...ys);
  };
  const xs = scene(timeline(0)).faces.flatMap((f) => f.pts.map((q) => q[0]));
  const x = Math.round((Math.min(...xs) + Math.max(...xs) - CAM_W) / 2);
  const flat = Math.round((span(0) - CAM_H) / 2); // the sheet, centred
  const mid = Math.round((span(BEATS.flip[0]) - CAM_H) / 2); // the parted pipe, centred
  const formed = Math.floor(Math.min(...STREAMS.map((st) => st.top)) - CAM_PAD); // the outlet's arrowheads at the top
  return { x, flat, mid, formed, width: CAM_W, height: CAM_H };
}
export const CAM = camera();
/** Everything the camera ever sees, for mask regions. */
export const VIEW = { x: CAM.x, y: CAM.formed, width: CAM.width, height: CAM.flat + CAM.height - CAM.formed };
export const viewBox = ({ tilt, rise }: { tilt: number; rise: number }) =>
  `${CAM.x} ${(CAM.flat + (CAM.mid - CAM.flat) * tilt + (CAM.formed - CAM.mid) * rise).toFixed(1)} ${CAM.width} ${CAM.height}`;

/** Drawing facts for the caption and readout, all from the model. */
export const FACTS = {
  gores: GORES,
  full: FULL,
  joints: JOINTS,
  fullDeg: (2 * BETA * 180) / Math.PI,
  halfDeg: (BETA * 180) / Math.PI,
  rOverD: RADIUS / (2 * r),
};
