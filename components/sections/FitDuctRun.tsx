"use client";

import type { ReactNode } from "react";
import { prng, seg } from "@/lib/motion";
import { STREAMS, frame, reveal, type Stream } from "./FitDuctRunAir";
import type { Face, Group } from "./FitDuctRunMath";
import { NOTE, type Note } from "./FitDuctRunNotes";
import { BEATS, SEAM_AT, SEAM_LEN, STEP } from "./FitDuctRunParts";
import { scene } from "./FitDuctRunScene";
import s from "./Fab.module.css";

/** Total play time; the wrapper runs p from 0 to 1 over this once the card is fully on screen. */
export const DURATION_MS = 9000;

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

function FaceShape({ f }: { f: Face }) {
  const gone = f.reveal ?? 0; // drawn removed: fades to a phantom outline
  return (
    <g opacity={f.op ?? 1}>
      {gone < 1 && <path d={f.d} fill={f.fill} fillOpacity={1 - gone} stroke={f.fill} strokeOpacity={1 - gone} strokeWidth={0.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      <path d={f.solid} {...INK} strokeOpacity={0.8 * (1 - gone)} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" />
      {f.dashed && <path d={f.dashed} {...INK} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="5 4" />}
      {gone > 0 && <path d={f.solid} {...INK} strokeOpacity={0.6 * gone} strokeWidth={1} strokeDasharray="12 3 3 3" />}
    </g>
  );
}

/** A Pittsburgh lock closing: the doubled edge draws in behind a glint; once live, a glint runs it now and then. */
function SeamLine({ seam, live, n }: { seam: NonNullable<Group["seam"]>; live: boolean; n: number }) {
  const len = 0.16;
  const run = { pathLength: 1, strokeDasharray: `${len} 2`, strokeDashoffset: -(seam.t - len) };
  const shine = (width: number, stroke: string, opacity: number) => (
    <path
      d={seam.line}
      pathLength={8}
      fill="none"
      stroke={stroke}
      strokeOpacity={opacity}
      strokeWidth={width}
      strokeLinecap="round"
      className={s.flow}
      style={{ strokeDasharray: "0.9 23.1", animationDuration: "4.2s", animationDelay: `${-3 + n * 0.5}s` }}
    />
  );
  return (
    <g>
      <path d={seam.band} fill="var(--ink)" fillOpacity={0.1 * seam.t} />
      {/* pathLength and a non-scaling stroke don't mix (the dash lands in the wrong space), so this one scales */}
      <path d={seam.inset} pathLength={1} fill="none" stroke="var(--ink)" strokeOpacity={0.6} strokeWidth={0.7} strokeDasharray="1 1" strokeDashoffset={1 - seam.t} />
      {seam.t < 1 && (
        <g aria-hidden>
          <path d={seam.line} fill="none" stroke="var(--ink)" strokeOpacity={0.4} strokeWidth={6.5} strokeLinecap="round" {...run} />
          <path d={seam.line} fill="none" stroke="white" strokeWidth={3.8} strokeLinecap="round" {...run} />
        </g>
      )}
      {seam.t >= 1 && live && (
        <g aria-hidden>
          {shine(4.4, "var(--ink)", 0.25)}
          {shine(2.4, "white", 1)}
        </g>
      )}
    </g>
  );
}

function Spots({ spots }: { spots: NonNullable<Group["spots"]> }) {
  return (
    <g aria-hidden>
      {spots.map((sp, i) =>
        sp.t < 1 ? (
          <g key={i}>
            <circle cx={sp.x} cy={sp.y} r={2 + 9 * (1 - sp.t)} fill={HEAT} fillOpacity={0.22 * (1 - sp.t)} />
            <circle cx={sp.x} cy={sp.y} r={3} fill={HEAT} />
            {sp.t < 0.55 && <circle cx={sp.x} cy={sp.y} r={1.4} fill="white" />}
          </g>
        ) : (
          <circle key={i} cx={sp.x} cy={sp.y} r={1.7} fill="var(--ink)" fillOpacity={0.55} />
        ),
      )}
    </g>
  );
}

const grow = (t: number) => ({ pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - t });

/** Air coming in, painted behind the metal: the straight's inlet faces away from us. */
function AirIn({ st, big, r, moving }: { st: Stream; big: boolean; r: number; moving: number }) {
  const [a] = reveal(st, r);
  const w = big ? 1.25 : 1;
  if (a <= 0) return null;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={st.inlet} stroke="var(--blue)" strokeOpacity={0.3} strokeWidth={2.6 * w} {...grow(a)} />
      <path d={st.inlet} stroke="var(--blue)" strokeWidth={2.8 * w} className={s.flow} opacity={moving} />
      <path d={st.headIn} fill="var(--blue)" stroke="none" opacity={seg(a, 0.6, 0.75)} />
    </g>
  );
}

/** Air inside, as hidden lines over the metal; then out of the takeoff, in the open. */
function Air({ st, big, r, moving }: { st: Stream; big: boolean; r: number; moving: number }) {
  const [, b, c, d] = reveal(st, r);
  const w = big ? 1.25 : 1;
  const live = { className: s.flow, opacity: moving };
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {b > 0 && <path d={st.inside} stroke="var(--blue-ink)" strokeOpacity={0.35} strokeWidth={1.2 * w} {...grow(b)} />}
      {b > 0 && <path d={st.inside} stroke="var(--blue-ink)" strokeOpacity={0.85} strokeWidth={1.6 * w} {...live} style={{ animationDuration: "1.1s" }} />}
      {c > 0 && <path d={st.branch} stroke="var(--green-ink)" strokeOpacity={0.4} strokeWidth={1.2 * w} {...grow(c)} />}
      {c > 0 && <path d={st.branch} stroke="var(--green-ink)" strokeOpacity={0.9} strokeWidth={1.6 * w} {...live} style={{ animationDuration: "1.1s" }} />}
      {d > 0 && <path d={st.plume} stroke="var(--green)" strokeOpacity={0.3} strokeWidth={2.6 * w} {...grow(d)} />}
      {d > 0 && <path d={st.plume} stroke="var(--green)" strokeWidth={2.8 * w} {...live} />}
      <path d={st.headOut} fill="var(--green)" stroke="none" opacity={seg(d, 0.85, 1)} />
    </g>
  );
}

