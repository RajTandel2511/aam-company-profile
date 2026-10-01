import { easeOutQuint, lerp, seg } from "@/lib/motion";
import styles from "./Systems.module.css";
import {
  EXH_X,
  FAN,
  FLOORS,
  GRILLE_X,
  OA,
  PLUME_TOP,
  ROOF,
  exhaustBranch,
  exhaustFlow,
  exhaustLen,
  exhaustRiser,
  grilleY,
  oaFlow,
  oaHood,
  oaLen,
} from "./geometry";
import { Callout, Duct, Flow, drawOn } from "./parts";

const GREEN = "var(--green)";

/** Ceiling exhaust grille: a louvred face on the ceiling line, the branch dropping into its collar. */
function Grille({ ceil, o }: { ceil: number; o: number }) {
  const y = grilleY(ceil);
  return (
    <g opacity={o}>
      <rect x={GRILLE_X - 10} y={y} width={20} height={6} fill="var(--white)" stroke={GREEN} strokeWidth={1.1} />
      <path d={[-5, 0, 5].map((d) => `M ${GRILLE_X + d} ${y} V ${y + 6}`).join(" ")} stroke={GREEN} strokeWidth={0.8} />
      <path d={`M ${GRILLE_X - 12} ${y + 7} H ${GRILLE_X + 12}`} stroke="var(--ink)" strokeWidth={1.4} />
    </g>
  );
}

/** Up-blast exhaust fan in elevation — curb, housing, windband, rim — set by crane like the RTU. */
function Fan({ p }: { p: number }) {
  const { x, curb, base, top } = FAN;
  const dy = lerp(-30, 0, easeOutQuint(seg(p, 0.435, 0.465)));
  return (
    <g opacity={seg(p, 0.43, 0.442)} fill="var(--white)" stroke="var(--ink)">
      <rect x={x - 14} y={curb} width={28} height={ROOF - curb} strokeWidth={1} />
      <g transform={`translate(0 ${dy.toFixed(2)})`}>
        <rect x={x - 12} y={top + 3} width={24} height={base - top - 3} strokeWidth={1.2} />
        <path d={`M ${x - 12} ${top + 10} H ${x + 12} M ${x - 12} ${top + 16} H ${x + 12}`} stroke="var(--silver)" strokeWidth={1} />
        <rect x={x - 15} y={top} width={30} height={3} strokeWidth={1} />
        <rect x={x - 18} y={base} width={36} height={curb - base} strokeWidth={1.3} />
        <text x={x} y={base + 11.5} textAnchor="middle" className="mono" fontSize={9} fill="var(--ink)" stroke="none">
          EF-1
        </text>
      </g>
    </g>
  );
}

/** A flow arrow in the logo's manner: green shaft, solid head. `dir` is where the head points. */
function Arrow({ d, tip, dir, p }: { d: string; tip: [number, number]; dir: "up" | "left"; p: number }) {
  const [x, y] = tip;
  const head = dir === "up" ? `M ${x} ${y} l -5 9 h 10 Z` : `M ${x} ${y} l 9 -5 v 10 Z`;
  return (
    <g>
      <path d={d} {...drawOn(p)} stroke={GREEN} strokeWidth={1.6} />
      <path d={head} fill={GREEN} opacity={seg(p, 0.85, 1)} />
    </g>
  );
}

/** Stale air spreading as it leaves: the diffuser wisp's two side curls, flipped to rise. */
function Plume() {
  return (
    <g transform={`translate(${FAN.x} ${FAN.top - 3}) scale(1 -1)`}>
      {[0, 0.9].map((d) => (
        <g key={d} className={styles.wisp} style={{ animationDelay: `${-d}s` }}>
          <path d="M -6 0 q -3 5 -7 9 M 6 0 q 3 5 7 9" stroke={GREEN} strokeWidth={1.1} strokeLinecap="round" fill="none" />
        </g>
      ))}
    </g>
  );
}

export default function Exhaust({ p, flows }: { p: number; flows: boolean }) {
  const riser = seg(p, 0.4, 0.44);
  const out = seg(p, 0.465, 0.48);
  const hood = seg(p, 0.49, 0.505);
  const inlet = seg(p, 0.5, 0.515);
  const running = flows && riser >= 1 && out >= 1;

  return (
    <g>
      <Duct d={exhaustRiser} p={riser} rgb="--green-rgb" line={GREEN} />
      {FLOORS.map((f, i) => {
        const b = seg(p, 0.445 + i * 0.014, 0.47 + i * 0.014);
        return (
          <g key={f.id}>
            <Duct d={exhaustBranch(f.ceil)} p={b} rgb="--green-rgb" line={GREEN} />
            <Grille ceil={f.ceil} o={seg(b, 0.85, 1)} />
            {running && b >= 1 && (
              <Flow d={exhaustFlow(f.ceil)} len={exhaustLen(f.ceil)} count={1} fill={GREEN} r={2.2} speed={60} phase={i * 0.37} />
            )}
          </g>
        );
      })}

      {/* stale air out of the fan, fresh air into the RTU — particles pass under the equipment */}
      <Arrow d={`M ${FAN.x} ${FAN.top - 2} V ${PLUME_TOP + 8}`} tip={[FAN.x, PLUME_TOP]} dir="up" p={out} />
      <Arrow d={`M ${OA.tail} ${OA.y} H ${OA.face + 11}`} tip={[OA.face + 3, OA.y]} dir="left" p={inlet} />
      {flows && inlet >= 1 && <Flow d={oaFlow} len={oaLen} count={2} fill={GREEN} r={2.1} speed={40} />}
      <Fan p={p} />
      <g opacity={hood} fill="var(--white)" stroke="var(--ink)" strokeLinejoin="round">
        <path d={oaHood} strokeWidth={1.2} />
        <path d={[156, 161, 166].map((y) => `M ${OA.face - 5} ${y} L ${OA.face} ${y + 4}`).join(" ")} strokeWidth={0.9} />
      </g>
      {running && <Plume />}

      <Callout x={EXH_X} y={440} tx={776} ty={440} lines={["EXHAUST", "RISER"]} o={seg(p, 0.43, 0.45)} />
      <Callout x={FAN.x - 18} y={172} tx={642} ty={152} lines={["EXHAUST FAN"]} o={seg(p, 0.465, 0.485)} end />
      <Callout x={OA.x + 9} y={149.5} tx={326} ty={143} lines={["OUTSIDE AIR"]} o={seg(p, 0.51, 0.53)} />
    </g>
  );
}
