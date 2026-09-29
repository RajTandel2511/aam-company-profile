"use client";

import { useRef, type CSSProperties } from "react";
import { useLive, useStage } from "./StatsHooks";
import s from "./Cred.module.css";

type Props = { label: string; value: string; detail: string; index: number; hasSeal: boolean };

const RIVETS = ["left-3 top-3", "right-3 top-3", "bottom-3 left-3", "bottom-3 right-3"];
const SEAL_TEXT = "SMALL BUSINESS · MINORITY BUSINESS · ";
const CIRCLE = "M50 50m-39 0a39 39 0 1 1 78 0a39 39 0 1 1-78 0";

/** Rotating mono-text seal ring; the three streams sit still in the middle. */
function Seal() {
  const ref = useRef<HTMLDivElement>(null);
  const live = useLive(ref);
  return (
    <div ref={ref} aria-hidden className={`${live ? s.live : ""} w-[72px] shrink-0 sm:w-24 lg:w-28`}>
      <svg viewBox="0 0 100 100" className="block h-auto w-full">
        <circle cx="50" cy="50" r="47" fill="none" stroke="var(--ink)" strokeOpacity={0.45} strokeWidth={0.8} />
        <circle cx="50" cy="50" r="31" fill="none" stroke="var(--ink)" strokeOpacity={0.45} strokeWidth={0.8} />
        <g className={s.spin}>
          <path id="cred-seal-path" d={CIRCLE} fill="none" />
          <text className="mono" fontSize="8.4" fontWeight={600} fill="var(--ink)">
            <textPath href="#cred-seal-path" textLength="243" lengthAdjust="spacing">
              {SEAL_TEXT}
            </textPath>
          </text>
        </g>
        {["var(--blue)", "var(--green)", "var(--red)"].map((c, i) => (
          <path key={c} d={`M34 ${44 + i * 6} Q50 ${39 + i * 6} 66 ${45 + i * 6}`} fill="none" stroke={c} strokeWidth={3.2} strokeLinecap="round" />
        ))}
      </svg>
    </div>
  );
}

export default function CredPlate({ label, value, detail, index, hasSeal }: Props) {
  const ref = useRef<HTMLLIElement>(null);
  const stage = useStage(ref);
  return (
    <li ref={ref} className={`${s.wrap} ${s[stage] ?? ""}`} style={{ "--d": `${index * 90}ms` } as CSSProperties}>
      <span aria-hidden className={s.shadow} />
      <div className={`${s.plate} flex items-center gap-4 px-6 py-8 sm:px-9 sm:py-10`}>
        {RIVETS.map((pos) => (
          <span key={pos} aria-hidden className={`${s.rivet} ${pos}`} />
        ))}
        <div className="flex-1">
          <p className="eyebrow text-ink/80">{label}</p>
          <p className={`display ${s.engraved} mt-3 whitespace-nowrap text-[clamp(1.75rem,4.2vw,3.25rem)] text-ink`}>{value}</p>
          <p className="mt-3 text-[15px] leading-snug text-ink/80">{detail}</p>
        </div>
        {hasSeal && <Seal />}
      </div>
    </li>
  );
}
