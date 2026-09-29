/**
 * The cutting-table timeline. Everything except the sparks is a pure function
 * of time: frameAt(t) says where the head is, how far each part's cut has run
 * and how far each cut part has dropped. Two sheets make one loop — the nest,
 * then the nest mirrored — each ending with the head parked and the sheet
 * swapped for a fresh one.
 */
import { clamp, easeInCubic, easeInOutCubic, easeOutCubic, lerp, seg } from "@/lib/motion";
import { NESTS, PARK, pointAt, type P, type Part } from "./FabCutNest";

export const CUT = 0.48; // sheet units per second along an outline
export const COOL = 1.0; // s for the kerf to cool from white-hot to a dark cut
export const DROP = 0.75; // s for a cut part to fall through the bed
const RAPID = 1.7; // sheet units per second between parts, head off
const PIERCE = 0.38;
const DWELL = 0.14;
const IDLE = 0.5;
const SWAP = 2.6;
const SLIDE = 2.5; // sheet units the sheets travel on a swap

export type Mode = 0 | 1 | 2; // off | piercing | cutting
export type Label = { kind: "next" | "cut" | "change" | "done"; part: number };
export type SheetState = { shift: number; variant: number; elapsed: number[]; drop: number[] };
export type Frame = {
  sheets: SheetState[];
  head: P; // table coordinates, in sheet units
  dir: P; // unit direction of travel while cutting
  mode: Mode;
  torch: number; // 0..~1.3 brightness at the tip
  label: Label;
};

type Step = { r0: number; p0: number; c0: number; c1: number; from: P };
type Plan = { steps: Step[]; park0: number; park1: number; swap0: number; dur: number };

const rapidTime = (a: P, b: P) => 0.25 + Math.hypot(b[0] - a[0], b[1] - a[1]) / RAPID;
const mix = (a: P, b: P, p: number): P => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

function plan(parts: Part[]): Plan {
  let t = IDLE;
  let from = PARK;
  const steps = parts.map((part) => {
    const r0 = t;
    const p0 = r0 + rapidTime(from, part.pts[0]);
    const c0 = p0 + PIERCE;
    const c1 = c0 + part.len / CUT;
    const step = { r0, p0, c0, c1, from };
    from = part.pts[0];
    t = c1 + DWELL;
    return step;
  });
  const park1 = t + rapidTime(from, PARK);
  const swap0 = Math.max(park1, steps[steps.length - 1].c1 + DROP) + 0.3;
  return { steps, park0: t, park1, swap0, dur: swap0 + SWAP };
}

const PLANS = NESTS.map(plan);
const PERIOD = PLANS[0].dur + PLANS[1].dur;
const COUNT = NESTS[0].length;
const FRESH: SheetState = { shift: 0, variant: 0, elapsed: Array(COUNT).fill(-1), drop: Array(COUNT).fill(0) };

const OFF = { mode: 0 as Mode, torch: 0, dir: [0, 1] as P };

/** Head, torch and label inside one sheet's plan at local time `u`. */
function head(pl: Plan, parts: Part[], u: number): Pick<Frame, "head" | "dir" | "mode" | "torch" | "label"> {
  if (u >= pl.park0) {
    const last = pl.steps[COUNT - 1];
    return { ...OFF, head: mix(parts[COUNT - 1].pts[0], PARK, easeInOutCubic(seg(u, pl.park0, pl.park1))), label: { kind: u < last.c1 + DROP ? "cut" : "change", part: COUNT - 1 } };
  }
  let i = -1;
  while (i + 1 < COUNT && pl.steps[i + 1].r0 <= u) i++;
  if (i < 0) return { ...OFF, head: PARK, label: { kind: "next", part: 0 } };

  const st = pl.steps[i];
  const part = parts[i];
  const start = part.pts[0];
  if (u < st.p0) {
    return { ...OFF, head: mix(st.from, start, easeInOutCubic(seg(u, st.r0, st.p0))), label: { kind: "next", part: i } };
  }
  const label: Label = { kind: "cut", part: i };
  if (u < st.c0) {
    const p = seg(u, st.p0, st.c0);
    return { head: start, dir: [0, 1], mode: 1, torch: 0.35 + 0.65 * easeOutCubic(p) + 0.35 * Math.sin(Math.PI * p), label };
  }
  if (u < st.c1) {
    const s = (u - st.c0) * CUT;
    const a = pointAt(part, s - 0.006);
    const b = pointAt(part, s + 0.006);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { head: pointAt(part, s), dir: [(b[0] - a[0]) / len, (b[1] - a[1]) / len], mode: 2, torch: 1, label };
  }
  return { ...OFF, head: start, torch: 1 - seg(u, st.c1, st.c1 + 0.12), label };
}

export function frameAt(t: number): Frame {
  let u = ((t % PERIOD) + PERIOD) % PERIOD;
  let v = 0;
  if (u >= PLANS[0].dur) {
    u -= PLANS[0].dur;
    v = 1;
  }
  const pl = PLANS[v];
  const sheets: SheetState[] = [
    {
      shift: -SLIDE * easeInCubic(seg(u, pl.swap0, pl.swap0 + SWAP * 0.62)),
      variant: v,
      elapsed: pl.steps.map((st) => u - st.c0),
      drop: pl.steps.map((st) => clamp((u - st.c1) / DROP)),
    },
  ];
  const in0 = pl.swap0 + SWAP * 0.38;
  if (u > in0) sheets.push({ ...FRESH, variant: 1 - v, shift: SLIDE * (1 - easeOutCubic(seg(u, in0, pl.dur))) });
  return { sheets, ...head(pl, NESTS[v], u) };
}

/** Reduced motion: the whole nest cut, two parts already dropped out, head parked. */
export function staticFrame(): Frame {
  const dropped = new Set([2, 6]);
  return {
    sheets: [{ shift: 0, variant: 0, elapsed: Array(COUNT).fill(1e6), drop: NESTS[0].map((_, i) => (dropped.has(i) ? 1 : 0)) }],
    ...OFF,
    head: PARK,
    label: { kind: "done", part: COUNT - 1 },
  };
}
