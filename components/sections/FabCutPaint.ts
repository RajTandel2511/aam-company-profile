/**
 * Per-frame painting of the cutting table: bed, sheets with their cut holes,
 * nest layout lines, dropping parts, the cooling kerf, the gantry, the tip
 * bloom and the sparks. Reads a Frame from FabCutPlan; keeps no state.
 */
import { clamp, easeOutCubic, lerp, seg } from "@/lib/motion";
import { NESTS, SHEET_H, SHEET_W, pointAt, type P, type Part } from "./FabCutNest";
import { COOL, CUT, type Frame, type SheetState } from "./FabCutPlan";
import { drawSparks, type Sparks } from "./FabCutSparks";
import type { Layout, Surfaces } from "./FabCutSurface";

type Map = { X: (u: number) => number; Y: (v: number) => number };

const KERF = "#1a1c1f";
const PLAN = "rgba(26,29,33,0.3)";
const FOLD = "rgba(26,29,33,0.46)";
/** Kerf colour by age (0 = at the tip, 1 = cold). */
const RAMP: [number, number, number, number][] = [
  [0, 255, 252, 240],
  [0.06, 255, 228, 156],
  [0.18, 255, 162, 64],
  [0.4, 212, 74, 30],
  [0.7, 88, 42, 30],
  [1, 26, 28, 31],
];

function heat(a: number): string {
  let i = 1;
  while (i < RAMP.length - 1 && RAMP[i][0] < a) i++;
  const [a0, r0, g0, b0] = RAMP[i - 1];
  const [a1, r1, g1, b1] = RAMP[i];
  const p = clamp((a - a0) / (a1 - a0));
  return `rgb(${Math.round(lerp(r0, r1, p))},${Math.round(lerp(g0, g1, p))},${Math.round(lerp(b0, b1, p))})`;
}

function poly(ctx: CanvasRenderingContext2D, pts: P[], m: Map, close = true) {
  ctx.moveTo(m.X(pts[0][0]), m.Y(pts[0][1]));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(m.X(pts[i][0]), m.Y(pts[i][1]));
  if (close) ctx.closePath();
}

/** Path along a part's outline from arclength s0 to s1. */
function trace(ctx: CanvasRenderingContext2D, part: Part, s0: number, s1: number, m: Map) {
  const a = pointAt(part, s0);
  ctx.moveTo(m.X(a[0]), m.Y(a[1]));
  const n = part.pts.length;
  for (let i = 1; i <= n && part.cum[i] < s1; i++) {
    if (part.cum[i] <= s0) continue;
    const p = part.pts[i % n];
    ctx.lineTo(m.X(p[0]), m.Y(p[1]));
  }
  const b = pointAt(part, s1);
  ctx.lineTo(m.X(b[0]), m.Y(b[1]));
}

function folds(ctx: CanvasRenderingContext2D, part: Part, m: Map, k: number) {
  ctx.beginPath();
  for (const f of part.folds) poly(ctx, f, m, false);
  ctx.setLineDash([4 * Math.max(0.7, k), 3 * Math.max(0.7, k)]);
  ctx.strokeStyle = FOLD;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);
}

/** A cut part falling through the bed: shifts, shrinks a touch, darkens, fades. */
function dropPiece(ctx: CanvasRenderingContext2D, L: Layout, surf: Surfaces, part: Part, d: number, m: Map, sx: number) {
  const e = easeOutCubic(d);
  const cx = m.X(part.c[0]);
  const cy = m.Y(part.c[1]);
  const sc = 1 - 0.045 * e;
  ctx.save();
  ctx.globalAlpha = 1 - seg(d, 0.35, 1);
  ctx.translate(cx + 2 * e, cy + 3.5 * e);
  ctx.scale(sc, sc);
  ctx.translate(-cx, -cy);
  ctx.beginPath();
  poly(ctx, part.pts, m);
  ctx.save();
  ctx.clip();
  ctx.drawImage(surf.sheet, sx - L.pad, L.oy - L.pad, SHEET_W * L.S + 2 * L.pad, SHEET_H * L.S + 2 * L.pad);
  ctx.fillStyle = `rgba(8,9,11,${0.55 * e})`;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = KERF;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  folds(ctx, part, m, L.k);
  ctx.restore();
}

