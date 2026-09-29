import { seg } from "@/lib/motion";
import {
  FIX_X,
  FLOORS,
  MAIN,
  STACK_X,
  drainBranch,
  vent,
  wasteLen,
  wasteStack,
  waterBranch,
  waterService,
  waterServiceLen,
} from "./geometry";
import { Callout, Flow, drawOn } from "./parts";

const GREEN = "var(--green)";

/** Lavatory in section: counter with an undermount basin. The drain doubles as tailpiece. */
function Fixture({ floor, o }: { floor: number; o: number }) {
  const y = floor - 30;
  return (
    <g opacity={o} fill="none" stroke="var(--ink)" strokeWidth={1.1}>
      <path d={`M ${FIX_X - 11} ${y} V ${y + 5} Q ${FIX_X - 11} ${y + 9} ${FIX_X - 7} ${y + 9} H ${FIX_X + 7} Q ${FIX_X + 11} ${y + 9} ${FIX_X + 11} ${y + 5} V ${y}`} fill="var(--white)" />
      <path d={`M ${FIX_X - 20} ${y} H ${FIX_X + 20}`} strokeWidth={1.8} />
    </g>
  );
}

export default function Plumbing({ p, flows }: { p: number; flows: boolean }) {
  const service = seg(p, 0.41, 0.47);
  const stack = seg(p, 0.51, 0.56);

  return (
    <g>
      <circle cx={MAIN.x} cy={MAIN.y} r={MAIN.r} {...drawOn(seg(p, 0.4, 0.415))} stroke={GREEN} strokeWidth={2} />
      <circle cx={MAIN.x} cy={MAIN.y} r={MAIN.r - 3} fill={GREEN} opacity={seg(p, 0.41, 0.42) * 0.35} />

      {/* waste & vent — heavier, lighter green; drawn top-down as waste falls */}
      <path d={vent} {...drawOn(seg(p, 0.5, 0.515))} stroke={GREEN} strokeWidth={1.4} />
      <path d={`M ${STACK_X - 5} 170 H ${STACK_X + 5}`} stroke={GREEN} strokeWidth={2} opacity={seg(p, 0.5, 0.505)} />
      <path d={wasteStack} {...drawOn(stack)} stroke={GREEN} strokeOpacity={0.55} strokeWidth={3.6} />
      {FLOORS.map((f, i) => (
        <path key={f.id} d={drainBranch(f.floor)} {...drawOn(seg(p, 0.515 + i * 0.01, 0.535 + i * 0.01))} stroke={GREEN} strokeOpacity={0.55} strokeWidth={2.6} />
      ))}

      {/* domestic water — from the street main up the riser, branching bottom-up */}
      <path d={waterService} {...drawOn(service)} stroke={GREEN} strokeWidth={2} />
      {[...FLOORS].reverse().map((f, j) => {
        const b = seg(p, 0.45 + j * 0.014, 0.47 + j * 0.014);
        return (
          <g key={f.id}>
            <Fixture floor={f.floor} o={seg(b, 0, 0.4)} />
            <path d={waterBranch(f.floor)} {...drawOn(b)} stroke={GREEN} strokeWidth={1.8} />
          </g>
        );
      })}

      {flows && service >= 1 && <Flow d={waterService} len={waterServiceLen} count={4} fill={GREEN} r={2.1} speed={60} />}
      {flows && stack >= 1 && (
        <Flow d={wasteStack} len={wasteLen} count={2} fill="rgb(var(--green-rgb) / 0.7)" r={2.2} speed={40} />
      )}

      <Callout x={MAIN.x} y={MAIN.y + MAIN.r} tx={790} ty={658} lines={["WATER MAIN"]} o={seg(p, 0.42, 0.44)} end />
      <Callout x={STACK_X} y={174} tx={660} ty={150} lines={["VTR"]} o={seg(p, 0.515, 0.53)} />
    </g>
  );
}
