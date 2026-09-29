"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/scroll";
import { FOLD_COUNT, NESTS } from "./FabCutNest";
import { frameAt, staticFrame, type Label } from "./FabCutPlan";
import { paintFrame } from "./FabCutPaint";
import { clearSparks, createSparks, emitSparks, stepSparks } from "./FabCutSparks";
import { fit, makeSurfaces, type Layout, type Surfaces } from "./FabCutSurface";

const COUNT = NESTS[0].length;
const START: Label = { kind: "next", part: 0 };

function status(l: Label): [string, string] {
  const name = NESTS[0][l.part].name;
  const n = `Part ${l.part + 1} / ${COUNT}`;
  if (l.kind === "next") return [`Next · ${name}`, n];
  if (l.kind === "cut") return [`Cutting · ${name}`, n];
  return [l.kind === "done" ? "Nest complete" : "Sheet change", `${COUNT} / ${COUNT} parts cut`];
}

/**
 * The cutting table: looking down on a galvanized sheet on a slat bed while a
 * gantry-mounted head traces a nest of flat duct-fitting patterns. Canvas,
 * DPR- and resize-aware; runs only while on screen and the tab is visible.
 */
export default function FabCutTable() {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [label, setLabel] = useState<Label>(START);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!box || !canvas || !ctx) return;

    let L: Layout | null = null;
    let surf: Surfaces | null = null;
    let t = 0;
    let raf = 0;
    let last = 0;
    let inView = false;
    let shown = "";
    const sparks = createSparks(7);

    const publish = (l: Label) => {
      const key = `${l.kind}${l.part}`;
      if (key === shown) return; // React hears about part changes only, never frames
      shown = key;
      setLabel(l);
    };
    const draw = () => {
      if (!L || !surf) return;
      const f = reduced ? staticFrame() : frameAt(t);
      paintFrame(ctx, L, surf, f, reduced ? null : sparks, t);
      publish(f.label);
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!L || !surf) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      t += dt;
      const f = frameAt(t);
      emitSparks(sparks, dt, L.ox + f.head[0] * L.S, L.oy + f.head[1] * L.S, f.dir, f.mode, f.torch, L.k);
      stepSparks(sparks, dt, L.k);
      paintFrame(ctx, L, surf, f, sparks, t);
      publish(f.label);
    };
    const run = () => {
      const want = !reduced && inView && !document.hidden;
      if (want && !raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      } else if (!want && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    // Resizing clears the canvas, so repaint in the same callback: no blank frame.
    const ro = new ResizeObserver(() => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      L = fit(w, h, dpr);
      surf = makeSurfaces(L);
      clearSparks(sparks);
      draw();
    });
    ro.observe(box);

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.3) inView = true;
        else if (!e.isIntersecting) inView = false;
        run();
      },
      { threshold: [0, 0.3] },
    );
    if (!reduced) io.observe(box);
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
    };
  }, [reduced]);

  const [line, sub] = status(label);
  const hot = label.kind === "cut";

  return (
    <figure>
      <div ref={boxRef} className="relative aspect-[4/3] overflow-hidden rounded-md border border-line bg-night sm:aspect-[16/10]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Animated diagram: looking down on a cutting table. A head on a gantry traces ${COUNT} flat duct-fitting patterns nested on a galvanized sheet — elbow cheeks, throat and heel strips, a duct wrap, a transition, an end cap and an offset side — sparks trailing the glowing cut. Each part drops through the slat bed as its outline closes, then the sheet slides off and a fresh one slides in.`}
          className="absolute inset-0 block h-full w-full"
        />
        <div aria-hidden className="pointer-events-none absolute left-2 top-2 rounded-sm bg-night/75 px-2 py-1 ring-1 ring-white/10 sm:left-4 sm:top-4 sm:px-2.5 sm:py-1.5">
          <p className="eyebrow text-[10px] text-paper sm:text-[12px]">Flat pattern nest</p>
          <p className="eyebrow text-[10px] text-silver sm:text-[12px]">Diagrammatic</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute bottom-2 left-2 rounded-sm bg-night/75 px-2 py-1 ring-1 ring-white/10 sm:bottom-4 sm:left-4 sm:px-2.5 sm:py-1.5">
          <p className="eyebrow flex items-center gap-2 text-[10px] text-paper sm:text-[12px]">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${hot ? "bg-[#ff9a3c] shadow-[0_0_8px_2px_rgba(255,140,50,0.7)]" : "bg-silver"}`} />
            {line}
          </p>
          <p className="eyebrow text-[10px] tabular-nums text-silver sm:text-[12px]">{sub}</p>
        </div>
      </div>
      <figcaption className="eyebrow mt-3 text-graphite">
        {COUNT} flat patterns · one sheet · {FOLD_COUNT} fold lines
      </figcaption>
    </figure>
  );
}