function paintSheet(ctx: CanvasRenderingContext2D, L: Layout, surf: Surfaces, sh: SheetState) {
  const sx = L.ox + sh.shift * L.S;
  const W = SHEET_W * L.S;
  const H = SHEET_H * L.S;
  if (sx - L.pad > L.w || sx + W + L.pad < 0) return;
  const m: Map = { X: (u) => sx + u * L.S, Y: (v) => L.oy + v * L.S };
  const parts = NESTS[sh.variant];
  const holes = parts.filter((_, i) => sh.drop[i] > 0);
  const kw = Math.max(1.1, 1.5 * L.k);

  ctx.save();
  ctx.beginPath();
  ctx.rect(sx - L.pad, L.oy - L.pad, W + 2 * L.pad, H + 2 * L.pad);
  for (const p of holes) poly(ctx, p.pts, m);
  ctx.clip("evenodd");
  ctx.drawImage(surf.sheet, sx - L.pad, L.oy - L.pad, W + 2 * L.pad, H + 2 * L.pad);
  ctx.restore();

  if (holes.length) {
    // The bed seen through a hole sits in the sheet's shadow; the cut edge reads dark.
    ctx.beginPath();
    for (const p of holes) poly(ctx, p.pts, m);
    ctx.fillStyle = "rgba(4,5,6,0.18)";
    ctx.fill();
    ctx.strokeStyle = KERF;
    ctx.lineWidth = kw;
    ctx.stroke();
  }

  parts.forEach((part, i) => {
    const d = sh.drop[i];
    if (d >= 1) return;
    if (d > 0) return dropPiece(ctx, L, surf, part, d, m, sx);
    ctx.beginPath();
    poly(ctx, part.pts, m);
    ctx.strokeStyle = PLAN;
    ctx.lineWidth = 1;
    ctx.stroke();
    folds(ctx, part, m, L.k);
    const s = clamp(sh.elapsed[i] * CUT, 0, part.len);
    if (s <= 0) return;
    ctx.beginPath();
    trace(ctx, part, 0, s, m);
    ctx.strokeStyle = KERF;
    ctx.lineWidth = kw;
    ctx.stroke();
  });
}