/** Drafting callouts, desktop only: at phone width they would be too small to read. */
function Notes({ list }: { list: Note[] }) {
  return (
    <g aria-hidden className="hidden sm:inline" fontFamily="var(--font-mono)" fontSize={NOTE.size} fontWeight={500} letterSpacing="0.14em">
      {list.map((n) => (
        <g key={n.key} opacity={n.op}>
          <path d={`M${n.from[0].toFixed(1)} ${n.from[1].toFixed(1)}L${n.at[0].toFixed(1)} ${n.at[1].toFixed(1)}`} {...INK} strokeOpacity={0.6} strokeWidth={0.9} />
          <circle cx={n.at[0]} cy={n.at[1]} r={1.8} fill="var(--ink)" />
          <text x={n.label[0]} y={n.label[1]} textAnchor={n.end ? "end" : "start"} fill="var(--graphite)">
            {n.text.toUpperCase()}
          </text>
        </g>
      ))}
    </g>
  );
}

const STAGES = ["01 · Layout", "02 · Form", "03 · Seam", "04 · Connect", "05 · Flow"];
const pad = (n: number, k: number) => String(Math.round(n)).padStart(k, "0");
const SEAMS = Object.values(SEAM_AT).map((at) => at + SEAM_LEN);
const JOINTS = [STEP.slide[1], STEP.welds[1], STEP.bolts[1], STEP.drives[1] - 0.04, STEP.drives[1] - 0.02, STEP.drives[1]];
const PIECES_LINE = "Straight · reducer · square elbow · offset · 45° takeoff · end cap — ";
const DETAILS_LINE = "Pittsburgh locks · TDC and S&D joints · turning vanes";
const LABEL =
  "Diagram: a rectangular duct run as our shop builds it. Flat blanks, cut and marked with their bend lines, fold up on the brake into a straight duct, a reducer, a square elbow, an offset, a straight with a 45 degree takeoff, and an end cap. Pittsburgh locks close each corner seam, the pieces slide together on TDC flanges and S&D cleats, turning vanes sit in the elbow, and air runs through the run and up the takeoff.";

