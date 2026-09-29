"use client";

import { useEffect, useRef, useState } from "react";
import { company, stats } from "@/lib/content";
import { easeInOutCubic, easeOutCubic, seg } from "@/lib/motion";
import { useStage } from "./StatsHooks";

const COUNT = 1.4; // s, per number
const STAGGER = 0.09; // s between columns
const END = (stats.length - 1) * STAGGER + 2.1; // last glint done
const STREAMS = ["var(--blue)", "var(--green)", "var(--red)"];

// A short airflow stream, drawn like one of the logo's arrows.
const STREAM_D = "M2 11 C28 3 78 2 110 8";
const HEAD_D = "M116.9 9.3 L108.2 11.9 L109.8 3.7 Z";

export default function Stats() {
  const ref = useRef<HTMLElement>(null);
  const stage = useStage(ref);
  const [clock, setClock] = useState(0);

  useEffect(() => {
    if (stage !== "play") return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const s = (now - t0) / 1000;
      setClock(s);
      if (s < END) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  // Server HTML and first paint show the finished numbers; only an off-screen
  // band is rewound to 0 and replayed when it arrives.
  const time = stage === "final" ? END : stage === "armed" ? 0 : clock;

  return (
    <section id="numbers" ref={ref} aria-labelledby="numbers-h" className="border-y border-line bg-white">
      <div className="container-x">
        <div className="flex items-center gap-4 border-b border-line py-5">
          <span aria-hidden className="flex flex-col gap-[3px]">
            {STREAMS.map((c) => (
              <span key={c} className="block h-[2px] w-5 rounded-full" style={{ background: c }} />
            ))}
          </span>
          <h2 id="numbers-h" className="eyebrow text-graphite">
            By the numbers
          </h2>
          <p className="eyebrow ml-auto hidden text-graphite sm:block">{company.region}</p>
        </div>

        <ul className="grid grid-cols-2 gap-px bg-line lg:grid-cols-5">
          {stats.map((s, i) => {
            const d0 = i * STAGGER;
            const n = Math.round(s.value * easeOutCubic(seg(time, d0, d0 + COUNT)));
            const draw = easeInOutCubic(seg(time, d0 + 0.2, d0 + 1.2));
            const head = seg(time, d0 + 1.05, d0 + 1.25);
            const glint = seg(time, d0 + 1.25, d0 + 2.0);
            const last = i === stats.length - 1;
            return (
              <li
                key={s.label}
                className={`bg-white px-4 py-8 sm:px-6 lg:py-12 ${last ? "col-span-2 lg:col-span-1" : ""}`}
              >
                <p className="display whitespace-nowrap text-[clamp(2.5rem,4.2vw,4.5rem)] tabular-nums text-ink">
                  <span aria-hidden>
                    {n}
                    {s.suffix && <span className="text-red">{s.suffix}</span>}
                  </span>
                  <span className="sr-only">
                    {s.value}
                    {s.suffix}
                  </span>
                </p>
                <svg aria-hidden viewBox="0 0 120 16" width="120" height="16" className="mt-3 block overflow-visible">
                  <path
                    d={STREAM_D}
                    pathLength={1}
                    fill="none"
                    stroke={STREAMS[i % 3]}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray="1 1"
                    strokeDashoffset={1 - draw}
                  />
                  <path d={HEAD_D} fill={STREAMS[i % 3]} opacity={head} />
                  {glint > 0 && glint < 1 && (
                    <path
                      d={STREAM_D}
                      pathLength={1}
                      fill="none"
                      stroke="white"
                      strokeOpacity={0.9}
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      strokeDasharray="0.14 2"
                      strokeDashoffset={0.14 - glint * 1.14}
                    />
                  )}
                </svg>
                <p className="mt-4 text-[15px] font-semibold leading-snug text-ink">{s.label}</p>
                <p className="eyebrow mt-2 text-graphite">{s.note}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