/** The last second of kerf behind the tip: white-hot → orange → red → dark. */
function paintGlow(ctx: CanvasRenderingContext2D, L: Layout, sh: SheetState) {
  const sx = L.ox + sh.shift * L.S;
  const m: Map = { X: (u) => sx + u * L.S, Y: (v) => L.oy + v * L.S };
  const ds = 2.5 / L.S;
  ctx.lineCap = "round";
  NESTS[sh.variant].forEach((part, i) => {
    const e = sh.elapsed[i];
    const s1 = Math.min(part.len, e * CUT);
    const s0 = Math.max(0, (e - COOL) * CUT);
    if (e <= 0 || s0 >= s1) return;
    let a = pointAt(part, s0);
    for (let s = s0; s < s1; s += ds) {
      const sn = Math.min(s1, s + ds);
      const b = pointAt(part, sn);
      const age = clamp((e - sn / CUT) / COOL);
      ctx.beginPath();
      ctx.moveTo(m.X(a[0]), m.Y(a[1]));
      ctx.lineTo(m.X(b[0]), m.Y(b[1]));
      ctx.strokeStyle = heat(age);
      ctx.lineWidth = lerp(2.6, 1.3, age) * Math.max(0.75, L.k);
      ctx.stroke();
      a = b;
    }
    // Additive halo over the hottest stretch.
    ctx.globalCompositeOperation = "lighter";
    for (const [span, alpha, width] of [[0.45, 0.22, 7], [0.14, 0.4, 4]] as const) {
      const h0 = Math.max(s0, s1 - span * CUT);
      const fade = 1 - clamp((e * CUT - s1) / (span * CUT));
      if (h0 >= s1 || fade <= 0) continue;
      ctx.beginPath();
      trace(ctx, part, h0, s1, m);
      ctx.strokeStyle = `rgba(255,150,60,${alpha * fade})`;
      ctx.lineWidth = width * Math.max(0.7, L.k);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  });
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(220,226,232,0.5)";
  ctx.fillRect(x, y, w, 1);
}

/** Bridge across the table at the head's Y, carriage at its X, nozzle ring over the tip. */
function paintGantry(ctx: CanvasRenderingContext2D, L: Layout, head: P) {
  const k = L.k;
  const tx = L.ox + head[0] * L.S;
  const ty = L.oy + head[1] * L.S;
  const BH = 15 * k;
  const by = ty - 12 * k - BH;
  const cw = 36 * k;
  const et = 22 * k;

  // Soft shadow falling down the table from the bridge and carriage.
  const sh = ctx.createLinearGradient(0, by + BH, 0, by + BH + 20 * k);
  sh.addColorStop(0, "rgba(0,0,0,0.3)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, by + BH, L.w, 20 * k);

  box(ctx, 0, by, L.w, BH, "#626973", "#2d3137");
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, by + BH * 0.64, L.w, Math.max(1, 1.2 * k));
  // Cable chain lying in its tray on the bridge, from the left truck to the carriage.
  ctx.setLineDash([3.2 * k, 1.6 * k]);
  ctx.strokeStyle = "#1e2226";
  ctx.lineWidth = 4 * k;
  ctx.beginPath();
  ctx.moveTo(et, by + BH * 0.32);
  ctx.lineTo(Math.max(et, tx - cw / 2), by + BH * 0.32);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const x of [0, L.w - et]) box(ctx, x, by - 5 * k, et, BH + 10 * k, "#7d858f", "#3b4046");

  box(ctx, tx - 3.5 * k, by + BH - 2 * k, 7 * k, 12 * k, "#4a5057", "#2b2f34");
  box(ctx, tx - cw / 2, by - 7 * k, cw, BH + 13 * k, "#8e959e", "#4b5159");
  box(ctx, tx - cw * 0.28, by - 3 * k, cw * 0.56, BH * 0.62, "#3f454c", "#2a2e33");
  ctx.fillStyle = "rgba(20,22,25,0.55)";
  for (const dx of [-0.34, 0.34]) {
    ctx.beginPath();
    ctx.arc(tx + dx * cw, by - 2 * k, 1.3 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(tx, ty, 5 * k, 0, Math.PI * 2);
  ctx.strokeStyle = "#1c1f23";
  ctx.lineWidth = 3 * k;
  ctx.stroke();
  ctx.strokeStyle = "rgba(230,235,240,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function paintBloom(ctx: CanvasRenderingContext2D, L: Layout, f: Frame, t: number) {
  const x = L.ox + f.head[0] * L.S;
  const y = L.oy + f.head[1] * L.S;
  const I = f.torch;
  const flick = 0.9 + 0.1 * Math.sin(t * 53) * Math.sin(t * 31.7 + 1);
  ctx.globalCompositeOperation = "lighter";
  const spill = 72 * L.k;
  let g = ctx.createRadialGradient(x, y, 0, x, y, spill);
  g.addColorStop(0, `rgba(255,140,60,${Math.min(0.2, 0.15 * I)})`);
  g.addColorStop(1, "rgba(255,140,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - spill, y - spill, 2 * spill, 2 * spill);
  const r = (15 + 7 * I) * L.k * flick;
  g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,250,${Math.min(1, 0.95 * I)})`);
  g.addColorStop(0.12, `rgba(255,236,190,${Math.min(1, 0.8 * I)})`);
  g.addColorStop(0.38, `rgba(255,168,80,${Math.min(1, 0.32 * I)})`);
  g.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.globalCompositeOperation = "source-over";
}

export function paintFrame(ctx: CanvasRenderingContext2D, L: Layout, surf: Surfaces, f: Frame, sparks: Sparks | null, t: number) {
  ctx.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(surf.bed, 0, 0, L.w, L.h);
  for (const sh of f.sheets) paintSheet(ctx, L, surf, sh);
  for (const sh of f.sheets) paintGlow(ctx, L, sh);
  paintGantry(ctx, L, f.head);
  if (f.torch > 0) paintBloom(ctx, L, f, t);
  if (sparks) drawSparks(ctx, sparks, L.k);
}
