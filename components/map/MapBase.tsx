import { memo } from "react";
import { COUNTIES, MAP_H, MAP_W, project } from "@/lib/bayarea";
import styles from "./Map.module.css";

/** Graticule every quarter degree, inside the frame lon -122.72..-121.45, lat 36.93..38.62. */
const LATS = [37.25, 37.5, 37.75, 38, 38.25, 38.5];
const LONS = [-122.5, -122.25, -122, -121.75, -121.5];
const MILE = 796.94 / 69.05; // map units per statute mile (1° lat ≈ 69.05 mi)
const HAIR = { vectorEffect: "non-scaling-stroke" as const, strokeWidth: 1 };

/**
 * The static base: land as a halftone dot field clipped to the county shapes
 * (it hides the coarse coastline and reads as a drawing), faint county lines,
 * a quarter-degree graticule and a scale bar. Water is the night background.
 */
function MapBase() {
  const bar = 10 * MILE;
  const bx = 32;
  const by = MAP_H - 44;
  return (
    <g aria-hidden="true">
      <defs>
        <pattern id="pm-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="2.2" fill="var(--paper)" fillOpacity="0.22" />
        </pattern>
        <clipPath id="pm-land">
          {COUNTIES.map((c) => (
            <path key={c.id} d={c.d} />
          ))}
        </clipPath>
      </defs>

      <g stroke="var(--paper)" strokeOpacity="0.07" {...HAIR}>
        {LATS.map((lat) => {
          const y = project(lat, 0)[1];
          return <line key={lat} x1="0" x2={MAP_W} y1={y} y2={y} />;
        })}
        {LONS.map((lon) => {
          const x = project(0, lon)[0];
          return <line key={lon} x1={x} x2={x} y1="0" y2={MAP_H} />;
        })}
      </g>

      <rect width={MAP_W} height={MAP_H} fill="url(#pm-dots)" clipPath="url(#pm-land)" />
      <g fill="none" stroke="var(--paper)" strokeOpacity="0.14" {...HAIR}>
        {COUNTIES.map((c) => (
          <path key={c.id} d={c.d} />
        ))}
      </g>

      <g className={`${styles.axis} mono`} fill="var(--silver)" fontSize="13" letterSpacing="0.06em">
        {LATS.map((lat) => (
          <text key={lat} x="10" y={project(lat, 0)[1] + 18}>
            {lat.toFixed(2)}°N
          </text>
        ))}
        {LONS.map((lon) => (
          <text key={lon} x={project(0, lon)[0] - 7} y="24" textAnchor="end">
            {Math.abs(lon).toFixed(2)}°W
          </text>
        ))}
      </g>

      <g className="mono" stroke="var(--silver)" fill="var(--silver)" fontSize="15">
        <path d={`M${bx} ${by - 8}V${by}H${bx + bar}V${by - 8}M${bx + bar / 2} ${by - 5}V${by}`} fill="none" {...HAIR} />
        <text x={bx} y={by + 24} stroke="none">
          0
        </text>
        <text x={bx + bar} y={by + 24} stroke="none" textAnchor="middle">
          10 MI
        </text>
        <path d={`M${bx + 6} ${by - 60}l7 -26l7 26l-7 -6z`} stroke="none" />
        <text x={bx + 13} y={by - 96} stroke="none" textAnchor="middle">
          N
        </text>
      </g>
    </g>
  );
}

export default memo(MapBase);
