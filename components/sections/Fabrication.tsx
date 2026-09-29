import { services } from "@/lib/content";
import FabFigure from "./FabFigure";
import FabMarquee from "./FabMarquee";
import FabCutTable from "./FabCutTable";
import FabLibrary from "./FabLibrary";

const BARS = ["var(--blue)", "var(--green)", "var(--red)"];

/**
 * The shop, told as a process: a finished duct run (fold + join + airflow),
 * the cutting table where every part starts as a flat pattern, the fitting
 * library (flat pattern <-> folded fitting), then the equipment we install.
 */
export default function Fabrication() {
  const fab = services.find((sv) => sv.id === "fabrication");
  if (!fab) return null;

  return (
    <section id="shop" aria-labelledby="shop-h" className="section overflow-hidden bg-paper">
      <div className="container-x grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow reveal text-blue-ink">{fab.title}</p>
          <h2 id="shop-h" className="display reveal mt-4 text-[clamp(2.25rem,5vw,4rem)] text-ink">
            Built in our own shop.
          </h2>
          <p className="reveal mt-6 text-lg text-graphite">{fab.body}</p>
          <ul className="reveal mt-8 border-t border-line">
            {fab.items.map((item, i) => (
              <li key={item} className="eyebrow flex items-center gap-3 border-b border-line py-3 text-ink">
                <span aria-hidden className="h-[3px] w-6 shrink-0 rounded-full" style={{ background: BARS[i % 3] }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-7">
          <FabFigure />
        </div>
      </div>

      <div className="container-x mt-20 lg:mt-28">
        <div className="mb-8 grid gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-6">
            <p className="eyebrow reveal text-blue-ink">On the table</p>
            <h3 className="display reveal mt-3 text-[clamp(1.75rem,3.6vw,2.75rem)] text-ink">
              It starts as a flat sheet.
            </h3>
          </div>
          <p className="reveal text-graphite lg:col-span-5 lg:col-start-8">
            Duct and fittings are laid out as flat patterns, cut, then folded and seamed into shape — the
            same way the pieces below come together.
          </p>
        </div>
        <FabCutTable />
      </div>

      <FabLibrary />

      <div className="container-x mt-16 lg:mt-24">
        <h3 className="eyebrow text-graphite">Equipment we install</h3>
        <FabMarquee />
      </div>
    </section>
  );
}
