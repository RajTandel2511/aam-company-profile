"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { currentProjects, sectors, type Sector } from "@/lib/content";
import { useReducedMotion } from "@/lib/scroll";
import styles from "./Work.module.css";

type Filter = Sector | "All";

const STREAMS = ["blue", "green", "red"] as const;
const OUT_MS = 170; // leaving cards fade/scale out, then the new set rises in
const STAGGER_CAP = 6; // cards past the 7th share the last delay, so the whole set lands in ~0.7s

/** Sector -> brand stream colour, cycling blue / green / red in content order. */
const streamFor = (s: Sector) => `var(--${STREAMS[sectors.indexOf(s) % STREAMS.length]})`;

const byFilter = (f: Filter) =>
  f === "All" ? currentProjects : currentProjects.filter((p) => p.sector === f);

const FILTERS: Filter[] = ["All", ...sectors];

export default function WorkProjects() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<Filter>("All"); // what the chips show
  const [shown, setShown] = useState<Filter>("All"); // what the list renders
  // True only once a list has been swapped in by a filter change. Set at swap time,
  // never on click: the outgoing list must not pick up the entrance animation.
  const [swapped, setSwapped] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const pick = (f: Filter) => {
    if (f === active) return;
    setActive(f);
    window.clearTimeout(timer.current);
    const swap = () => {
      setShown(f);
      setSwapped(true);
    };
    if (reduced) swap();
    else timer.current = window.setTimeout(swap, OUT_MS);
  };

  const count = byFilter(active).length;
  const list = byFilter(shown);
  const leaving = active !== shown;

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div role="group" aria-label="Filter projects by sector" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const on = f === active;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                aria-controls="work-list"
                onClick={() => pick(f)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold leading-none transition-colors duration-200 sm:text-sm ${
                  on ? "border-ink bg-ink text-white" : "border-ink/15 bg-transparent text-ink hover:border-ink/45"
                }`}
              >
                {f !== "All" && (
                  <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: streamFor(f) }} />
                )}
                {f}
                <span className={`mono text-[11px] font-medium ${on ? "text-white/70" : "text-graphite"}`}>
                  {byFilter(f).length}
                </span>
              </button>
            );
          })}
        </div>
        <p aria-live="polite" className="eyebrow shrink-0 text-graphite lg:pt-2">
          <span className="text-ink">{count}</span> {count === 1 ? "project" : "projects"} · in progress
        </p>
      </div>

      <ul
        id="work-list"
        key={shown}
        className={`mt-8 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 ${swapped ? styles.enter : ""} ${
          leaving ? styles.leaving : ""
        }`}
      >
        {list.map((p, i) => (
          <li
            key={`${p.name}|${p.city}`}
            className={`${styles.card} group relative flex flex-col border border-ink/10 bg-white py-4 pl-5 pr-3 hover:border-ink/30 sm:pr-4`}
            style={{ "--i": Math.min(i, STAGGER_CAP) } as CSSProperties}
          >
            <span
              aria-hidden
              className={`${styles.edge} absolute inset-y-0 left-0 w-[3px] transition-transform duration-300 ease-out group-hover:scale-x-[2]`}
              style={{ background: streamFor(p.sector) }}
            />
            <p className="eyebrow text-graphite">{p.city}</p>
            <h3 className="mt-1.5 text-[15px] font-bold leading-snug text-ink sm:text-base">{p.name}</h3>
            <p className="mt-auto pt-3 text-[13px] leading-snug text-graphite">{p.sector}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
