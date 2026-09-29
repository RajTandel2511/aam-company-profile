"use client";

import { useRef, useState } from "react";
import { useInViewOnce } from "@/lib/scroll";
import MapCanvas from "./MapCanvas";
import { CITIES, HQ_CITY, MAX_COUNT, STREAMS, TOTAL, type City } from "./geometry";
import styles from "./Map.module.css";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function CityDetail({ city }: { city: City | undefined }) {
  if (!city) {
    return (
      <div className={styles.enter}>
        <p className="eyebrow text-red-glow">Headquarters</p>
        <h3 className="mt-2 text-2xl font-bold leading-tight">{HQ_CITY}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-silver">
          Every arc on the map starts here. Hover or select a city to see what is in progress there.
        </p>
        <p className="mono mt-5 text-sm text-paper">
          {plural(TOTAL, "active project")} · {CITIES.length} cities
        </p>
      </div>
    );
  }
  const more = city.count - city.projects.length;
  return (
    <div key={city.name} className={styles.enter}>
      <p className={`eyebrow ${city.stream.text}`}>{city.isHQ ? "Headquarters city" : "Active work"}</p>
      <h3 className="mt-2 text-2xl font-bold leading-tight">{city.name}</h3>
      <p className="mono mt-2 text-sm text-silver">
        <span className={city.stream.text}>{city.count}</span> {city.count === 1 ? "active project" : "active projects"}
      </p>
      {city.projects.length > 0 && (
        <ul className="mt-5 divide-y divide-paper/10 border-y border-paper/10">
          {city.projects.map((p) => (
            <li key={p.name} className="py-3">
              <p className="text-[15px] font-semibold leading-snug">{p.name}</p>
              <p className="mono mt-0.5 text-xs text-silver">{p.sector}</p>
            </li>
          ))}
        </ul>
      )}
      {city.projects.length > 0 && more > 0 && (
        <p className="mono mt-3 text-xs text-silver">+ {more} more in progress</p>
      )}
    </div>
  );
}

function Legend() {
  const sizes = [1, 4, MAX_COUNT];
  return (
    <ul className="mono mt-6 space-y-3 text-xs text-silver">
      <li className="flex items-center gap-3">
        <svg aria-hidden="true" width="54" height="18" viewBox="0 0 54 18" fill="none" strokeWidth="1.6" strokeLinecap="round">
          {STREAMS.map((s, i) => (
            <path key={s.fill} d={`M3 ${15 - i * 2}Q24 ${14 - i * 6} 51 ${3 + i * 2}`} stroke={s.fill} />
          ))}
          <circle cx="3" cy="15" r="2.5" stroke="var(--red)" strokeWidth="1.5" />
        </svg>
        Arcs run from headquarters to each city
      </li>
      <li className="flex items-center gap-3">
        <svg aria-hidden="true" width="54" height="26" viewBox="0 0 54 26">
          {sizes.map((n, i) => (
            <circle key={n} cx={[4, 18, 41][i]} cy={13} r={4 * Math.sqrt(n)} fill="var(--silver)" fillOpacity={0.5} />
          ))}
        </svg>
        Marker area = active projects
      </li>
    </ul>
  );
}

function CityButton({ c, i, pressed, grown, onHover, onPick }: {
  c: City;
  i: number;
  pressed: boolean;
  grown: boolean;
  onHover: (city: string | null) => void;
  onPick: (city: string) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPick(c.name)}
      onMouseEnter={() => onHover(c.name)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(c.name)}
      onBlur={() => onHover(null)}
      className="group relative grid min-h-[44px] w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[3px] px-3 text-left text-sm transition-colors hover:bg-paper/[0.06] focus-visible:outline-blue-glow aria-pressed:bg-paper/10 lg:min-h-[34px]"
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: c.stream.fill }} />
      <span className="py-1.5 font-medium leading-tight">{c.name}</span>
      <span className="mono text-silver group-aria-pressed:text-paper">{c.count}</span>
      <span
        aria-hidden="true"
        className="absolute inset-x-3 bottom-0 h-px origin-left transition-transform duration-1000 ease-out"
        style={{
          background: c.stream.fill,
          transform: `scaleX(${grown ? c.count / MAX_COUNT : 0})`,
          transitionDelay: `${i * 35}ms`,
        }}
      />
    </button>
  );
}

/**
 * The interactive half of the section: city list (the accessible equivalent of
 * the map), the animated map, and a detail panel. Hover/focus previews a city;
 * click pins it.
 */
export default function MapExplorer() {
  const [pinned, setPinned] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const grown = useInViewOnce(listRef, 0.2);
  const shown = hover ?? pinned;
  const pick = (name: string) => setPinned((p) => (p === name ? null : name));
  const city = CITIES.find((c) => c.name === shown);

  return (
    <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-12">
      <div ref={listRef} className="order-3 lg:order-1">
        <h3 className="eyebrow flex items-baseline justify-between border-b border-paper/15 pb-3 text-silver">
          <span>Cities</span>
          <span>Active</span>
        </h3>
        <ul className="mt-2 grid grid-cols-2 gap-x-2 lg:grid-cols-1">
          {CITIES.map((c, i) => (
            <li key={c.name}>
              <CityButton c={c} i={i} pressed={pinned === c.name} grown={grown} onHover={setHover} onPick={pick} />
            </li>
          ))}
        </ul>
      </div>

      <div className="order-1 lg:order-2">
        <MapCanvas shown={shown} onHover={setHover} onPick={pick} />
      </div>

      <div className="order-2 lg:order-3">
        <div className="lg:sticky lg:top-24">
          <div aria-live="polite" className="rounded-[4px] border border-paper/10 bg-panel p-6">
            <CityDetail city={city} />
          </div>
          <Legend />
        </div>
      </div>
    </div>
  );
}
