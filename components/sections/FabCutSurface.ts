/**
 * Static layers of the cutting table, painted once per size into offscreen
 * canvases: the dark slat bed with its side rails, and the galvanized sheet
 * (sheen, spangle, mill streaks, soft shadow). Per-frame drawing only blits them.
 */
import { clamp, prng } from "@/lib/motion";
import { SHEET_H, SHEET_W } from "./FabCutNest";

export type Layout = { w: number; h: number; dpr: number; S: number; ox: number; oy: number; k: number; pad: number };
export type Surfaces = { bed: HTMLCanvasElement; sheet: HTMLCanvasElement };

const TAU = Math.PI * 2;

/** Sheet placement for a w × h (CSS px) frame. S = px per sheet unit, k = detail scale. */
export function fit(w: number, h: number, dpr: number): Layout {
  const S = Math.min((w * 0.86) / SHEET_W, (h * 0.68) / SHEET_H);
  const k = clamp(S / 330, 0.45, 1.3);
  return { w, h, dpr, S, ox: (w - S * SHEET_W) / 2, oy: (h - S * SHEET_H) / 2, k, pad: Math.ceil(26 * k) };
}

function layer(w: number, h: number, dpr: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.scale(dpr, dpr);
  return [c, g];
}

let tile: HTMLCanvasElement | null = null;

/**
 * Seamless spangle tile: toroidal Voronoi grains, each with its own tone and a
 * faint feathered grain direction, darker at the grain boundaries. Stored as
 * white/black at low alpha so it overlays any base.
 */
function spangle(): HTMLCanvasElement {
  if (tile) return tile;
  const N = 180;
  const rnd = prng(1994);
  const seeds = Array.from({ length: 64 }, () => ({
    x: rnd() * N,
    y: rnd() * N,
    tone: rnd() * 2 - 1,
    ca: Math.cos(rnd() * Math.PI),
    sa: 0,
    f: 0.55 + rnd() * 0.8,
  }));
  seeds.forEach((s) => (s.sa = Math.sqrt(1 - s.ca * s.ca)));
  const img = new ImageData(N, N);
  const wrap = (d: number) => (d > N / 2 ? d - N : d < -N / 2 ? d + N : d);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let d1 = Infinity;
      let d2 = Infinity;
      let best = 0;
      for (let i = 0; i < seeds.length; i++) {
        const dx = wrap(x - seeds[i].x);
        const dy = wrap(y - seeds[i].y);
        const d = dx * dx + dy * dy;
        if (d < d1) {
          d2 = d1;
          d1 = d;
          best = i;
        } else if (d < d2) d2 = d;
      }
      const s = seeds[best];
      const along = wrap(x - s.x) * s.ca + wrap(y - s.y) * s.sa;
      const across = -wrap(x - s.x) * s.sa + wrap(y - s.y) * s.ca;
      const feather = Math.sin(along * s.f) * Math.cos(across * 0.21);
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      let v = s.tone * 12 + feather * 1.8 + (rnd() - 0.5) * 5;
      if (edge < 1.2) v -= 9 * (1 - edge / 1.2);
      const o = (y * N + x) * 4;
      const c = v > 0 ? 255 : 0;
      img.data[o] = c;
      img.data[o + 1] = c;
      img.data[o + 2] = c;
      img.data[o + 3] = Math.min(255, Math.abs(v) * 1.4);
    }
  }
  const [c, g] = layer(N, N, 1);
  g.putImageData(img, 0, 0);
  tile = c;
  return c;
}

