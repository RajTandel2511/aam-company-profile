/**
 * Flat patterns for the cutting-table drawing, nested on one sheet. Units are
 * sheet units — the sheet is SHEET_W × SHEET_H, y pointing down. Each part is a
 * closed outline whose first vertex is where its cut starts and ends, plus the
 * dashed fold lines drawn on it. Pure data, computed once; the second nest is
 * the first mirrored left-to-right, used on alternate sheets.
 */
export type P = readonly [number, number];

export type Part = {
  name: string;
  pts: P[];
  folds: P[][];
  cum: number[]; // arclength at each vertex; cum[pts.length] closes back to pts[0]
  len: number;
  c: P; // bounding-box centre: the pivot it drops about
};

export const SHEET_W = 2;
export const SHEET_H = 1;
/** Where the head waits between sheets: off the top-right corner. */
export const PARK: P = [2.0, -0.11];

type Raw = { name: string; pts: P[]; folds: P[][] };

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });
}

const rect = (x: number, y: number, w: number, h: number): P[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const hLine = (x0: number, x1: number, y: number): P[] => [[x0, y], [x1, y]];
const vLine = (x: number, y0: number, y1: number): P[] => [[x, y0], [x, y1]];

/** Quarter-annulus elbow cheek about (cx, cy), sweeping a0 → a0 + 90°, lock allowance dashed inside both arcs. */
function cheek(cx: number, cy: number, a0: number): Raw {
  const R = 0.46;
  const r = 0.16;
  const a1 = a0 + Math.PI / 2;
  return {
    name: "90° elbow cheek",
    pts: [...arc(cx, cy, R, a0, a1, 32), ...arc(cx, cy, r, a1, a0, 12)],
    folds: [arc(cx, cy, R - 0.028, a0, a1, 32), arc(cx, cy, r + 0.028, a0, a1, 12)],
  };
}

/** Long thin strip (elbow throat / heel) with a lock edge dashed along each side. */
function strip(name: string, x: number, y: number, w: number, h: number): Raw {
  const e = 0.022;
  return { name, pts: rect(x, y, w, h), folds: [hLine(x, x + w, y + e), hLine(x, x + w, y + h - e)] };
}

/** One-piece rectangular wrap: lap | side | bottom | side | top, a fold line between each. */
function wrap(x: number, y: number, h: number): Raw {
  const panels = [0.06, 0.22, 0.34, 0.22, 0.34];
  const folds: P[][] = [];
  let at = x;
  for (const w of panels.slice(0, -1)) {
    at += w;
    folds.push(vLine(at, y, y + h));
  }
  return { name: "Rect duct wrap", pts: rect(x, y, at + panels[panels.length - 1] - x, h), folds };
}

/**
 * Developed surface of a pyramidal transition (rectangle to a 60% rectangle):
 * four trapezoids fanned about the apex, folds on the shared edges.
 */
function transition(ax: number, ay: number): Raw {
  const L = 0.8; // apex to a large-end corner
  const ri = 0.48; // apex to a small-end corner
  const sides = [0.34, 0.24, 0.34, 0.24];
  const ang = [0];
  for (const s of sides) ang.push(ang[ang.length - 1] + 2 * Math.asin(s / 2 / L));
  const mid = ang[ang.length - 1] / 2;
  const at = (r: number, f: number): P => [ax + r * Math.sin(f - mid), ay + r * Math.cos(f - mid)];
  return {
    name: "Transition wrap",
    pts: [...ang.map((f) => at(L, f)), ...[...ang].reverse().map((f) => at(ri, f))],
    folds: ang.slice(1, -1).map((f) => [at(ri, f), at(L, f)]),
  };
}

function cap(cx: number, cy: number, r: number): Raw {
  const top = -Math.PI / 2;
  return {
    name: "Round end cap",
    pts: arc(cx, cy, r, top, top + Math.PI * 2, 72).slice(0, -1),
    folds: [arc(cx, cy, r - 0.032, top, top + Math.PI * 2, 72)],
  };
}

/** Side of a rectangular offset: straight, angled run, straight; end flanges dashed. */
function offset(x: number, y: number): Raw {
  const a = 0.08;
  const s = 0.16;
  const o = 0.12;
  const w = 0.18;
  const e = 0.025;
  const W = 2 * a + s;
  return {
    name: "Offset side",
    pts: [
      [x, y + o], [x + a, y + o], [x + a + s, y], [x + W, y],
      [x + W, y + w], [x + a + s, y + w], [x + a, y + o + w], [x, y + o + w],
    ],
    folds: [vLine(x + e, y + o, y + o + w), vLine(x + W - e, y, y + w)],
  };
}

/** Start the cut at the vertex nearest the previous pierce, and measure the outline. */
function finish(raw: Raw, prev: P): Part {
  const d = (p: P) => Math.hypot(p[0] - prev[0], p[1] - prev[1]);
  let k = 0;
  raw.pts.forEach((p, i) => {
    if (d(p) < d(raw.pts[k])) k = i;
  });
  const pts = [...raw.pts.slice(k), ...raw.pts.slice(0, k)];
  const cum = [0];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    cum.push(cum[i] + Math.hypot(q[0] - p[0], q[1] - p[1]));
  });
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const c: P = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  return { ...raw, pts, cum, len: cum[pts.length], c };
}

function nest(mirror: boolean): Part[] {
  const raws = [
    transition(1.425, -0.305),
    cheek(0.86, 0.06, Math.PI / 2),
    cheek(0.04, 0.52, -Math.PI / 2),
    wrap(0.04, 0.56, 0.24),
    strip("Elbow heel", 0.04, 0.84, 0.76, 0.1),
    strip("Elbow throat", 0.84, 0.84, 0.29, 0.1),
    cap(1.42, 0.75, 0.17),
    offset(1.63, 0.46),
  ];
  const m = (p: P): P => (mirror ? [SHEET_W - p[0], p[1]] : p);
  let prev = PARK;
  return raws.map((r) => {
    const part = finish({ name: r.name, pts: r.pts.map(m), folds: r.folds.map((f) => f.map(m)) }, prev);
    prev = part.pts[0];
    return part;
  });
}

export const NESTS: readonly Part[][] = [nest(false), nest(true)];
export const FOLD_COUNT = NESTS[0].reduce((n, p) => n + p.folds.length, 0);

/** Point `s` sheet units along a part's outline from its start. */
export function pointAt(part: Part, s: number): P {
  const n = part.pts.length;
  const d = Math.min(part.len, Math.max(0, s));
  let lo = 0;
  let hi = n;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (part.cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const a = part.pts[lo];
  const b = part.pts[(lo + 1) % n];
  const span = part.cum[lo + 1] - part.cum[lo];
  const t = span > 0 ? (d - part.cum[lo]) / span : 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
