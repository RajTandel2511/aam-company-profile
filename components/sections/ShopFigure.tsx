"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/scroll";
import FitDuctRun, { DURATION_MS } from "./FitDuctRun";

/** The sticky nav's height: a card hidden behind it is not "on screen". */
const NAV_PX = 72;

/**
 * Plays FIG. 01 only while the WHOLE card is on screen, so the fitting never forms
 * half-hidden at the bottom of the viewport. It pauses if any part scrolls away and
 * resumes where it stopped; Replay restarts it. Reduced motion: the finished run, still.
 */
export default function ShopFigure() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const progress = useRef(0);
  const [p, setP] = useState(0);
  const [full, setFull] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setFull(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        setOnScreen(e.isIntersecting);
        // A card taller than the space under the nav can never be 100% visible:
        // then "full" means it fills that space.
        const fits = Math.min(1, (window.innerHeight - NAV_PX) / Math.max(1, e.boundingClientRect.height));
        setFull(e.intersectionRatio >= fits * 0.98);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.98, 1], rootMargin: `-${NAV_PX}px 0px 0px 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      progress.current = 1;
      setP(1);
      return;
    }
    if (!full || progress.current >= 1) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Cap the step so a backgrounded tab or a dropped frame never jumps ahead.
      progress.current = Math.min(1, progress.current + Math.min(50, now - last) / DURATION_MS);
      last = now;
      setP(progress.current);
      if (progress.current < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [full, reduced, run]);

  const replay = () => {
    progress.current = 0;
    setP(0);
    setRun((r) => r + 1);
  };

  const action =
    !reduced && p >= 1 ? (
      <button
        type="button"
        onClick={replay}
        aria-label="Replay the fabrication animation"
        className="eyebrow inline-flex items-center gap-1.5 text-blue-ink transition-colors hover:text-ink"
      >
        Replay <span aria-hidden>↺</span>
      </button>
    ) : undefined;

  return (
    <div ref={ref}>
      <FitDuctRun p={p} live={onScreen && !reduced} action={action} />
    </div>
  );
}
