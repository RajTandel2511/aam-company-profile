import { seg } from "@/lib/motion";
import { FLOORS, NODE_X, PANEL, RTU, dataRouteLens, dataRoutes, nodeY } from "./geometry";
import { Callout, Flow, drawOn } from "./parts";

const RED = "var(--red)";
// Diagram values only — labelled "illustrative" in the legend.
const READOUTS = ["72°F  RH 44%", "71°F  CO₂ 610 ppm", "72°F  CO₂ 580 ppm", "70°F  RH 46%"];
/** When each route (RTU link, then L4..L1) finishes drawing. */
const routeWindow = (k: number): [number, number] =>
  k === 0 ? [0.615, 0.66] : [0.63 + (k - 1) * 0.012, 0.67 + (k - 1) * 0.012];

function Node({ x, y, lit }: { x: number; y: number; lit: number }) {
  return (
    <g>
      <circle cx={x} cy={y - 2} r={7} fill={RED} opacity={lit * 0.18} />
      <rect x={x - 6} y={y - 8} width={12} height={16} rx={1.5} fill="var(--white)" stroke="var(--ink)" strokeWidth={1} />
      <circle cx={x} cy={y - 2} r={2.2} fill={lit > 0.5 ? RED : "var(--line)"} />
      <path d={`M ${x - 3} ${y + 4} H ${x + 3}`} stroke="var(--silver)" strokeWidth={1} />
    </g>
  );
}

export default function Controls({ p, flows }: { p: number; flows: boolean }) {
  const net = seg(p, 0.615, 0.7);

  return (
    <g>
      <defs>
        {/* reveal the dashed data lines by drawing a solid mask along each route */}
        <mask id="sys-net" maskUnits="userSpaceOnUse" x={0} y={0} width={880} height={672}>
          {dataRoutes.map((d, k) => (
            <path key={d} d={d} {...drawOn(seg(p, ...routeWindow(k)))} stroke="#fff" strokeWidth={8} />
          ))}
        </mask>
      </defs>
      <g mask="url(#sys-net)" opacity={net > 0 ? 1 : 0}>
        {dataRoutes.map((d) => (
          <path key={d} d={d} fill="none" stroke={RED} strokeWidth={1.1} strokeDasharray="4 3" />
        ))}
      </g>

      <g opacity={seg(p, 0.6, 0.615)}>
        <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} rx={1.5} fill="var(--white)" stroke="var(--ink)" strokeWidth={1.2} />
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={PANEL.x + 6 + i * 4} cy={PANEL.y + 7} r={1.3} fill={p >= 0.62 ? RED : "var(--line)"} />
        ))}
        <path d={`M ${PANEL.x + 4} ${PANEL.y + 14} H ${PANEL.x + 16} M ${PANEL.x + 4} ${PANEL.y + 19} H ${PANEL.x + 16}`} stroke="var(--silver)" strokeWidth={1} />
      </g>
      <circle cx={RTU.x + RTU.w} cy={180} r={2.4} fill={RED} opacity={seg(p, routeWindow(0)[1], routeWindow(0)[1] + 0.01)} />

      {FLOORS.map((f, i) => {
        const [, done] = routeWindow(i + 1);
        const y = nodeY(f.floor);
        const r = seg(p, 0.7 + i * 0.015, 0.72 + i * 0.015);
        return (
          <g key={f.id}>
            <g opacity={seg(p, 0.615, 0.63)}>
              <Node x={NODE_X} y={y} lit={seg(p, done, done + 0.012)} />
            </g>
            <text
              x={NODE_X - 14}
              y={y + 3.5}
              textAnchor="end"
              className="mono max-md:hidden"
              fontSize={10.5}
              fill="var(--red-ink)"
              stroke="var(--white)"
              strokeWidth={3}
              paintOrder="stroke"
              opacity={r}
              transform={`translate(${((1 - r) * 8).toFixed(2)} 0)`}
            >
              {READOUTS[i]}
            </text>
          </g>
        );
      })}

      {flows &&
        net >= 1 &&
        dataRoutes.map((d, k) => (
          <Flow key={d} d={d} len={dataRouteLens[k]} count={1} fill={RED} r={2.2} speed={120} stroke="rgb(var(--red-rgb) / 0.22)" />
        ))}

      <Callout x={PANEL.x} y={PANEL.y + 30} tx={NODE_X - 2} ty={582} lines={["EMS PANEL"]} o={seg(p, 0.62, 0.64)} end />
    </g>
  );
}