function paintSheet(L: Layout): HTMLCanvasElement {
  const W = SHEET_W * L.S;
  const H = SHEET_H * L.S;
  const [c, g] = layer(W + 2 * L.pad, H + 2 * L.pad, L.dpr);
  g.translate(L.pad, L.pad);

  // Shadow on the slats (shadow metrics are in device pixels, outside the transform).
  g.save();
  g.shadowColor = "rgba(0,0,0,0.65)";
  g.shadowBlur = 14 * L.k * L.dpr;
  g.shadowOffsetY = 5 * L.k * L.dpr;
  g.fillStyle = "#a7acb2";
  g.fillRect(0, 0, W, H);
  g.restore();

  const base = g.createLinearGradient(0, 0, W * 0.8, H * 1.4);
  base.addColorStop(0, "#b4b9bf");
  base.addColorStop(0.32, "#d3d7dc");
  base.addColorStop(0.46, "#c1c5cb");
  base.addColorStop(0.78, "#a9aeb5");
  base.addColorStop(1, "#9ca1a8");
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  const pat = g.createPattern(spangle(), "repeat");
  if (pat) {
    g.fillStyle = pat;
    g.fillRect(0, 0, W, H);
  }

  // Mill streaks along the rolling direction.
  const rnd = prng(77);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${0.05 + rnd() * 0.07})` : `rgba(40,44,50,${0.03 + rnd() * 0.04})`;
    const x = rnd() * W * 0.8;
    g.fillRect(x, rnd() * H, Math.min(W - x, (0.15 + rnd() * 0.6) * W), 0.7);
  }

  g.fillStyle = "rgba(255,255,255,0.6)";
  g.fillRect(0, 0, W, 1);
  g.fillRect(0, 0, 1, H);
  g.fillStyle = "rgba(20,22,25,0.45)";
  g.fillRect(0, H - 1, W, 1);
  g.fillRect(W - 1, 0, 1, H);
  return c;
}

function paintSlats(g: CanvasRenderingContext2D, L: Layout) {
  const rnd = prng(314);
  const gap = 0.085 * L.S;
  const sw = Math.max(1.4, 2.8 * L.k);
  for (let x = (L.ox % gap) - gap; x < L.w + gap; x += gap) {
    g.fillStyle = "#2b2f35";
    g.fillRect(x, 0, sw, L.h);
    g.fillStyle = "rgba(150,158,168,0.4)";
    g.fillRect(x, 0, Math.max(0.6, sw * 0.32), L.h);
    // Tops worn into notches where cuts have crossed them, with the odd bead of slag.
    for (let y = rnd() * 30; y < L.h; y += (8 + rnd() * 46) * Math.max(0.6, L.k)) {
      if (rnd() > 0.45) continue;
      const len = (2 + rnd() * 7) * Math.max(0.6, L.k);
      g.fillStyle = "#131518";
      g.fillRect(x - 0.3, y, sw + 0.6, len);
      if (rnd() < 0.5) {
        g.fillStyle = `rgba(160,164,170,${0.35 + rnd() * 0.3})`;
        g.beginPath();
        g.arc(x + sw / 2 + (rnd() - 0.5) * 4 * L.k, y + len + L.k, (0.6 + rnd() * 1.1) * L.k, 0, TAU);
        g.fill();
      }
    }
  }
  // Faint heat tint on the slat tops.
  for (let i = 0; i < 16; i++) {
    const x = rnd() * L.w;
    const y = rnd() * L.h;
    const r = (14 + rnd() * 44) * L.k;
    const tint = g.createRadialGradient(x, y, 0, x, y, r);
    tint.addColorStop(0, "rgba(150,96,56,0.08)");
    tint.addColorStop(1, "rgba(150,96,56,0)");
    g.fillStyle = tint;
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

function paintBed(L: Layout): HTMLCanvasElement {
  const [c, g] = layer(L.w, L.h, L.dpr);
  const bg = g.createLinearGradient(0, 0, 0, L.h);
  bg.addColorStop(0, "#15171a");
  bg.addColorStop(1, "#1b1e22");
  g.fillStyle = bg;
  g.fillRect(0, 0, L.w, L.h);
  // Cross supports under the slats.
  g.fillStyle = "rgba(0,0,0,0.4)";
  for (const f of [0.28, 0.72]) g.fillRect(0, L.h * f, L.w, 6 * L.k);
  paintSlats(g, L);

  const vig = g.createRadialGradient(L.w / 2, L.h / 2, L.h * 0.2, L.w / 2, L.h / 2, L.w * 0.7);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = vig;
  g.fillRect(0, 0, L.w, L.h);

  // Gantry rails down both sides, rack teeth on the inner edge.
  const rw = Math.max(6, 11 * L.k);
  for (const rx of [0, L.w - rw]) {
    const gr = g.createLinearGradient(rx, 0, rx + rw, 0);
    gr.addColorStop(0, "#353a40");
    gr.addColorStop(0.45, "#7a818a");
    gr.addColorStop(1, "#2a2e33");
    g.fillStyle = gr;
    g.fillRect(rx, 0, rw, L.h);
    g.fillStyle = "rgba(0,0,0,0.5)";
    const tx = rx === 0 ? rw - 2.4 * L.k : rx;
    for (let y = 0; y < L.h; y += 4.4 * L.k) g.fillRect(tx, y, 2.4 * L.k, 2 * L.k);
  }
  return c;
}

export function makeSurfaces(L: Layout): Surfaces {
  return { bed: paintBed(L), sheet: paintSheet(L) };
}
