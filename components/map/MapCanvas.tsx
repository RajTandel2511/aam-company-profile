"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { MAP_H, MAP_W } from "@/lib/bayarea";
import { easeInOutCubic, easeOutBack, easeOutCubic, seg } from "@/lib/motion";
import { useInViewOnce, useReducedMotion } from "@/lib/scroll";
import MapBase from "./MapBase";
import { CITIES, HQ_CITY, HQ_X, HQ_Y, POP_DURATION, TOTAL, T_END, T_HQ, flowStyle, pointAt, type City } from "./geometry";
import styles from "./Map.module.css";

type Props = {
  shown: string | null;
  onHover: (city: string | null) => void;
  onPick: (city: string) => void;
};

const LABEL = `Map of the San Francisco Bay Area: ${TOTAL} active projects in ${CITIES.length} cities, drawn as arcs from headquarters in ${HQ_CITY}. ${CITIES.filter((c) => c.count >= 3)
  .map((c) => `${c.name} ${c.count}`)
  .join(", ")}; the rest have one or two each.`;

/** Seconds since `start` became true, frozen at T_END. Reduced motion jumps straight to the end. */
function useClock(start: boolean, reduced: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reduced) {
      setT(T_END);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const s = (now - t0) / 1000;
      setT(Math.min(s, T_END));
      if (s < T_END) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, reduced]);
  return t;
}

/** Live visibility, so the ambient loops pause off-screen. */
function useOnScreen(ref: RefObject<HTMLElement>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return on;
}

const vars = (v: Record<string, string>) => v as CSSProperties;

function Arc({ c, i, t, state }: { c: City; i: number; t: number; state: State }) {
  const p = easeInOutCubic(seg(t, c.start, c.arrive));
  if (!c.d || p <= 0) return null;
  const on = state === "on";
  const f = flowStyle(c, i);
  const [hx, hy] = pointAt(c, p);
  return (
    <g className="transition-opacity duration-300" style={{ opacity: state === "dim" ? 0.1 : 1 }}>
      <path
        d={c.d}
        pathLength={1}
        fill="none"
        stroke={c.stream.fill}
        strokeWidth={on ? 3.5 : 2}
        strokeOpacity={on ? 1 : 0.62}
        strokeLinecap="round"
        strokeDasharray="1 1"
        strokeDashoffset={1 - p}
      />
      <path
        d={c.d}
        pathLength={1}
        fill="none"
        stroke={c.stream.glow}
        strokeWidth={on ? 5 : 3.5}
        strokeLinecap="round"
        className={styles.flow}
        style={vars({ "--dash": f.dasharray, "--dur": f.dur, "--delay": f.delay })}
      />
      {p < 1 && <circle cx={hx} cy={hy} r={5} fill={c.stream.glow} />}
    </g>
  );
}

type State = "on" | "dim" | "idle";

function Marker({ c, t, state, onHover, onPick }: { c: City; t: number; state: State } & Omit<Props, "shown">) {
  const s = easeOutBack(seg(t, c.arrive, c.arrive + POP_DURATION));
  if (s <= 0) return null;
  const on = state === "on";
  return (
    <g
      transform={`translate(${c.x} ${c.y}) scale(${s})`}
      className="cursor-pointer transition-opacity duration-300"
      style={{ opacity: state === "dim" ? 0.25 : 1 }}
      onMouseEnter={() => onHover(c.name)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onPick(c.name)}
    >
      <circle r={c.r + (on ? 9 : 5)} fill="none" stroke={c.stream.fill} strokeOpacity={on ? 1 : 0.4} strokeWidth={1.6} />
      <circle r={c.r} fill={c.stream.fill} />
      <circle r={Math.max(c.r + 8, 20)} fill="transparent" />
    </g>
  );
}

function Label({ c, t, state }: { c: City; t: number; state: State }) {
  const on = state === "on";
  if (c.isHQ || (c.labelTier === 0 && !on)) return null;
  const o = seg(t, c.arrive + 0.1, c.arrive + 0.5);
  const tier = c.labelTier === 1 && !on ? styles.tier1 : "";
  return (
    <text
      x={c.x + c.label.dx}
      y={c.y + c.label.dy}
      dy="0.35em"
      textAnchor={c.label.anchor}
      fill="var(--paper)"
      className={`${styles.label} ${tier} transition-opacity duration-300`}
      style={{ opacity: state === "dim" ? 0.12 * o : o }}
    >
      {c.name}
      {(c.count >= 3 || on) && (
        <tspan className="mono" fill={c.stream.glow} dx="0.35em">
          {c.count}
        </tspan>
      )}
    </text>
  );
}

function Hq({ t, dim }: { t: number; dim: boolean }) {
  const p = easeOutCubic(seg(t, 0, T_HQ));
  const pulse = { fill: "none", stroke: "var(--red)", strokeWidth: 2 } as const;
  return (
    <g className="transition-opacity duration-300" style={{ opacity: dim ? 0.45 : 1 }}>
      <circle cx={HQ_X} cy={HQ_Y} r={22} {...pulse} className={styles.pulse} />
      <circle cx={HQ_X} cy={HQ_Y} r={22} {...pulse} className={styles.pulse} style={vars({ "--delay": "1.4s" })} />
      <circle
        cx={HQ_X}
        cy={HQ_Y}
        r={22}
        fill="none"
        stroke="var(--red)"
        strokeWidth={4}
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - p}
        transform={`rotate(-90 ${HQ_X} ${HQ_Y})`}
      />
      <g className="pointer-events-none" style={{ opacity: seg(t, 0.2, T_HQ + 0.2) }}>
        <text x={HQ_X + 34} y={HQ_Y - 4} dy="0.35em" fill="rgb(var(--red-glow-rgb))" className={`${styles.label} mono`}>
          HQ
        </text>
        <text x={HQ_X + 34} y={HQ_Y + 20} dy="0.35em" fill="var(--paper)" className={`${styles.label} ${styles.tier1}`}>
          {HQ_CITY}
        </text>
      </g>
    </g>
  );
}

export default function MapCanvas({ shown, onHover, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const seen = useInViewOnce(ref, 0.3);
  const onScreen = useOnScreen(ref);
  const t = useClock(seen, reduced);
  const live = !reduced && onScreen && t >= T_END;
  const stateOf = (c: City): State => (!shown ? "idle" : shown === c.name ? "on" : "dim");
  const hqCity = CITIES.find((c) => c.isHQ);

  return (
    <div
      ref={ref}
      className="relative mx-auto w-full max-w-[560px] lg:h-[min(100vh-6rem,1040px)] lg:w-auto lg:max-w-none"
      style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}
    >
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        role="img"
        aria-label={LABEL}
        className={`block h-full w-full select-none font-sans ${live ? styles.live : ""}`}
      >
        <MapBase />
        <g>
          {CITIES.map((c, i) => (
            <Arc key={c.name} c={c} i={i} t={t} state={stateOf(c)} />
          ))}
        </g>
        <g>
          {CITIES.map((c) => (
            <Marker key={c.name} c={c} t={t} state={stateOf(c)} onHover={onHover} onPick={onPick} />
          ))}
        </g>
        <Hq t={t} dim={!!shown && shown !== hqCity?.name} />
        <g className="pointer-events-none">
          {CITIES.map((c) => (
            <Label key={c.name} c={c} t={t} state={stateOf(c)} />
          ))}
        </g>
      </svg>
    </div>
  );
}
