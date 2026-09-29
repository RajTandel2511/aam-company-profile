"use client";

import { useEffect, useMemo, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { useReducedMotion } from "@/lib/scroll";
import { faces, viewBox, type FaceOut } from "./FabLibGeometry";
import { FITTINGS } from "./FabLibFittings";
import { useLive, useStage } from "./StatsHooks";
import s from "./FabLib.module.css";

const FOLD_S = 1.4; // flat -> folded
const UNFOLD_S = 0.8; // folded -> flat
const STAGGER_MS = 150;

function useTabVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === "visible");
    on();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible;
}

/** Moves fold `f` toward `target` on rAF, only while `run`; jumps straight there when `instant`. */
function useFold(target: number, run: boolean, instant: boolean): number {
  const [f, setF] = useState(target);
  const cur = useRef(f);
  useEffect(() => {
    if (instant) {
      cur.current = target;
      setF(target);
      return;
    }
    if (!run || cur.current === target) return;
    const dur = target > cur.current ? FOLD_S : UNFOLD_S;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const step = Math.min(0.05, (now - last) / 1000) / dur;
      last = now;
      const c = cur.current;
      cur.current = c < target ? Math.min(target, c + step) : Math.max(target, c - step);
      setF(cur.current);
      if (cur.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, instant]);
  return f;
}

const hairline = { fill: "none", stroke: "var(--ink)", strokeWidth: 1, vectorEffect: "non-scaling-stroke", strokeLinejoin: "round" } as const;

function Face({ x }: { x: FaceOut }) {
  return (
    <g>
      <path d={x.d} fill={x.fill} />
      {x.faint && <path d={x.faint} {...hairline} strokeOpacity={0.22} />}
      {x.solid && <path d={x.solid} {...hairline} strokeOpacity={0.8} />}
      {x.dashed && <path d={x.dashed} {...hairline} strokeOpacity={0.7} strokeDasharray="4 3" />}
    </g>
  );
}

const air = { fill: "none", stroke: "var(--blue)", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export default function FabLibCard({ index }: { index: number }) {
  const fit = FITTINGS[index];
  const ref = useRef<HTMLLIElement>(null);
  const stage = useStage(ref);
  const live = useLive(ref);
  const tab = useTabVisible();
  const reduced = useReducedMotion();
  const [entered, setEntered] = useState(true);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pin, setPin] = useState<number | null>(null); // set by the switch; overrides hover and focus

  // Off-screen at mount: lie flat, then fold up (staggered across the row) once scrolled to.
  useEffect(() => {
    if (stage === "armed") setEntered(false);
    if (stage !== "play") return;
    const t = window.setTimeout(() => setEntered(true), index * STAGGER_MS);
    return () => window.clearTimeout(t);
  }, [stage, index]);

  const peek = (hover || focus) && !reduced;
  const target = pin ?? (entered && !peek ? 1 : 0);
  const f = useFold(target, live && tab, reduced || !entered);
  const shown = useMemo(() => faces(fit, f), [fit, f]);
  // The switch shows only what the visitor pinned. Hover/focus is a preview and must not flip it —
  // otherwise a mouse user's click toggles relative to the preview and pins the opposite state.
  const flat = pin === 0;
  const on = f === 1 && target === 1;
  const state = f <= 0 ? "Flat pattern" : f >= 1 ? "Folded" : target ? "Folding" : "Unfolding";

  const onPointerEnter = (e: PointerEvent) => setHover(e.pointerType === "mouse");
  // Keyboard focus opens the card; a tap or click on the switch does not (it toggles instead).
  const onFocus = (e: FocusEvent) => {
    let keyboard = true;
    try {
      keyboard = (e.target as Element).matches(":focus-visible");
    } catch {
      /* no :focus-visible support: treat focus as keyboard */
    }
    setFocus(keyboard);
  };

  const tail = <path d={fit.flow.tail} pathLength={1} className={s.draw} {...air} />;
  const label = !target
    ? `${fit.name}, flat pattern: every panel laid out in one plane, fold lines dashed. ${fit.label}.`
    : `${fit.name}, folded: the panels turned up along their fold lines into the finished fitting, with air flowing through it. ${fit.label}.`;

  return (
    <li
      ref={ref}
      className="flex flex-col"
      onPointerEnter={onPointerEnter}
      onPointerLeave={() => setHover(false)}
      onFocus={onFocus}
      onBlur={() => setFocus(false)}
    >
      <div className={`${s.stage} relative aspect-square overflow-hidden rounded-md border border-line`}>
        <svg viewBox={viewBox(fit, f)} role="img" aria-label={label} className={`${on ? s.on : ""} absolute inset-0 h-full w-full p-6`}>
          {!fit.flow.tailFront && tail}
          {shown.map((x, i) => (
            <Face key={i} x={x} />
          ))}
          {fit.flow.tailFront && tail}
          <path d={fit.flow.inside} className={`${s.fade} ${s.d1}`} {...air} strokeWidth={1.25} strokeOpacity={0.75} strokeDasharray="3 4" />
          <path d={fit.flow.head} pathLength={1} className={`${s.draw} ${s.d2}`} {...air} />
          <path d={fit.flow.tip} className={`${s.fade} ${s.d3}`} fill="var(--blue)" />
        </svg>
        <span aria-hidden className="eyebrow absolute left-3 top-2.5 text-graphite">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span aria-hidden className="eyebrow absolute bottom-2.5 right-3 text-blue-ink">
          {state}
        </span>
      </div>
      <h4 className="mt-4 text-lg font-bold leading-snug text-ink">{fit.name}</h4>
      <p className="eyebrow mt-1 text-graphite">{fit.label}</p>
      <button
        type="button"
        aria-pressed={flat}
        onClick={() => setPin(flat ? 1 : 0)}
        className="group eyebrow mt-4 inline-flex min-h-11 items-center gap-3 self-start rounded-full border border-ink/25 px-4 text-ink transition-colors hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
      >
        <span aria-hidden className="relative h-3.5 w-7 rounded-full bg-line transition-colors group-aria-pressed:bg-blue">
          <span className="absolute left-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-ink transition-transform duration-300 ease-out group-aria-pressed:translate-x-3.5 group-aria-pressed:bg-white" />
        </span>
        Flat pattern
      </button>
    </li>
  );
}
