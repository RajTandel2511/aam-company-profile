"use client";

import { useEffect, useRef, useState } from "react";
import { prng, seg } from "@/lib/motion";
import { useInViewProgress } from "@/lib/scroll";
import { scene, STREAM_D, STREAM_HEAD, VIEW, VIEWBOX, type Face } from "./FabGeometry";
import { useLive } from "./StatsHooks";
import s from "./Fab.module.css";

/** Galvanized spangle: a few faint crystalline shards per tile, seeded so SSR and client agree. */
const SPANGLE = (() => {
  const rnd = prng(1994);
  return Array.from({ length: 9 }, () => {
    const cx = rnd() * 22;
    const cy = rnd() * 22;
    const r = 2 + rnd() * 4;
    const a0 = rnd() * Math.PI;
    const pts = [0, 1, 2, 3, 4].map((k) => {
      const a = a0 + (k * Math.PI * 2) / 5 + rnd() * 0.5;
      const rr = r * (0.6 + rnd() * 0.4);
      return `${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
    });
    return { d: `M${pts.join("L")}Z`, light: rnd() > 0.45, o: (0.035 + rnd() * 0.05).toFixed(3) };
  });
})();

function FaceShape({ f }: { f: Face }) {
  return (
    <g>
      <path d={f.d} fill={f.fill} fillRule="evenodd" />
      <path d={f.d} fill="url(#fab-spangle)" fillRule="evenodd" />
      <path d={f.solid} fill="none" stroke="var(--ink)" strokeOpacity={0.8} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {f.dashed && (
        <path d={f.dashed} fill="none" stroke="var(--ink)" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
      )}
    </g>
  );
}

const STAGES = ["01 · Flat pattern", "02 · Forming", "03 · Joining", "04 · Airflow"];

export default function FabFigure() {
  const ref = useRef<HTMLDivElement>(null);
  const raw = useInViewProgress(ref);
  const live = useLive(ref);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Before hydration (and without JS) show the finished run; after, scroll drives it.
  // The fold completes as the drawing's middle reaches the middle of the screen.
  const p = mounted ? raw : 1;
  const fold = seg(p, 0.1, 0.46);
  const join = seg(p, 0.46, 0.58);
  const flow = seg(p, 0.56, 0.66);
  const sc = scene(fold, join);
  const faces = [...sc.first, ...sc.second];
  const stage = fold <= 0 ? 0 : fold < 1 ? 1 : join < 1 ? 2 : 3;

  return (
    <figure>
      <div ref={ref} className={`${s.drafting} ${live ? s.live : ""} relative overflow-hidden rounded-md border border-line`}>
        <div aria-hidden className="eyebrow flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-2.5 text-graphite">
          <span>
            Fig. 01<span className="hidden sm:inline"> — Rectangular duct</span>
          </span>
          <span className="tabular-nums">
            Bends {String(sc.bends).padStart(3, "0")}°<span className="hidden sm:inline"> / 360°</span>
          </span>
        </div>
        <svg
          viewBox={VIEWBOX}
          role="img"
          aria-label="Diagram: a flat galvanized sheet folds along four bend lines into a rectangular duct section, a second section slides in and bolts on at a flanged joint, and air flows through the finished run."
          className="block h-auto w-full px-3 py-6 sm:px-8"
        >
          <defs>
            <pattern id="fab-spangle" width="22" height="22" patternUnits="userSpaceOnUse">
              {SPANGLE.map((sp, i) => (
                <path key={i} d={sp.d} fill={sp.light ? "white" : "var(--ink)"} fillOpacity={sp.o} />
              ))}
            </pattern>
          </defs>
          {sc.second.length > 0 && (
            <g opacity={sc.secondOpacity}>
              {sc.second.map((f) => (
                <FaceShape key={f.key} f={f} />
              ))}
            </g>
          )}
          {sc.first.map((f) => (
            <FaceShape key={f.key} f={f} />
          ))}
          <g opacity={sc.boltOpacity}>
            {sc.bolts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={2.6} fill="var(--ink)" />
            ))}
          </g>
          {flow > 0 && (
            <>
              {/* Solid where the air is outside the run; a hidden line (drafting dashes) where it is inside. */}
              <mask id="fab-outside">
                <rect {...VIEW} fill="white" />
                {faces.map((f) => (
                  <path key={f.key} d={f.d} fill="black" />
                ))}
              </mask>
              <mask id="fab-inside">
                <rect {...VIEW} fill="black" />
                {faces.map((f) => (
                  <path key={f.key} d={f.d} fill="white" />
                ))}
              </mask>
              <g mask="url(#fab-outside)">
                <path d={STREAM_D} pathLength={1} fill="none" stroke="var(--blue)" strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - flow} />
                <path d={STREAM_D} fill="none" stroke="var(--blue)" strokeWidth={2.5} strokeLinecap="round" className={s.flow} opacity={seg(flow, 0.6, 1)} />
              </g>
              <g mask="url(#fab-inside)" opacity={0.8 * seg(flow, 0.3, 1)}>
                <path d={STREAM_D} fill="none" stroke="var(--blue-ink)" strokeWidth={1.5} className={s.flow} />
              </g>
              <path d={STREAM_HEAD} fill="var(--blue)" opacity={seg(flow, 0.85, 1)} />
            </>
          )}
        </svg>
        <p aria-hidden className="eyebrow absolute bottom-3 right-4 text-blue-ink">
          {STAGES[stage]}
        </p>
      </div>
      <figcaption className="eyebrow mt-3 text-graphite">
        One-piece wrap · four bends · seam lap · flanged joint
      </figcaption>
    </figure>
  );
}
