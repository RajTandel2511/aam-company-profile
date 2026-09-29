import { company, stats } from "@/lib/content";
import MapExplorer from "./MapExplorer";
import { CITIES, HQ_CITY, STREAMS, TOTAL } from "./geometry";

/** "As of Aug 2026" — the date stamp content.ts attaches to the active-project count. */
const AS_OF = stats.find((s) => s.value === TOTAL)?.note ?? "";

/** Where we work: a night-time drawing of the Bay with an arc from HQ to every city with active work. */
export default function ProjectMap() {
  return (
    <section id="reach" aria-labelledby="reach-title" className="section overflow-hidden bg-night text-paper">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow reveal flex items-center gap-3 text-silver">
              <svg aria-hidden="true" width="28" height="12" viewBox="0 0 28 12" fill="none" strokeWidth="2" strokeLinecap="round">
                {STREAMS.map((s, i) => (
                  <path key={s.fill} d={`M1 ${2 + i * 4}Q14 ${i * 4} 27 ${3 + i * 4}`} stroke={s.fill} />
                ))}
              </svg>
              Where we work
            </p>
            <h2 id="reach-title" className="display reveal mt-5 text-[clamp(2.25rem,5.4vw,4.5rem)]">
              <span className="text-blue-glow">{TOTAL}</span> projects in motion across{" "}
              <span className="text-green-glow">{CITIES.length}</span> Bay Area cities.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:pb-2">
            <p className="reveal text-lg text-paper/85">
              Headquartered in {HQ_CITY} since {company.founded}.
            </p>
            <p className="eyebrow reveal mt-3 text-silver">Counts: active projects{AS_OF && `, ${AS_OF.toLowerCase()}`}</p>
          </div>
        </div>
        <MapExplorer />
      </div>
    </section>
  );
}
