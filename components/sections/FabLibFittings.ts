/**
 * The four fittings, modelled folded (x across, y up, z along the run; air flows
 * toward +z / the viewer). Proportions are illustrative, not shop dimensions.
 * Each hinge tree is chosen so the development lies flat without overlapping.
 */
import { clamp } from "@/lib/motion";
import { mean, prepare, type FittingDef, type Spec, type V3 } from "./FabLibGeometry";

const EXT = 0.55; // how far the airflow arrow runs outside the fitting

/** Rectangular wrap between two sections [bl, br, tr, tl]: bottom stays down, sides and top fold up. */
function wrap(a: V3[], b: V3[]): Spec[] {
  const inside = mean([...a, ...b]);
  const q = (i: number, j: number): V3[] => [a[i], a[j], b[j], b[i]];
  return [
    { pts: q(0, 1), inside, kind: "panel" },
    { pts: q(1, 2), inside, kind: "panel", parent: 0, hinge: [a[1], b[1]], win: [0, 0.55] },
    { pts: q(2, 3), inside, kind: "panel", parent: 1, hinge: [a[2], b[2]], win: [0.42, 1] },
    { pts: q(3, 0), inside, kind: "panel", parent: 0, hinge: [a[0], b[0]], win: [0.18, 0.72] },
  ];
}

const section = (x: number, w: number, h: number, z: number): V3[] => [
  [x, 0, z],
  [x + w, 0, z],
  [x + w, h, z],
  [x, h, z],
];

function straight(): FittingDef {
  const [W, H, L] = [1.3, 0.85, 1.8];
  const c = (z: number): V3 => [W / 2, H / 2, z];
  return { name: "Straight duct", specs: wrap(section(0, W, H, 0), section(0, W, H, L)), flow: [c(-EXT), c(0), c(L), c(L + EXT)], inlet: 1, outlet: 2 };
}

/** Flat-on-bottom reducer: every panel a trapezoid, so its folds are not quite square. */
function transition(): FittingDef {
  const [W1, H1, W2, H2, L] = [1.5, 1.0, 0.8, 0.55, 1.5];
  const x2 = (W1 - W2) / 2;
  return {
    name: "Transition",
    specs: wrap(section(0, W1, H1, 0), section(x2, W2, H2, L)),
    flow: [[W1 / 2, H1 / 2, -EXT], [W1 / 2, H1 / 2, 0], [W1 / 2, H2 / 2, L], [W1 / 2, H2 / 2, L + EXT]],
    inlet: 1,
    outlet: 2,
  };
}

/**
 * Rising offset: two dogleg cheeks and two three-panel wrappers. The top wrapper
 * hangs off the far straight of a cheek, the one edge it can unfold from without
 * landing on the cheek's dogleg.
 */
function offset(): FittingDef {
  const [W, H, a, b, R, L] = [1.1, 0.75, 0.55, 0.75, 0.55, 1.85];
  const lift = (z: number) => R * clamp((z - a) / b);
  const inside = (ps: V3[]): V3 => {
    const z = mean(ps)[2];
    return [W / 2, lift(z) + H / 2, z];
  };
  const strip = (y0: number, y1: number, z0: number, z1: number): V3[] => [[0, y0, z0], [W, y0, z0], [W, y1, z1], [0, y1, z1]];
  const cheek = (x: number): V3[] => [[x, 0, 0], [x, 0, a], [x, R, a + b], [x, R, L], [x, R + H, L], [x, R + H, a + b], [x, H, a], [x, H, 0]];
  const s = (pts: V3[], kind: Spec["kind"], rest: Partial<Spec> = {}): Spec => ({ pts, inside: inside(pts), kind, ...rest });
  const T = R + H;
  return {
    name: "Offset",
    specs: [
      s(strip(0, 0, 0, a), "panel"),
      s(strip(0, R, a, a + b), "panel", { parent: 0, hinge: [[0, 0, a], [W, 0, a]], win: [0, 0.5] }),
      s(strip(R, R, a + b, L), "panel", { parent: 1, hinge: [[0, R, a + b], [W, R, a + b]], win: [0.05, 0.55] }),
      s(cheek(W), "cheek", { parent: 0, hinge: [[W, 0, 0], [W, 0, a]], win: [0.12, 0.62] }),
      s(cheek(0), "cheek", { parent: 0, hinge: [[0, 0, 0], [0, 0, a]], win: [0.12, 0.62] }),
      s(strip(T, T, a + b, L), "panel", { parent: 4, hinge: [[0, T, a + b], [0, T, L]], win: [0.4, 0.9] }),
      s(strip(H, T, a, a + b), "panel", { parent: 5, hinge: [[0, T, a + b], [W, T, a + b]], win: [0.5, 1] }),
      s(strip(H, H, 0, a), "panel", { parent: 6, hinge: [[0, H, a], [W, H, a]], win: [0.5, 1] }),
    ],
    flow: [[W / 2, H / 2, -EXT], [W / 2, H / 2, 0], [W / 2, H / 2, a], [W / 2, R + H / 2, a + b], [W / 2, R + H / 2, L], [W / 2, R + H / 2, L + EXT]],
    inlet: 1,
    outlet: 4,
  };
}