export default function FitDuctRun({ p, live, action }: { p: number; live: boolean; action?: ReactNode }) {
  const sc = scene(p);
  const view = frame(p);
  const flow = seg(p, BEATS.flow[0], BEATS.flow[1]);
  const stage = p >= BEATS.flow[0] ? 4 : p >= BEATS.connect[0] ? 3 : p >= BEATS.seam[0] ? 2 : p >= BEATS.form[0] ? 1 : 0;
  const count = (ts: number[]) => ts.filter((t) => p >= t).length;
  const readout =
    stage < 2
      ? { k: "Bends", v: `${pad(sc.bends, 4)}°`, of: `${pad(sc.bendsTotal, 4)}°` }
      : stage === 2
        ? { k: "Seams", v: pad(count(SEAMS), 2), of: pad(SEAMS.length, 2) }
        : { k: "Joints", v: pad(count(JOINTS), 2), of: pad(JOINTS.length, 2) };

  return (
    <figure>
      <div className={`${s.drafting} ${live ? s.live : ""} relative overflow-hidden rounded-md border border-line`}>
        <div aria-hidden className="eyebrow relative z-10 flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-2.5 text-graphite">
          <span>
            Fig. 01<span className="hidden sm:inline"> — A run from our shop</span>
          </span>
          <span className="tabular-nums">
            {readout.k} {readout.v}
            <span className="hidden sm:inline"> / {readout.of}</span>
          </span>
        </div>
        <svg viewBox={`${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`} role="img" aria-label={LABEL} className="block h-auto w-full px-3 pb-9 pt-4 sm:px-8 sm:pb-5">
          <defs>
            <linearGradient id="fdr-blade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="white" stopOpacity={0.75} />
              <stop offset="0.1" stopColor="white" stopOpacity={0} />
              <stop offset="0.22" stopColor="var(--ink)" stopOpacity={0.22} />
              <stop offset="1" stopColor="var(--ink)" stopOpacity={0.3} />
            </linearGradient>
            <pattern id="fdr-spangle" width="22" height="22" patternUnits="userSpaceOnUse">
              {SPANGLE.map((sp, i) => (
                <path key={i} d={sp.d} fill={sp.light ? "white" : "var(--ink)"} fillOpacity={sp.o} />
              ))}
            </pattern>
          </defs>
          <path d={sc.shadow} fill="var(--ink)" fillOpacity={0.07} />
          {flow > 0 && (
            <g aria-hidden>
              {STREAMS.map((st, i) => (
                <AirIn key={i} st={st} big={i === 1} r={seg(flow, 0, 0.72)} moving={seg(flow, 0.6, 1)} />
              ))}
            </g>
          )}
          {sc.groups.map((g, i) => (
            <g key={g.key}>
              {g.faces.map((f) => (
                <FaceShape key={f.key} f={f} />
              ))}
              {g.seam && <SeamLine seam={g.seam} live={live} n={i} />}
              {g.spots && <Spots spots={g.spots} />}
            </g>
          ))}
          <path d={sc.union} fill="url(#fdr-spangle)" opacity={0.5} pointerEvents="none" />
          <Notes list={sc.notes} />
          {flow > 0 && (
            <g aria-hidden>
              {STREAMS.map((st, i) => (
                <Air key={i} st={st} big={i === 1} r={seg(flow, 0, 0.72)} moving={seg(flow, 0.6, 1)} />
              ))}
            </g>
          )}
        </svg>
        <p aria-hidden className="eyebrow absolute bottom-3 right-4 text-blue-ink">
          {STAGES[stage]}
        </p>
      </div>
      <figcaption className="eyebrow mt-3 flex items-start justify-between gap-4 text-graphite">
        <span>
          <span className="hidden sm:inline">{PIECES_LINE}</span>
          {DETAILS_LINE}
        </span>
        {action}
      </figcaption>
    </figure>
  );
}
