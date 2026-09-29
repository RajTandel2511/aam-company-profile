import { lerp, seg } from "@/lib/motion";
import { COLS, FLOORS, GRID, GROUND, IN_L, IN_R, PARAPET_TOP, ROOF, SHAFT, SLAB_T, VB_W, WALL_L, WALL_R } from "./geometry";
import { Callout, drawOn } from "./parts";

const INK = "var(--ink)";
const METAL = "var(--graphite)";

// Walls in section run from grade up through the parapet.
const wallPath = (x: number) => `M ${x - 5} ${GROUND} V ${PARAPET_TOP} H ${x + 5} V ${GROUND}`;
const slabs = [ROOF, ...FLOORS.slice(1).map((f) => f.ceil)];
const columnPath = (x: number) =>
  FLOORS.map((f) => `M ${x - 3} ${f.ceil + SLAB_T} V ${f.floor} M ${x + 3} ${f.ceil + SLAB_T} V ${f.floor}`).join(" ");
const footing = (x: number, w: number) => `M ${x - w} ${GROUND} V ${GROUND + 16} H ${x + w} V ${GROUND}`;

// Corrugated siding in section: a zigzag down the outside face of the top storey.
const zig = (x: number, dir: number) => {
  let d = `M ${x} 196`;
  for (let y = 196; y < 284; y += 8) d += ` l ${dir * 4} 4 l ${-dir * 4} 4`;
  return d;
};

// Architectural sheet metal: coping caps, counter-flashing, scupper + downspout,
// the entry canopy's gutter, and a band of metal wall siding.
const SHEET = {
  coping: [
    `M 139 173 V 161 H 161 V 173`,
    `M 719 173 V 161 H 741 V 173`,
  ],
  flashing: [`M ${IN_L} 173 H 160 V 183 L 167 188`, `M ${IN_R} 173 H 720 V 183 L 713 188`],
  gutters: [
    `M 736 180 H 754 L 750 196 H 740 Z M 745 196 V 582 Q 745 588 752 588`, // conductor head + downspout
    `M 84 514 V 526 Q 84 530 88 530 H 96 Q 100 530 100 526 V 514 M 92 530 V 586 Q 92 590 86 590`, // canopy gutter
  ],
  siding: [zig(WALL_L - 6, -1), zig(WALL_R + 6, 1)],
};

/**
 * Faint construction lines of the bare structure, shown from the first frame so the
 * drawing card is never empty while the stage scrolls into place — like a drafting
 * sheet before it is inked. The live Structure draws in ink exactly on top of it.
 * No animation and no ids, so it is safe to render alongside Structure.
 */
export function StructureGhost() {
  return (
    <g aria-hidden stroke={INK} fill="none" strokeOpacity={0.16} strokeWidth={1}>
      <path d={`M 24 ${GROUND} H 856`} />
      {[WALL_L, WALL_R].map((x) => (
        <path key={x} d={wallPath(x)} />
      ))}
      {slabs.map((y) => (
        <path key={y} d={`M ${IN_L} ${y} H ${SHAFT[0]} V ${y + SLAB_T} H ${IN_L} M ${IN_R} ${y} H ${SHAFT[1]} V ${y + SLAB_T} H ${IN_R}`} />
      ))}
      {COLS.map((x) => (
        <path key={x} d={columnPath(x)} strokeDasharray="3 4" />
      ))}
    </g>
  );
}