/**
 * 90° radius elbow, seen into its inside corner so both openings face the viewer.
 * The heel rolls up off the bottom cheek as a strip of narrow slats, the top cheek
 * swings over on the heel, and the throat — cut as its own strip, since no strip
 * can unroll off a concave edge without landing on it — stands up into the curve.
 */
function elbow(): FittingDef {
  const [r, R, H, N, G] = [0.5, 1.45, 0.8, 9, 0.24];
  const at = (rho: number, k: number, y: number): V3 => {
    const a = Math.PI + (k * Math.PI) / (2 * N);
    return [rho * Math.cos(a), y, rho * Math.sin(a)];
  };
  const mid = (N - 1) / 2;
  const ks = Array.from({ length: N + 1 }, (_, k) => k);
  const cheek = (y: number): V3[] => [...ks.map((k) => at(R, k, y)), ...ks.map((k) => at(r, N - k, y))];
  const m = mean(cheek(0));
  const core: V3 = [m[0], H / 2, m[2]];
  const specs: Spec[] = [{ pts: cheek(0), inside: core, kind: "cheek" }];

  /** A strip of slats hinged to the bottom cheek at its middle slat; returns that slat's index. */
  function strip(rho: number, win: [number, number], slide?: V3): number {
    const slat = (k: number): V3[] => [at(rho, k, 0), at(rho, k + 1, 0), at(rho, k + 1, H), at(rho, k, H)];
    const inside = (k: number) => at((r + R) / 2, k + 0.5, H / 2);
    const first = specs.length;
    specs.push({ pts: slat(mid), inside: inside(mid), kind: "slat", parent: 0, hinge: [at(rho, mid, 0), at(rho, mid + 1, 0)], win, slide });
    for (const dir of [-1, 1]) {
      let parent = first;
      for (let k = mid + dir; k >= 0 && k < N; k += dir) {
        const e = dir < 0 ? k + 1 : k; // the vertical edge shared with the previous slat
        specs.push({ pts: slat(k), inside: inside(k), kind: "slat", parent, hinge: [at(rho, e, 0), at(rho, e, H)], win: [0.1, 0.8] });
        parent = specs.length - 1;
      }
    }
    return first;
  }

  const heel = strip(R, [0, 0.6]);
  specs.push({ pts: cheek(H), inside: core, kind: "cheek", parent: heel, hinge: [at(R, mid, H), at(R, mid + 1, H)], win: [0.5, 1] });
  strip(r, [0.12, 0.72], [G * Math.SQRT1_2, 0, G * Math.SQRT1_2]); // laid out clear of the cheek's inside curve

  const rc = (r + R) / 2;
  const arc = Array.from({ length: 7 }, (_, i) => at(rc, (i * N) / 6, H / 2));
  return { name: "90° radius elbow", specs, flow: [[-rc, H / 2, EXT], ...arc, [EXT, H / 2, -rc]], inlet: 1, outlet: 7 };
}

export const FITTINGS = [straight(), elbow(), transition(), offset()].map(prepare);
