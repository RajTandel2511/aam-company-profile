import { seg } from "@/lib/motion";
import Controls from "./Controls";
import Hvac from "./Hvac";
import Plumbing from "./Plumbing";
import Service from "./Service";
import Structure, { StructureGhost } from "./Structure";
import { VB_H, VB_W } from "./geometry";

const LABEL =
  "Section drawing of a four-storey commercial building, built up system by system: architectural sheet metal at the " +
  "roof edge and walls; a rooftop HVAC unit with supply and return ducts on every floor; domestic water rising from the " +
  "street main to fixtures on each floor, with waste and vent; EMS controls linking every floor and the rooftop unit to " +
  "a panel; and preventative-maintenance checks on the rooftop unit, the riser and the controls.";

const STATUS = ["ARCHITECTURAL SHEET METAL", "HEATING, VENTILATION & AIR CONDITIONING", "PLUMBING", "EMS & CONTROLS", "MAINTENANCE"];

type Swatch = "line" | "dash" | "ring";
const LEGEND: { x: number; y: number; label: string; color: string; kind: Swatch; at: number }[] = [
  { x: 24, y: 626, label: "ARCH. SHEET METAL", color: "var(--graphite)", kind: "line", at: 0.1 },
  { x: 24, y: 642, label: "SUPPLY AIR", color: "var(--blue)", kind: "line", at: 0.24 },
  { x: 24, y: 658, label: "RETURN AIR", color: "var(--red)", kind: "line", at: 0.285 },
  { x: 250, y: 626, label: "DOMESTIC WATER · WASTE & VENT", color: "var(--green)", kind: "line", at: 0.41 },
  { x: 250, y: 642, label: "EMS / CONTROLS · VALUES ILLUSTRATIVE", color: "var(--red)", kind: "dash", at: 0.615 },
  { x: 250, y: 658, label: "PREVENTATIVE MAINTENANCE", color: "var(--ink)", kind: "ring", at: 0.8 },
];

function Legend({ p }: { p: number }) {
  return (
    <g className="max-md:hidden">
      {LEGEND.map((l) => (
        <g key={l.label} opacity={seg(p, l.at, l.at + 0.02)}>
          {l.kind === "ring" ? (
            <circle cx={l.x + 10} cy={l.y} r={5} fill="none" stroke={l.color} strokeWidth={1.4} />
          ) : (
            <path d={`M ${l.x} ${l.y} H ${l.x + 20}`} stroke={l.color} strokeWidth={2} strokeDasharray={l.kind === "dash" ? "4 3" : undefined} />
          )}
          <text x={l.x + 28} y={l.y + 3.3} className="mono" fontSize={10.5} letterSpacing="0.06em" fill="var(--graphite)">
            {l.label}
          </text>
        </g>
      ))}
    </g>
  );
}

export default function SystemsDrawing({ p, flows }: { p: number; flows: boolean }) {
  const stage = Math.min(4, Math.floor(p * 5));
  const done = seg(p, 0.97, 0.985);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} role="img" aria-label={LABEL} className="block h-full w-full lg:max-h-[calc(100svh-140px)]">
      <defs>
        <pattern id="sys-grid" width={20} height={20} patternUnits="userSpaceOnUse">
          <path d="M 20 0 H 0 V 20" fill="none" stroke="var(--line)" strokeWidth={0.6} />
        </pattern>
        <pattern id="sys-earth" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M 0 0 V 7" stroke="var(--silver)" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width={VB_W} height={VB_H} fill="url(#sys-grid)" opacity={0.7} />

      <StructureGhost />
      <Structure p={p} />
      <Plumbing p={p} flows={flows} />
      <Hvac p={p} flows={flows} />
      <Controls p={p} flows={flows} />
      <Service p={p} />

      <g className="mono max-md:hidden">
        <text x={24} y={30} fontSize={12} fontWeight={600} letterSpacing="0.12em" fill="var(--ink)">
          SECTION A–A
        </text>
        <text x={24} y={46} fontSize={10.5} letterSpacing="0.06em" fill="var(--graphite)">
          TYPICAL COMMERCIAL BUILDING · DIAGRAMMATIC · NTS
        </text>
        <text x={856} y={30} textAnchor="end" fontSize={12} fontWeight={600} letterSpacing="0.12em" fill="var(--ink)">
          SYSTEM 0{stage + 1} / 05
        </text>
        <text x={856} y={46} textAnchor="end" fontSize={10.5} letterSpacing="0.06em" fill="var(--graphite)" opacity={1 - done}>
          {STATUS[stage]}
        </text>
        <g opacity={done}>
          <circle cx={714} cy={42.5} r={3.5} fill="var(--green)" />
          <text x={856} y={46} textAnchor="end" fontSize={10.5} fontWeight={600} letterSpacing="0.06em" fill="var(--ink)">
            ALL SYSTEMS RUNNING
          </text>
        </g>
      </g>
      <Legend p={p} />
    </svg>
  );
}
