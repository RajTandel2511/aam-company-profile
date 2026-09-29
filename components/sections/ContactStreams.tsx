"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./Contact.module.css";

/**
 * The logo's three streams (blue over green over red) sweep in from the left,
 * converge into a tight bundle and end in staggered arrowheads, as in the mark.
 * The viewBox holds only the convergence (fitted with `meet`, pinned right); the
 * straight run-in continues to x = -520 and shows through `overflow: visible`,
 * so a wider box just reveals more incoming stream.
 */
const STREAMS = [
  { c: "var(--blue)", d: "M-520 22 L-60 22 C 100 22 140 78 260 78 L 424 78", head: "M424 68 L452 78 L424 88 Z" },
  { c: "var(--green)", d: "M-520 146 L-60 146 C 110 146 150 100 260 100 L 452 100", head: "M452 90 L480 100 L452 110 Z" },
  { c: "var(--red)", d: "M-520 186 L-60 186 C 120 186 160 122 260 122 L 412 122", head: "M412 112 L440 122 L412 132 Z" },
];

const STAGGER_MS = 140;

export default function ContactStreams({ className = "" }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false); // draw-on, once
  const [live, setLive] = useState(false); // ambient flow, only while visible

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        setLive(e.isIntersecting);
        if (e.isIntersecting) setSeen(true);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      aria-hidden
      viewBox="0 0 480 200"
      preserveAspectRatio="xMaxYMid meet"
      overflow="visible"
      className={`${className} ${seen ? styles.seen : ""} ${live ? styles.live : ""}`}
    >
      {STREAMS.map((s, i) => (
        <g key={s.c} style={{ "--d": `${i * STAGGER_MS}ms` } as CSSProperties}>
          <path d={s.d} pathLength={1} fill="none" stroke={s.c} strokeWidth={7} className={styles.draw} />
          <path
            d={s.d}
            pathLength={1}
            fill="none"
            stroke="var(--white)"
            strokeWidth={2.5}
            strokeLinecap="round"
            className={styles.flow}
          />
          <path d={s.head} fill={s.c} className={styles.head} />
        </g>
      ))}
    </svg>
  );
}
