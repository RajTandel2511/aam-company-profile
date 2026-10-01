import { seg } from "@/lib/motion";
import { services, type ServiceId } from "@/lib/content";

/** The five services the drawing tells, in build order (fabrication has its own section). */
const ORDER: ServiceId[] = ["sheetmetal", "hvac", "exhaust", "controls", "maintenance"];

export const STAGES = ORDER.map((id) => {
  const s = services.find((x) => x.id === id);
  if (!s) throw new Error(`content.services is missing "${id}"`);
  return s;
});

/** Stream colour per stage: fills use the brand colour, text the AA-safe variant. */
const TONE: Record<string, { fill: string; text: string }> = {
  sheetmetal: { fill: "bg-graphite", text: "text-graphite" },
  hvac: { fill: "bg-blue", text: "text-blue-ink" },
  exhaust: { fill: "bg-green", text: "text-green-ink" },
  controls: { fill: "bg-red", text: "text-red-ink" },
  maintenance: { fill: "bg-ink", text: "text-ink" },
};

export const stageOf = (p: number) => Math.min(STAGES.length - 1, Math.floor(p * STAGES.length));

export function Steps({ p }: { p: number }) {
  const active = stageOf(p);
  return (
    <ol className="grid grid-cols-5 gap-2 md:gap-3" aria-label="Systems in this drawing">
      {STAGES.map((s, i) => {
        const on = i === active;
        return (
          <li key={s.id} aria-current={on ? "step" : undefined}>
            <span className="block h-[3px] overflow-hidden rounded-full bg-line">
              <span
                className={`block h-full origin-left ${TONE[s.id].fill}`}
                style={{ transform: `scaleX(${seg(p, i / 5, (i + 1) / 5).toFixed(3)})` }}
              />
            </span>
            <span
              className={`mono mt-2 block text-[10.5px] uppercase leading-tight tracking-[0.1em] transition-colors duration-300 ${
                on ? "font-semibold text-ink" : "text-graphite"
              }`}
            >
              0{i + 1}
              <span className="mt-0.5 hidden xl:block">{s.short}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** One service, as it reads beside the drawing or in the static list. */
export function ServiceCopy({ s, i }: { s: (typeof STAGES)[number]; i: number }) {
  return (
    <>
      <p className={`eyebrow ${TONE[s.id].text}`}>
        System 0{i + 1} / 05 · {s.short}
      </p>
      <h3 className="display mt-2 text-[1.45rem] text-ink md:mt-3 md:text-[clamp(1.75rem,2.6vw,2.6rem)]">{s.title}</h3>
      <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-graphite md:mt-5 md:text-[17px]">{s.body}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5 md:mt-6 md:gap-2">
        {s.items.map((it) => (
          <li
            key={it}
            className="mono rounded-full border border-ink/15 bg-white/60 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.08em] text-ink md:text-[11px]"
          >
            {it}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * All five stacked in one grid cell, so the panel never changes height. Only the
 * active one is visible; the rest stay in the DOM for screen readers.
 */
export function CopyStack({ active }: { active: number }) {
  return (
    <div className="grid">
      {STAGES.map((s, i) => (
        <article
          key={s.id}
          className={`[grid-area:1/1] transition-[opacity,transform] ease-out ${
            i === active ? "translate-y-0 opacity-100 delay-100 duration-300" : "pointer-events-none translate-y-3 opacity-0 duration-150"
          }`}
        >
          <ServiceCopy s={s} i={i} />
        </article>
      ))}
    </div>
  );
}
