import styles from "./Systems.module.css";

/** SVG draw-on: pathLength 1 means no path ever needs measuring. */
export function drawOn(p: number) {
  return {
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: 1 - p,
    opacity: p > 0 ? 1 : 0,
    fill: "none",
  } as const;
}

/** Small mono label with a leader line back to the thing it names. */
export function Callout({
  x,
  y,
  tx,
  ty,
  lines,
  o,
  end = false,
}: {
  x: number;
  y: number;
  tx: number;
  ty: number;
  lines: string[];
  o: number;
  end?: boolean;
}) {
  const textX = end ? tx - 4 : tx + 4;
  return (
    <g opacity={o} className="max-md:hidden">
      <path d={`M ${x} ${y} L ${tx} ${ty}`} stroke="var(--graphite)" strokeWidth={0.75} fill="none" />
      <circle cx={x} cy={y} r={1.8} fill="var(--graphite)" />
      <text
        x={textX}
        y={ty + 3.5}
        textAnchor={end ? "end" : "start"}
        className="mono"
        fontSize={11}
        letterSpacing="0.08em"
        fill="var(--graphite)"
      >
        {lines.map((l, i) => (
          <tspan key={l} x={textX} dy={i === 0 ? 0 : 13}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/**
 * `count` particles evenly spaced along one path, moving at `speed` units/s.
 * CSS offset-path reuses the drawn path string, so they stay inside the duct.
 * `phase` (0..1) shifts them along the path, so single-particle routes don't start in step.
 */
export function Flow({
  d,
  len,
  count,
  fill,
  r = 2.3,
  speed = 70,
  stroke,
  phase = 0,
}: {
  d: string;
  len: number;
  count: number;
  fill: string;
  r?: number;
  speed?: number;
  stroke?: string;
  phase?: number;
}) {
  const dur = len / speed;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          r={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke ? 3 : undefined}
          className={styles.particle}
          style={{
            offsetPath: `path('${d}')`,
            animationDuration: `${dur.toFixed(2)}s`,
            animationDelay: `${(-((i / count + phase) % 1) * dur).toFixed(2)}s`,
          }}
        />
      ))}
    </>
  );
}

/** A duct in section: white halo (breaks crossings), tinted body, centreline. */
export function Duct({ d, p, rgb, line }: { d: string; p: number; rgb: string; line: string }) {
  return (
    <g>
      <path d={d} {...drawOn(p)} stroke="var(--white)" strokeWidth={12} />
      <path d={d} {...drawOn(p)} stroke={`rgb(var(${rgb}) / 0.16)`} strokeWidth={9} />
      <path d={d} {...drawOn(p)} stroke={line} strokeWidth={1.6} />
    </g>
  );
}
