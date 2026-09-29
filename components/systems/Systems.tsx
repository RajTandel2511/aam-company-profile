"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useStickyProgress } from "@/lib/scroll";
import styles from "./Systems.module.css";
import SystemsDrawing from "./SystemsDrawing";
import { CopyStack, STAGES, ServiceCopy, Steps, stageOf } from "./SystemsCopy";

const CARD = "rounded-md border border-line bg-white shadow-[0_24px_48px_-32px_rgb(var(--ink-rgb)/0.35)]";

function Header() {
  return (
    <header className="container-x pt-24 md:pt-36">
      <div className="reveal">
        <p className="eyebrow text-graphite">What we build</p>
        <h2 id="services-title" className="display mt-4 max-w-[15ch] text-[clamp(2.4rem,6vw,5rem)] text-ink">
          Every system a building breathes through.
        </h2>
        {/* the logo's three streams, drawn as an underline */}
        <svg className={`${styles.streams} mt-6 h-auto w-[200px] md:w-[240px]`} viewBox="0 0 240 32" fill="none" strokeWidth={3.5} strokeLinecap="round" aria-hidden="true">
          <path d="M 3 6 C 80 2 170 4 234 12" pathLength={1} stroke="var(--blue)" />
          <path d="M 3 15 C 80 11 170 13 234 21" pathLength={1} stroke="var(--green)" />
          <path d="M 3 24 C 80 20 170 22 234 30" pathLength={1} stroke="var(--red)" />
        </svg>
        <p className="mt-6 max-w-xl text-graphite">
          Follow one typical commercial building as each trade goes in — the envelope, the air, the water, the controls,
          and the care that keeps them all running.
        </p>
      </div>
    </header>
  );
}

/** Reduced motion: the finished drawing, then all five services as a list. */
function StaticSystems() {
  return (
    <div className="container-x mt-10 pb-24 md:mt-16 md:pb-36">
      <figure className={CARD}>
        <SystemsDrawing p={1} flows={false} />
      </figure>
      <div className="mt-12 grid gap-x-12 gap-y-12 md:mt-16 md:grid-cols-2 xl:grid-cols-3">
        {STAGES.map((s, i) => (
          <article key={s.id} className="border-t border-ink/15 pt-6">
            <ServiceCopy s={s} i={i} />
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Systems() {
  const track = useRef<HTMLDivElement>(null);
  const p = useStickyProgress(track);
  const reduced = useReducedMotion();
  const [live, setLive] = useState(false);

  // Flows animate only while the pinned stage is on screen.
  useEffect(() => {
    const el = track.current;
    if (!el || reduced || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section id="services" aria-labelledby="services-title" className="relative bg-paper">
      <Header />
      {reduced ? (
        <StaticSystems />
      ) : (
        <div ref={track} className="relative mt-8 h-[460vh] md:mt-12 md:h-[500vh]">
          <div className={`sticky top-0 h-[100svh] overflow-hidden ${live ? styles.live : ""}`}>
            <div className="container-x grid h-full grid-rows-[minmax(0,1fr)_auto] gap-5 pb-6 pt-[76px] md:gap-8 md:pb-10 md:pt-[92px] lg:grid-cols-[minmax(0,36fr)_minmax(0,64fr)] lg:grid-rows-1 lg:items-center lg:gap-10 lg:pb-8 xl:gap-14">
              <figure className={`${CARD} min-h-0 overflow-hidden lg:order-2 lg:-mr-[clamp(0px,calc(50vw-664px),160px)]`}>
                <SystemsDrawing p={p} flows={live} />
              </figure>
              <div className="lg:order-1">
                <Steps p={p} />
                <div className="mt-5 lg:mt-10">
                  <CopyStack active={stageOf(p)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
