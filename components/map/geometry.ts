/**
 * Map geometry and timing, computed once at module load from lib/content +
 * lib/bayarea. Everything the map animates is a pure function of these numbers
 * and a clock `t` (seconds since the section came into view).
 */
import { activeByCity, contact, currentProjects, type Sector } from "@/lib/content";
import { CITY_COORDS, project } from "@/lib/bayarea";

export type Stream = { fill: string; glow: string; text: string };

/** The logo's three streams, in logo order. Cities cycle through them. */
export const STREAMS: Stream[] = [
  { fill: "var(--blue)", glow: "rgb(var(--blue-glow-rgb))", text: "text-blue-glow" },
  { fill: "var(--green)", glow: "rgb(var(--green-glow-rgb))", text: "text-green-glow" },
  { fill: "var(--red)", glow: "rgb(var(--red-glow-rgb))", text: "text-red-glow" },
];

export const [HQ_X, HQ_Y] = project(contact.hq.lat, contact.hq.lon);
/** "South San Francisco" — the city part of the HQ address. */
export const HQ_CITY = contact.city.split(",")[0];

type Anchor = "start" | "middle" | "end";
/** Label offset from the marker centre, in map units; text is vertically centred there. */
type LabelSpec = { dx: number; dy: number; anchor: Anchor };

// ponytail: hand-placed offsets for the crowded cities, checked by eye at 375px and 1440px.
// Any other city falls back to a right-hand (or, near the east edge, left-hand) label.
const LABELS: Record<string, LabelSpec> = {
  "San Francisco": { dx: 62, dy: -44, anchor: "end" },
  "San Jose": { dx: 30, dy: 0, anchor: "start" },
  "Walnut Creek": { dx: 24, dy: 0, anchor: "start" },
  "San Rafael": { dx: 0, dy: -36, anchor: "middle" },
  Oakland: { dx: 22, dy: -8, anchor: "start" },
  Alameda: { dx: 22, dy: 16, anchor: "start" },
  Emeryville: { dx: 18, dy: -18, anchor: "start" },
  "San Mateo": { dx: 18, dy: 4, anchor: "start" },
  "Daly City": { dx: -16, dy: -6, anchor: "end" },
  "Santa Clara": { dx: -16, dy: -8, anchor: "end" },
  Kentfield: { dx: 0, dy: 30, anchor: "middle" },
  Lafayette: { dx: 0, dy: 30, anchor: "middle" },
};

export type City = {
  name: string;
  count: number;
  x: number;
  y: number;
  r: number;
  stream: Stream;
  isHQ: boolean;
  /** Quadratic arc from HQ, or null for the HQ city itself. */
  d: string | null;
  len: number;
  ctrl: readonly [number, number];
  /** Seconds: arc draw start / arc arrival (marker pops). */
  start: number;
  arrive: number;
  label: LabelSpec;
  /** 0 = no label until hovered, 1 = label from 640px up, 2 = always labelled. */
  labelTier: 0 | 1 | 2;
  projects: { name: string; sector: Sector }[];
};

export const T_HQ = 0.5;
const POP = 0.45;
const ARC_BEND = 0.2; // control-point offset as a fraction of the chord

function arc(x: number, y: number) {
  const dx = x - HQ_X;
  const dy = y - HQ_Y;
  // Bend every arc the same rotational way, so together they read as a swirl.
  const cx = HQ_X + dx / 2 - dy * ARC_BEND;
  const cy = HQ_Y + dy / 2 + dx * ARC_BEND;
  let len = 0;
  let [px, py] = [HQ_X, HQ_Y];
  for (let i = 1; i <= 24; i++) {
    const s = i / 24;
    const qx = (1 - s) * (1 - s) * HQ_X + 2 * (1 - s) * s * cx + s * s * x;
    const qy = (1 - s) * (1 - s) * HQ_Y + 2 * (1 - s) * s * cy + s * s * y;
    len += Math.hypot(qx - px, qy - py);
    [px, py] = [qx, qy];
  }
  const f = (n: number) => Math.round(n * 10) / 10;
  return { d: `M${f(HQ_X)} ${f(HQ_Y)}Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`, len, ctrl: [cx, cy] as const };
}

// Stable sort keeps content order for ties, so the list and colours never shuffle.
const entries = Object.entries(activeByCity).sort((a, b) => b[1] - a[1]);
const chords = entries.map(([name]) => {
  const [lat, lon] = CITY_COORDS[name];
  const [x, y] = project(lat, lon);
  return Math.hypot(x - HQ_X, y - HQ_Y);
});
const farthest = Math.max(...chords);

export const CITIES: City[] = entries.map(([name, count], i) => {
  const [lat, lon] = CITY_COORDS[name];
  const [x, y] = project(lat, lon);
  const r = 7 * Math.sqrt(count);
  const isHQ = chords[i] < 1;
  const a = isHQ ? null : arc(x, y);
  // Arcs launch as a wavefront: arrival time is linear in distance from HQ.
  const f = chords[i] / farthest;
  const start = isHQ ? T_HQ : 0.35 + 0.75 * f;
  const arrive = isHQ ? T_HQ : start + 0.45 + 0.85 * f;
  const east = x > 620;
  return {
    name,
    count,
    x,
    y,
    r,
    stream: STREAMS[i % 3],
    isHQ,
    d: a?.d ?? null,
    len: a?.len ?? 0,
    ctrl: a?.ctrl ?? [x, y],
    start,
    arrive,
    label: LABELS[name] ?? { dx: east ? -(r + 16) : r + 16, dy: 0, anchor: east ? "end" : "start" },
    labelTier: count >= 3 ? 2 : count === 2 ? 1 : 0,
    projects: currentProjects.filter((p) => p.city === name).map(({ name, sector }) => ({ name, sector })),
  };
});

/** Point at parameter s (0..1) along a city's arc — the bright head while it draws. */
export function pointAt(c: City, s: number): [number, number] {
  const [cx, cy] = c.ctrl;
  const u = 1 - s;
  return [u * u * HQ_X + 2 * u * s * cx + s * s * c.x, u * u * HQ_Y + 2 * u * s * cy + s * s * c.y];
}

export const T_END = Math.max(...CITIES.map((c) => c.arrive)) + POP;
export const TOTAL = CITIES.reduce((n, c) => n + c.count, 0);
export const MAX_COUNT = CITIES[0].count;
export const POP_DURATION = POP;

/** Flow dash: constant visual speed along every arc, one dash per arc. */
const FLOW_SPEED = 110; // map units per second
const DASH = 26; // map units
export function flowStyle(c: City, i: number) {
  const dur = Math.max(1.6, c.len / FLOW_SPEED);
  const frac = Math.min(0.3, DASH / Math.max(1, c.len));
  return {
    dasharray: `${frac.toFixed(4)} ${(1 - frac).toFixed(4)}`,
    dur: `${dur.toFixed(2)}s`,
    delay: `${(-((i * 0.61) % dur)).toFixed(2)}s`,
  };
}
