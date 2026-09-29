"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** The hero <section>. Sets data-paused while off-screen so CSS loops stop. */
export default function HeroFrame({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-paused", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="top" ref={ref} aria-labelledby="hero-title" className={className}>
      {children}
    </section>
  );
}
