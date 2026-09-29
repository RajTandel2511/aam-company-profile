import { services } from "@/lib/content";
import FabFigure from "./FabFigure";
import FabMarquee from "./FabMarquee";

const BARS = ["var(--blue)", "var(--green)", "var(--red)"];

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

      <div className="container-x mt-16 lg:mt-24">
        <h3 className="eyebrow text-graphite">Equipment we install</h3>
        <FabMarquee />
      </div>
    </section>
  );
}
