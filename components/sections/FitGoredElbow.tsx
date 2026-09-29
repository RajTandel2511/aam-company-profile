"use client";

import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import { prng, seg } from "@/lib/motion";
import { useInViewProgress, useReducedMotion } from "@/lib/scroll";
import {
  FACTS,
  GHOST,
  JOINT_D,
  JOINT_RIPPLES,
  JOINT_RUNS,
  PHANTOM,
  STREAMS,
  VIEW,
  along,
  scene,
  timeline,
  viewBox,
  type Face,
} from "./FitGoredElbowGeometry";
import { useLive } from "./StatsHooks";
import s from "./Fab.module.css";

/** Galvanized spangle: a few faint crystalline shards per tile, seeded so SSR and client agree. */
const SPANGLE = (() => {
  const rnd = prng(1994);
  return Array.from({ length: 9 }, () => {
    const cx = rnd() * 22;
    const cy = rnd() * 22;
    const r = 2 + rnd() * 4;
    const a0 = rnd() * Math.PI;
    const pts = [0, 1, 2, 3, 4].map((k) => {
      const a = a0 + (k * Math.PI * 2) / 5 + rnd() * 0.5;
      const rr = r * (0.6 + rnd() * 0.4);
      return `${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
    });
    return { d: `M${pts.join("L")}Z`, light: rnd() > 0.45, o: (0.035 + rnd() * 0.05).toFixed(3) };
  });
})();

const INK = { fill: "none", stroke: "var(--ink)", vectorEffect: "non-scaling-stroke" } as const;
const HEAT = "var(--red)"; // heat is red everywhere on the page

function FaceShape({ f, marks }: { f: Face; marks: number }) {
  return (
    <g>
      <path d={f.d} fill={f.fill} stroke={f.fill} strokeWidth={0.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={f.solid} {...INK} strokeOpacity={0.8} strokeWidth={1} strokeLinecap="round" />
      {f.dashed && marks > 0 && <path d={f.dashed} {...INK} strokeOpacity={0.75 * marks} strokeWidth={1} strokeDasharray="5 4" />}
    </g>
  );
}

/** Sparks thrown off the torch; reseeded every few percent of the run, so they flicker as you scroll. */
function sparks(j: number, w: number, [x, y]: readonly [number, number]): string {
  const rnd = prng(j * 7919 + Math.floor(w * 48));
  return Array.from({ length: 6 }, () => {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.6; // mostly upward
    const r0 = 5 + rnd() * 3;
    const r1 = r0 + 4 + rnd() * 9;
    const at = (d: number) => `${(x + Math.cos(a) * d).toFixed(1)} ${(y + Math.sin(a) * d).toFixed(1)}`;
    return `M${at(r0)}L${at(r1)}`;
  }).join("");
}

/** One joint's weld at fraction w: a rippled bead behind a red-hot torch. */
function Weld({ j, w }: { j: number; w: number }) {
  const d = JOINT_D[j];
  const ripples = JOINT_RIPPLES[j].filter((k) => k.u <= w).map((k) => k.d).join("");
  const head = along(JOINT_RUNS[j], w);
  const trail = (len: number) => {
    const u0 = Math.max(0, w - len);
    return { pathLength: 1, strokeDasharray: `${(w - u0).toFixed(4)} 2`, strokeDashoffset: -u0 };
  };
  return (
    <g>
      <path d={d} pathLength={1} fill="none" stroke="var(--ink)" strokeOpacity={0.45} strokeWidth={3.4} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - w} />
      {ripples && <path d={ripples} fill="none" stroke="white" strokeOpacity={0.75} strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round" />}
      {w < 1 && (
        <g aria-hidden>
          <path d={d} fill="none" stroke={HEAT} strokeOpacity={0.3} strokeWidth={8} strokeLinecap="round" {...trail(0.18)} />
          <path d={d} fill="none" stroke={HEAT} strokeWidth={3.6} strokeLinecap="round" {...trail(0.07)} />
          <path d={sparks(j, w, head)} stroke={HEAT} strokeWidth={1.1} strokeLinecap="round" />
          <circle cx={head[0]} cy={head[1]} r={11} fill={HEAT} fillOpacity={0.22} />
          <circle cx={head[0]} cy={head[1]} r={5} fill={HEAT} />
          <circle cx={head[0]} cy={head[1]} r={2.4} fill="white" />
        </g>
      )}
    </g>
  );
}

const STAGES = ["01 · Layout", "02 · Roll", "03 · Part", "04 · Turn", "05 · Weld", "06 · Flow"];
const fmt = (n: number) => String(+n.toFixed(2));
const nb = (text: string) => text.replace(/ /g, " "); // a formula never breaks across lines
const deg3 = (n: number) => `${String(Math.round(n)).padStart(3, "0")}°`;
const CAPTION = `${FACTS.gores} gores · ${nb(`${FACTS.full} × ${fmt(FACTS.fullDeg)}°`)} + ${nb(`2 × ${fmt(FACTS.halfDeg)}°`)} · ${nb(`R = ${fmt(FACTS.rOverD)} D`)} · one sheet, ${FACTS.joints} sine cuts`;
const LABEL = `Diagram: the flat pattern for a ${FACTS.gores}-gore 90-degree round elbow, one sheet divided by ${FACTS.joints} sine-curve cuts, rolls into a straight pipe; the pieces part along the cuts, every other gore turns over, and the gores hinge shut heel to heel into the elbow. The joints are welded and air flows through the bend, fastest along the inside.`;

type ViewProps = { p: number; live?: boolean; glint?: boolean; cardRef?: Ref<HTMLDivElement> };

/** The figure at scroll progress p; pure apart from the continuous CSS loops. */
export function FitGoredElbowView({ p, live = false, glint = false, cardRef }: ViewProps) {
  const t = timeline(p);
  const key = [t.roll, t.part, t.flip, ...t.fold].map((v) => v.toFixed(4)).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the pose
  const sc = useMemo(() => scene(t), [key]);
  const marks = 1 - seg(t.roll, 0.35, 0.9);
  // Same element objects while the pose holds, so React skips the hundreds of facets during weld and flow.
  const faces = useMemo(() => sc.faces.map((f) => <FaceShape key={f.key} f={f} marks={marks} />), [sc, marks]);
  const folded = t.fold.reduce((a, b) => a + b, 0);
  // The finished elbow in phantom: absent from the layout, in once the roll starts, out as the gores land.
  const ghost = seg(t.roll, 0.05, 0.5) * (1 - seg(folded / t.fold.length, 0.4, 0.9));
  const turn = folded * FACTS.fullDeg;
  const stage = t.flow > 0 ? 5 : t.weld > 0 ? 4 : t.flip > 0 ? 3 : t.part > 0 ? 2 : t.roll > 0 ? 1 : 0;
  const done = t.weld >= 1;

  return (
    <figure>
      <div ref={cardRef} className={`${s.drafting} ${live ? s.live : ""} relative overflow-hidden rounded-md border border-line`}>
        <div aria-hidden className="eyebrow relative z-10 flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-2.5 text-graphite">
          <span>
            Fig. 01<span className="hidden sm:inline"> — Five-gore elbow</span>
          </span>
          <span className="tabular-nums">
            {t.flip > 0 ? (
              <>
                Turn {deg3(turn)}
                <span className="hidden sm:inline"> / 090°</span>
              </>
            ) : (
              <>
                Wrap {deg3(t.roll * 360)}
                <span className="hidden sm:inline"> / 360°</span>
              </>
            )}
          </span>
        </div>
        <svg viewBox={viewBox(t)} role="img" aria-label={LABEL} className="block h-auto w-full overflow-visible px-3 pb-9 pt-4 sm:px-8 sm:pb-4">
          <defs>
            <pattern id="fge-spangle" width="22" height="22" patternUnits="userSpaceOnUse">
              {SPANGLE.map((sp, i) => (
                <path key={i} d={sp.d} fill={sp.light ? "white" : "var(--ink)"} fillOpacity={sp.o} />
              ))}
            </pattern>
            {/* Air reads solid outside the fitting and as a hidden line inside it. */}
            <mask id="fge-in" maskUnits="userSpaceOnUse" {...VIEW}>
              {STREAMS.map((st) => (
                <path key={st.rho} d={st.inner} fill="none" stroke="white" strokeWidth={12} />
              ))}
            </mask>
            <mask id="fge-out" maskUnits="userSpaceOnUse" {...VIEW}>
              {STREAMS.map((st) => (
                <path key={st.rho} d={st.outer} fill="none" stroke="white" strokeWidth={12} />
              ))}
            </mask>
          </defs>

          <path d={GHOST} {...INK} strokeOpacity={0.22} strokeWidth={1} strokeLinejoin="round" />
          <path d={sc.shadow} fill="var(--ink)" fillOpacity={0.07} />
          {/* Behind the metal, so it never crosses a face. */}
          {ghost > 0 && <path d={PHANTOM} {...INK} strokeOpacity={0.3 * ghost} strokeWidth={1} strokeDasharray="14 4 3 4" strokeLinejoin="round" />}

          {faces}
          <path d={sc.union} fill="url(#fge-spangle)" opacity={0.5} />

          {t.weld > 0 &&
            JOINT_D.map((_, j) => {
              const w = seg(t.weld, j * 0.16, j * 0.16 + 0.52);
              return w > 0 ? <Weld key={j} j={j} w={w} /> : null;
            })}

          {glint && done &&
            JOINT_D.map((d, j) => (
              <g key={j} aria-hidden>
                {[
                  { stroke: HEAT, width: 7, opacity: 0.45 },
                  { stroke: "white", width: 2.2, opacity: 1 },
                ].map((g) => (
                  <path
                    key={g.width}
                    d={d}
                    pathLength={8}
                    fill="none"
                    stroke={g.stroke}
                    strokeOpacity={g.opacity}
                    strokeWidth={g.width}
                    strokeLinecap="round"
                    className={s.flow}
                    style={{ strokeDasharray: "0.5 23.5", animationDuration: "3.6s", animationDelay: `${-2.4 + j * 0.22}s` }}
                  />
                ))}
              </g>
            ))}

          {t.flow > 0 && (
            <>
              <g mask="url(#fge-out)">
                {STREAMS.map((st, n) => (
                  <g key={st.rho}>
                    <path d={st.d} pathLength={1} fill="none" stroke="var(--blue)" strokeOpacity={0.3} strokeWidth={n === 1 ? 3 : 2} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - t.flow} />
                    <path
                      d={st.d}
                      fill="none"
                      stroke="var(--blue)"
                      strokeWidth={n === 1 ? 3.6 : 2.4}
                      strokeLinecap="round"
                      className={s.flow}
                      style={{ animationDuration: `${(0.9 * st.rho) / STREAMS[1].rho}s` }}
                      opacity={seg(t.flow, 0.6, 1)}
                    />
                  </g>
                ))}
              </g>
              <g mask="url(#fge-in)" opacity={0.85 * seg(t.flow, 0.3, 1)}>
                {STREAMS.map((st, n) => (
                  <path
                    key={st.rho}
                    d={st.d}
                    fill="none"
                    stroke="var(--blue-ink)"
                    strokeWidth={n === 1 ? 2.2 : 1.5}
                    className={s.flow}
                    style={{ animationDuration: `${(0.9 * st.rho) / STREAMS[1].rho}s` }}
                  />
                ))}
              </g>
              <g fill="var(--blue)" opacity={seg(t.flow, 0.8, 1)}>
                {STREAMS.map((st, n) => (
                  <path key={st.rho} d={st.head} fillOpacity={n === 1 ? 1 : 0.75} />
                ))}
              </g>
            </>
          )}
        </svg>
        <p aria-hidden className="eyebrow absolute bottom-3 right-4 text-blue-ink">
          {STAGES[stage]}
        </p>
      </div>
      <figcaption className="eyebrow mt-3 text-graphite">{CAPTION}</figcaption>
    </figure>
  );
}

export default function FitGoredElbow() {
  const ref = useRef<HTMLDivElement>(null);
  const raw = useInViewProgress(ref);
  const live = useLive(ref);
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Before hydration (and without JS) show the finished elbow; after, scroll drives it.
  // raw is 0.5 exactly when the card is centred on screen — where people pause. Play the whole
  // story while the card rises from the lower screen to the centre, so a visitor at rest sees the
  // finished, welded elbow with air flowing, not gores still mid-turn.
  const p = seg(raw, 0.08, 0.52);
  return <FitGoredElbowView p={mounted ? p : 1} live={live && !reduced} glint={!reduced} cardRef={ref} />;
}
