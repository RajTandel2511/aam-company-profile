import { easeInOutCubic, lerp, seg } from "@/lib/motion";
import { STOPS } from "./geometry";
import { drawOn } from "./parts";

const RING = 30;

/** Where the inspection ring is at progress p: parked at a stop, or travelling. */
function ringAt(p: number) {
  let x: number = STOPS[0].x;
  let y: number = STOPS[0].y;
  let sweep = 0;
  STOPS.forEach((s, i) => {
    if (p >= s.a) {
      x = s.x;
      y = s.y;
      sweep = seg(p, s.a, s.b);
    }
    const n = STOPS[i + 1];
    if (n && p > s.b + 0.005 && p < n.a) {
      const k = easeInOutCubic(seg(p, s.b + 0.005, n.a));
      x = lerp(s.x, n.x, k);
      y = lerp(s.y, n.y, k);
      sweep = 0;
    }
  });
  return { x, y, sweep, o: seg(p, 0.79, 0.805) * (1 - seg(p, 0.97, 0.985)) };
}

export default function Service({ p }: { p: number }) {
  const ring = ringAt(p);
  return (
    <g>
      {STOPS.map((s) => {
        const o = seg(p, s.b, s.b + 0.012);
        // leader starts on the ring's edge, pointing at the tag
        const k = RING / Math.hypot(s.tx - s.x, s.ty - s.y);
        const x0 = s.x + (s.tx - s.x) * k;
        const y0 = s.y + (s.ty - s.y) * k;
        return (
          <g key={s.a} opacity={o}>
            <path d={`M ${x0} ${y0} L ${s.tx} ${s.ty}`} stroke="var(--ink)" strokeWidth={0.75} />
            <circle cx={x0} cy={y0} r={2} fill="var(--ink)" />
            <g transform={`translate(${s.tx} ${s.ty})`}>
              <rect x={-24} y={-9} width={48} height={18} rx={9} fill="var(--white)" stroke="var(--ink)" strokeWidth={1.1} />
              <text y={3.6} textAnchor="middle" className="mono" fontSize={10} fontWeight={600} fill="var(--ink)">
                ✓ PM
              </text>
            </g>
          </g>
        );
      })}

      {ring.o > 0 && (
        <g opacity={ring.o} transform={`translate(${ring.x.toFixed(2)} ${ring.y.toFixed(2)})`}>
          <g transform={`rotate(${(p * 1440).toFixed(1)})`}>
            <circle r={24} fill="none" stroke="var(--ink)" strokeWidth={1} strokeDasharray="2 4" />
          </g>
          <path d="M 0 -34 V -27 M 0 27 V 34 M -34 0 H -27 M 27 0 H 34" stroke="var(--ink)" strokeWidth={1.2} />
          <circle r={RING} transform="rotate(-90)" {...drawOn(ring.sweep)} stroke="var(--ink)" strokeWidth={1.8} />
        </g>
      )}
    </g>
  );
}
