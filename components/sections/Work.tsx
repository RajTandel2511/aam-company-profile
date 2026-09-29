import { activeByCity, pastProjects } from "@/lib/content";
import WorkProjects from "./WorkProjects";
import WorkGallery from "./WorkGallery";

/** All active jobs (the list below is a curated subset of these). */
const activeTotal = Object.values(activeByCity).reduce((a, b) => a + b, 0);

export default function Work() {
  return (
    <section id="work" aria-labelledby="work-title" className="section bg-paper">
      <div className="container-x">
        <header className="reveal grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="eyebrow flex items-center gap-3 text-graphite">
              <span aria-hidden className="flex gap-[3px]">
                <span className="h-[2px] w-3 bg-blue" />
                <span className="h-[2px] w-3 bg-green" />
                <span className="h-[2px] w-3 bg-red" />
              </span>
              Current projects · In progress, Aug 2026
            </p>
            <h2 id="work-title" className="display mt-5 text-[clamp(2.5rem,6.4vw,5.25rem)] text-ink">
              On site across the Bay, right now.
            </h2>
          </div>
          <p className="max-w-md text-graphite lg:col-span-4 lg:justify-self-end">
            A selection of the {activeTotal} jobs our crews have in progress — hotels, stores, schools, housing,
            restaurants and civic work. Filter by sector.
          </p>
        </header>

        <div className="reveal mt-12 md:mt-16">
          <WorkProjects />
        </div>

        <div className="reveal mt-12 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-baseline sm:gap-8">
          <p className="eyebrow shrink-0 text-graphite">Past work · Completed</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 font-semibold text-ink">
            {pastProjects.map((p, i) => (
              <li key={p}>
                {p}
                {i < pastProjects.length - 1 && (
                  <span aria-hidden className="ml-3 text-graphite">
                    ·
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <WorkGallery />
    </section>
  );
}
