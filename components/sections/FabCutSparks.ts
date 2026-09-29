/**
 * Spark spray from the cutting tip. A fixed ring buffer (the oldest spark is
 * overwritten, so there are never more than MAX alive), seeded PRNG, positions
 * in CSS px. Drawn additively as short motion-blurred streaks, batched by heat.
 */
import { prng } from "@/lib/motion";
import type { Mode } from "./FabCutPlan";
import type { P } from "./FabCutNest";

const MAX = 250;
const TAU = Math.PI * 2;
const HEAT = [
  { upTo: 0.18, color: "rgba(255,250,232,1)", w: 1.5 },
  { upTo: 0.42, color: "rgba(255,212,130,0.95)", w: 1.3 },
  { upTo: 0.7, color: "rgba(255,146,54,0.8)", w: 1.15 },
  { upTo: 1, color: "rgba(214,84,36,0.5)", w: 1 },
];

export type Sparks = {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  age: Float32Array;
  life: Float32Array;
  next: number;
  carry: number;
  rnd: () => number;
};

export function createSparks(seed: number): Sparks {
  const f = () => new Float32Array(MAX);
  const life = f();
  return { x: f(), y: f(), vx: f(), vy: f(), age: f(), life, next: 0, carry: 0, rnd: prng(seed) };
}

export function clearSparks(sp: Sparks) {
  sp.age.fill(0);
  sp.life.fill(0);
  sp.carry = 0;
}

/** Emit for `dt` seconds at the tip (x, y). Cutting trails behind the travel and falls; piercing blows out all round. */
export function emitSparks(sp: Sparks, dt: number, x: number, y: number, dir: P, mode: Mode, torch: number, k: number) {
  if (mode === 0) return;
  sp.carry += dt * (mode === 1 ? 460 : 240) * Math.min(1, torch);
  const bx = -dir[0] * 0.8;
  const by = -dir[1] * 0.8 + 0.9;
  const base = Math.atan2(by, bx);
  const r = sp.rnd;
  while (sp.carry >= 1) {
    sp.carry -= 1;
    const i = sp.next;
    sp.next = (i + 1) % MAX;
    const a = mode === 1 ? r() * TAU : base + (r() - 0.5) * 1.7;
    const v = (mode === 1 ? 40 + r() * 190 : 70 + r() * r() * 280) * k;
    sp.x[i] = x + (r() - 0.5) * 2 * k;
    sp.y[i] = y + (r() - 0.5) * 2 * k;
    sp.vx[i] = Math.cos(a) * v;
    sp.vy[i] = Math.sin(a) * v - (mode === 1 ? 30 * k : 0);
    sp.age[i] = 0;
    sp.life[i] = 0.25 + r() * 0.55;
  }
}

export function stepSparks(sp: Sparks, dt: number, k: number) {
  const drag = Math.exp(-2.4 * dt);
  const g = 540 * k * dt;
  for (let i = 0; i < MAX; i++) {
    if (sp.age[i] >= sp.life[i]) continue;
    sp.vx[i] *= drag;
    sp.vy[i] = sp.vy[i] * drag + g;
    sp.x[i] += sp.vx[i] * dt;
    sp.y[i] += sp.vy[i] * dt;
    sp.age[i] += dt;
  }
}

export function drawSparks(ctx: CanvasRenderingContext2D, sp: Sparks, k: number) {
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  let lo = 0;
  for (const band of HEAT) {
    ctx.beginPath();
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (sp.age[i] >= sp.life[i]) continue;
      const f = sp.age[i] / sp.life[i];
      if (f < lo || f >= band.upTo) continue;
      ctx.moveTo(sp.x[i], sp.y[i]);
      ctx.lineTo(sp.x[i] - sp.vx[i] * 0.022, sp.y[i] - sp.vy[i] * 0.022);
      any = true;
    }
    if (any) {
      ctx.strokeStyle = band.color;
      ctx.lineWidth = band.w * Math.max(0.75, k);
      ctx.stroke();
    }
    lo = band.upTo;
  }
  ctx.globalCompositeOperation = "source-over";
}
