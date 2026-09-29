"use client";

import { useEffect, useState, type RefObject } from "react";
import { clamp } from "./motion";

/** True when the visitor asked the OS for less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

type Measure = (rect: DOMRect, vh: number) => number;

function useProgress(ref: RefObject<HTMLElement | null>, measure: Measure, initial: number): number {
  const [p, setP] = useState(initial);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      setP(1);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (el) setP(clamp(measure(el.getBoundingClientRect(), window.innerHeight)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref, measure, reduced]);

  return p;
}

const sticky: Measure = (r, vh) => -r.top / Math.max(1, r.height - vh);
const passing: Measure = (r, vh) => (vh - r.top) / (vh + r.height);

/**
 * For a tall section with a `position: sticky` stage inside it: 0 when the
 * section's top reaches the top of the viewport, 1 when its bottom reaches the
 * bottom. Drive a pinned, scroll-scrubbed animation with this. Reduced motion: 1.
 */
export function useStickyProgress(ref: RefObject<HTMLElement | null>): number {
  return useProgress(ref, sticky, 0);
}

/**
 * 0 as an element's top enters the bottom of the viewport, 1 as its bottom
 * leaves the top. For parallax and scroll-linked effects on ordinary sections.
 * Reduced motion: 1.
 */
export function useInViewProgress(ref: RefObject<HTMLElement | null>): number {
  return useProgress(ref, passing, 0);
}

/** Fires once when the element is at least `threshold` visible. Reduced motion: true immediately. */
export function useInViewOnce(ref: RefObject<HTMLElement | null>, threshold = 0.35): boolean {
  const [seen, setSeen] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setSeen(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, reduced]);
  return seen;
}