export default function Structure({ p }: { p: number }) {
  const sheet = (k: keyof typeof SHEET, a: number, b: number, w: number) =>
    SHEET[k].map((d) => <path key={d} d={d} {...drawOn(seg(p, a, b))} stroke={METAL} strokeWidth={w} strokeLinejoin="round" />);
  const glint = seg(p, 0.15, 0.195);
  const glintX = lerp(-120, VB_W + 120, glint);
  const poche = seg(p, 0.06, 0.1);

  return (
    <g>
      {/* ground, hatch and footings */}
      <path d={`M 24 ${GROUND} H 856`} {...drawOn(seg(p, 0, 0.04))} stroke={INK} strokeWidth={1.4} />
      <rect x={24} y={GROUND} width={832} height={8} fill="url(#sys-earth)" opacity={seg(p, 0.03, 0.06)} />
      {GRID.map((x, i) => footing(x, i === 0 || i === GRID.length - 1 ? 12 : 10)).map((d) => (
        <path key={d} d={d} {...drawOn(seg(p, 0.02, 0.06))} stroke={INK} strokeWidth={1} />
      ))}

      {/* walls, slabs, columns — ink hairlines, poché fills in once drawn */}
      {[WALL_L, WALL_R].map((x) => (
        <g key={x}>
          <rect x={x - 5} y={PARAPET_TOP} width={10} height={GROUND - PARAPET_TOP} fill={INK} opacity={poche * 0.14} />
          <path d={wallPath(x)} {...drawOn(seg(p, 0.01, 0.075))} stroke={INK} strokeWidth={1.3} />
        </g>
      ))}
      {slabs.map((y, i) => (
        <g key={y}>
          {/* slabs are cut open where the mechanical shaft passes through */}
          <rect x={IN_L} y={y} width={SHAFT[0] - IN_L} height={SLAB_T} fill={INK} opacity={poche * 0.14} />
          <rect x={SHAFT[1]} y={y} width={IN_R - SHAFT[1]} height={SLAB_T} fill={INK} opacity={poche * 0.14} />
          <path
            d={`M ${IN_L} ${y} H ${SHAFT[0]} V ${y + SLAB_T} H ${IN_L} M ${IN_R} ${y} H ${SHAFT[1]} V ${y + SLAB_T} H ${IN_R}`}
            {...drawOn(seg(p, 0.03 + i * 0.008, 0.07 + i * 0.008))}
            stroke={INK}
            strokeWidth={1.1}
          />
        </g>
      ))}
      {COLS.map((x, i) => (
        <path key={x} d={columnPath(x)} {...drawOn(seg(p, 0.05 + i * 0.006, 0.1 + i * 0.006))} stroke={INK} strokeOpacity={0.55} strokeWidth={0.9} />
      ))}
      <path
        d={SHAFT.map((x) => `M ${x} ${ROOF + SLAB_T} V ${GROUND}`).join(" ")}
        stroke={INK}
        strokeOpacity={0.4}
        strokeWidth={0.8}
        strokeDasharray="5 4"
        opacity={seg(p, 0.07, 0.1)}
      />
      {/* entry canopy (structure) */}
      <path d={`M ${WALL_L - 5} 514 H 100 M ${WALL_L - 5} 519 H 100`} {...drawOn(seg(p, 0.07, 0.1))} stroke={INK} strokeWidth={1} />

      {/* column grid bubbles + level datums */}
      <g opacity={seg(p, 0.04, 0.09)} className="max-md:hidden">
        {GRID.map((x, i) => (
          <g key={x}>
            <circle cx={x} cy={118} r={9} fill="var(--white)" stroke={INK} strokeWidth={0.8} />
            <text x={x} y={122} textAnchor="middle" className="mono" fontSize={11} fill={INK}>
              {"ABCDE"[i]}
            </text>
          </g>
        ))}
        {[{ y: ROOF, id: "ROOF" }, ...FLOORS.map((f) => ({ y: f.floor, id: f.id }))].map((l) => (
          <g key={l.id}>
            <path d={`M 762 ${l.y} H 800`} stroke="var(--silver)" strokeWidth={0.8} strokeDasharray="3 3" />
            <path d={`M 800 ${l.y} l -5 -7 h 10 Z`} fill={INK} />
            <text x={810} y={l.y - 3} className="mono" fontSize={11} fill="var(--graphite)">
              {l.id}
            </text>
          </g>
        ))}
      </g>

      {/* architectural sheet metal */}
      {sheet("coping", 0.1, 0.13, 2.2)}
      {sheet("flashing", 0.115, 0.145, 1.6)}
      {sheet("gutters", 0.125, 0.165, 1.6)}
      {sheet("siding", 0.135, 0.17, 1.1)}
      {glint > 0 && glint < 1 && (
        <g stroke="url(#sys-glint)" strokeWidth={3} fill="none" strokeLinejoin="round">
          {Object.values(SHEET).flat().map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      )}
      <defs>
        <linearGradient id="sys-glint" gradientUnits="userSpaceOnUse" x1={glintX - 60} y1={0} x2={glintX + 60} y2={60}>
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0.95} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>

      <Callout x={141} y={161} tx={96} ty={142} lines={["COPING"]} o={seg(p, 0.12, 0.14)} end />
      <Callout x={718} y={183} tx={770} ty={140} lines={["COUNTER-", "FLASHING"]} o={seg(p, 0.135, 0.155)} />
      <Callout x={139} y={236} tx={96} ty={236} lines={["METAL WALL", "SIDING"]} o={seg(p, 0.155, 0.175)} end />
      <Callout x={84} y={526} tx={78} ty={548} lines={["GUTTER +", "DOWNSPOUT"]} o={seg(p, 0.15, 0.17)} end />
    </g>
  );
}
