"use client";

import { useEffect, useId, useState } from "react";
import LogoMark, { LOGO_TAILS, LOGO_TIPS, LOGO_VIEWBOX } from "@/components/brand/LogoMark";
import { easeInOutCubic, seg } from "@/lib/motion";
import { useReducedMotion } from "@/lib/scroll";
import s from "./Hero.module.css";

/**
 * The mark draws itself, then its three streams run on as airflow lines:
 * upstream from each band's tail out across the copy (off the left edge), and
 * downstream from each arrowhead off the right edge. The streams SVG shares the
 * mark's viewBox and box, so both are in one coordinate space; overflow is
 * visible and the hero section clips it.
 */

const END = 4; // seconds — the timeline stops here
const COLORS = ["var(--blue)", "var(--green)", "var(--red)"];
const ENTRY_Y = [-150, 176, 470]; // far-left height of each stream (fans out)
const EXIT_Y = [262, 330, 402]; // far-right height (the deflection carries on)
const DURATIONS = ["0.8s", "0.72s", "0.88s"];

const STREAMS = COLORS.map((color, i) => {
  const [tx, ty] = LOGO_TAILS[i];
  const [hx, hy] = LOGO_TIPS[i];
  return {
    color,
    // drawn FROM the tail outward, so the line grows out of the mark
    up: `M${tx} ${ty}C${tx - 540} ${ty} ${tx - 760} ${ENTRY_Y[i]} ${tx - 1400} ${ENTRY_Y[i]}H-2100`,
    // leaves the tip along the arrow's heading, then levels out
    down: `M${hx} ${hy}C${hx + 150} ${hy + 36} ${hx + 300} ${EXIT_Y[i]} ${hx + 620} ${EXIT_Y[i]}H2700`,
  };
});

export default function HeroVisual() {
  const uid = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const [t, setT] = useState(0);

  useEffect(() => {
    if (reduced) {
      setT(END);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const sec = (now - start) / 1000;
      setT(Math.min(sec, END));
      if (sec < END) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const mark = easeInOutCubic(seg(t, 0.15, 2.35));
  const dashes = seg(t, 3, 3.9);

  return (
    <div className="relative mx-auto w-full max-w-[440px] lg:w-[108%] lg:max-w-none xl:w-[112%]">
      <svg
        viewBox={LOGO_VIEWBOX}
        aria-hidden
        fill="none"
        strokeLinecap="round"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        <defs>
          {/* upstream lines fade toward the far left, lightest behind the copy */}
          {COLORS.map((c, i) => (
            <linearGradient key={c} id={`${uid}g${i}`} gradientUnits="userSpaceOnUse" x1={-1000} x2={LOGO_TAILS[i][0]} y1={0} y2={0}>
              <stop offset="0" stopColor={c} stopOpacity={0.25} />
              <stop offset="1" stopColor={c} />
            </linearGradient>
          ))}
        </defs>
        {STREAMS.map((st, i) => {
          const p = easeInOutCubic(seg(t, 2 + i * 0.12, 3.6 + i * 0.12));
          const dur = { animationDuration: DURATIONS[i] };
          const upStroke = `url(#${uid}g${i})`;
          return (
            <g key={i} stroke={st.color}>
              {[st.up, st.down].map((d) => (
                <path
                  key={d}
                  d={d}
                  stroke={d === st.up ? upStroke : undefined}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - p}
                  strokeWidth={1.5}
                  strokeOpacity={0.3}
                />
              ))}
              <g opacity={dashes} strokeWidth={2.4} strokeOpacity={0.5}>
                <path d={st.up} stroke={upStroke} className={s.flowRev} style={dur} />
                <path d={st.down} className={s.flowFwd} style={dur} />
              </g>
            </g>
          );
        })}
      </svg>
      <LogoMark progress={mark} className="relative block h-auto w-full" />
    </div>
  );
}
