"use client";

import { useRef } from "react";
import { equipmentBrands } from "@/lib/content";
import { useLive } from "./StatsHooks";
import s from "./Fab.module.css";

const DOTS = ["var(--blue)", "var(--green)", "var(--red)"];

// Names only, set in our own type — never the manufacturers' logos.
function Names({ hidden }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden || undefined} className={`flex shrink-0 items-center gap-x-10 gap-y-3 pr-10 ${hidden ? s.dup : ""}`}>
      {equipmentBrands.map((b, i) => (
        <li key={b} className="flex items-center gap-10 whitespace-nowrap">
          <span className="text-[clamp(1.5rem,3.2vw,2.5rem)] font-bold tracking-tight text-ink">{b}</span>
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: DOTS[i % 3] }} />
        </li>
      ))}
    </ul>
  );
}

export default function FabMarquee() {
  const ref = useRef<HTMLDivElement>(null);
  const live = useLive(ref);
  return (
    <div ref={ref} className={`${s.marquee} ${live ? s.live : ""} mt-5 border-y border-line py-6`}>
      <div className={s.track}>
        <Names />
        <Names hidden />
      </div>
    </div>
  );
}
