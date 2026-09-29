import { easeOutQuint, lerp, seg } from "@/lib/motion";
import styles from "./Systems.module.css";
import {
  DIFFUSERS,
  FLOORS,
  RET_START,
  RTU,
  SUP_END,
  SUPPLY_X,
  retY,
  returnBranch,
  returnFlow,
  returnLen,
  returnTrunk,
  supY,
  supplyBranch,
  supplyFlow,
  supplyLen,
  supplyTrunk,
} from "./geometry";
import { Callout, Duct, Flow } from "./parts";

const BLUE = "var(--blue)";
const RED = "var(--red)";

function Rtu({ p }: { p: number }) {
  const k = seg(p, 0.2, 0.245);
  const dy = lerp(-38, 0, easeOutQuint(k)); // lowered by crane, settles onto the curb
  return (
    <g opacity={seg(p, 0.2, 0.212)}>
      <rect x={RTU.x + 6} y={RTU.y + RTU.h} width={RTU.w - 12} height={6} fill="var(--white)" stroke="var(--ink)" strokeWidth={1} />
      <g transform={`translate(0 ${dy.toFixed(2)})`}>
        <rect x={RTU.x} y={RTU.y} width={RTU.w} height={RTU.h} fill="var(--white)" stroke="var(--ink)" strokeWidth={1.3} />
        <rect x={RTU.x + 70} y={RTU.y - 7} width={40} height={7} fill="var(--white)" stroke="var(--ink)" strokeWidth={1} />
        <path
          d={Array.from({ length: 8 }, (_, i) => `M ${RTU.x + 8 + i * 6} ${RTU.y + 8} V ${RTU.y + RTU.h - 8}`).join(" ")}
          stroke="var(--silver)"
          strokeWidth={1}
        />
        <text x={RTU.x + 86} y={RTU.y + 31} textAnchor="middle" className="mono" fontSize={10} fill="var(--ink)">
          RTU-1
        </text>
      </g>
    </g>
  );
}

function Diffuser({ x, y, o }: { x: number; y: number; o: number }) {
  return (
    <g opacity={o}>
      <path d={`M ${x - 5} ${y + 4.5} L ${x - 9} ${y + 10} H ${x + 9} L ${x + 5} ${y + 4.5}`} fill="var(--white)" stroke={BLUE} strokeWidth={1.1} />
      <path d={`M ${x - 12} ${y + 11} H ${x + 12}`} stroke="var(--ink)" strokeWidth={1.4} />
    </g>
  );
}

/** Conditioned air leaving a diffuser: three short wisps drifting down. */
function Wisps({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y + 15})`}>
      <g className={styles.wisp} style={{ animationDelay: `${-delay}s` }}>
        <path d="M -5 0 q -3 5 -7 9 M 0 1 V 10 M 5 0 q 3 5 7 9" stroke={BLUE} strokeWidth={1.1} strokeLinecap="round" fill="none" />
      </g>
    </g>
  );
}

export default function Hvac({ p, flows }: { p: number; flows: boolean }) {
  const supT = seg(p, 0.24, 0.27);
  const retT = seg(p, 0.285, 0.31);
  const span = SUP_END - SUPPLY_X;

  return (
    <g>
      <Rtu p={p} />
      {/* return first, so supply crosses over it with a clean break */}
      <Duct d={returnTrunk} p={retT} rgb="--red-rgb" line={RED} />
      {FLOORS.map((f, i) => {
        const b = seg(p, 0.305 + i * 0.016, 0.343 + i * 0.016);
        const y = retY(f.ceil);
        return (
          <g key={f.id}>
            <Duct d={returnBranch(f.ceil)} p={b} rgb="--red-rgb" line={RED} />
            <g opacity={seg(b, 0.9, 1)}>
              <rect x={RET_START} y={y - 5} width={9} height={10} fill="var(--white)" stroke={RED} strokeWidth={1} />
              <path d={`M ${RET_START + 3} ${y - 5} V ${y + 5} M ${RET_START + 6} ${y - 5} V ${y + 5}`} stroke={RED} strokeWidth={0.8} />
            </g>
            {flows && retT >= 1 && b >= 1 && <Flow d={returnFlow(f.ceil)} len={returnLen(f.ceil)} count={2} fill={RED} />}
          </g>
        );
      })}

      <Duct d={supplyTrunk} p={supT} rgb="--blue-rgb" line={BLUE} />
      {FLOORS.map((f, i) => {
        const b = seg(p, 0.262 + i * 0.016, 0.3 + i * 0.016);
        const y = supY(f.ceil);
        const running = flows && supT >= 1 && b >= 1;
        return (
          <g key={f.id}>
            <Duct d={supplyBranch(f.ceil)} p={b} rgb="--blue-rgb" line={BLUE} />
            <path d={`M ${SUP_END} ${y - 4.5} V ${y + 4.5}`} stroke={BLUE} strokeWidth={1.2} opacity={seg(b, 0.95, 1)} />
            {DIFFUSERS.map((x, j) => {
              const at = (x - SUPPLY_X) / span;
              return (
                <g key={x}>
                  <Diffuser x={x} y={y} o={seg(b, at - 0.02, at + 0.06)} />
                  {running && <Wisps x={x} y={y} delay={(i * 3 + j) * 0.37} />}
                </g>
              );
            })}
            {running && <Flow d={supplyFlow(f.ceil)} len={supplyLen(f.ceil)} count={3} fill={BLUE} />}
          </g>
        );
      })}

      <Callout x={330} y={532} tx={350} ty={566} lines={["DIFFUSER"]} o={seg(p, 0.35, 0.37)} />
    </g>
  );
}
