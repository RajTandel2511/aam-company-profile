import type { CSSProperties } from "react";
import { BASE, photos } from "@/lib/content";
import styles from "./Work.module.css";

type Slot = { i: number; wide?: boolean; ar: string };

/**
 * Editorial layout: three columns (5fr / 4fr / 3fr), each dropped a little lower
 * than the last. Below md the columns dissolve (display: contents) into a 2-up
 * grid where the landscape frames span both columns.
 * ponytail: slots index content.photos by position (6 photos); a 7th photo needs a slot here.
 */
const COLUMNS: { pad: string; slots: Slot[] }[] = [
  { pad: "", slots: [{ i: 1, wide: true, ar: "md:aspect-[3/2]" }, { i: 2, ar: "md:aspect-[4/5]" }] },
  { pad: "md:pt-20", slots: [{ i: 0, ar: "md:aspect-[3/4]" }, { i: 5, wide: true, ar: "md:aspect-[4/3]" }] },
  { pad: "md:pt-40", slots: [{ i: 4, ar: "md:aspect-[3/4]" }, { i: 3, ar: "md:aspect-[3/4]" }] },
];

const COLUMN_STAGGER_MS = 140;

export default function WorkGallery() {
  return (
    <div className="container-x mt-24 md:mt-32">
      <div className="reveal flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-5">
        <h3 className="display text-[clamp(1.75rem,3.6vw,2.75rem)] text-ink">From the field</h3>
        <p className="eyebrow text-graphite">Our installed work · photos from active jobs</p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:mt-12 md:grid-cols-[5fr_4fr_3fr] md:gap-6">
        {COLUMNS.map((col, c) => (
          <div key={c} className={`contents md:flex md:flex-col md:gap-8 ${col.pad}`}>
            {col.slots.map((s, j) => {
              const photo = photos[s.i];
              if (!photo) return null;
              const d = `${c * COLUMN_STAGGER_MS}ms`;
              const fig = String(c * 2 + j + 1).padStart(2, "0");
              return (
                <figure
                  key={photo.src}
                  className={`reveal group ${s.wide ? "col-span-2" : ""}`}
                  style={{ transitionDelay: d, "--d": d } as CSSProperties}
                >
                  <div className={`relative overflow-hidden bg-ink/5 ${s.wide ? "aspect-[3/2]" : "aspect-[3/4]"} ${s.ar}`}>
                    <div className="h-full w-full transition-transform duration-[1600ms] ease-out motion-safe:group-hover:scale-[1.05]">
                      <img
                        src={`${BASE}${photo.src}`}
                        alt={photo.alt}
                        loading="lazy"
                        decoding="async"
                        className={`${styles.img} h-full w-full object-cover`}
                      />
                    </div>
                    <div aria-hidden className={styles.wipe} />
                  </div>
                  <figcaption className="eyebrow mt-3 flex flex-col gap-1 text-graphite sm:flex-row sm:gap-3">
                    <span className="shrink-0 text-ink">Fig. {fig}</span>
                    <span>{photo.project}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
