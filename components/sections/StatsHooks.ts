"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Entrance state for a one-shot reveal.
 *   "final" — server HTML, no JS, reduced motion, or already on screen at mount:
 *             render the finished state and never rewind what the visitor can see.
 *   "armed" — was off-screen at mount: rewound, waiting to be scrolled to.
 *   "play"  — scrolled into view: run the entrance once.
 */
export type Stage = "final" | "armed" | "play";

export function useStage(ref: RefObject<HTMLElement | null>): Stage {
  const [stage, setStage] = useState<Stage>("final");
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    setStage("armed");
    // Fire when the top clears the lowest ~18% of the viewport — works for
    // elements taller than the screen, where a ratio threshold never trips.
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setStage("play");
        io.disconnect();
      },
      { rootMargin: "0px 0px -18% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return stage;
}

/** True while the element is on screen — ambient CSS loops run only then. */
export function useLive(ref: RefObject<HTMLElement | null>): boolean {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return live;
}
