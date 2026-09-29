import FabLibCard from "./FabLibCard";
import { FITTINGS } from "./FabLibFittings";

/** "Every fitting starts flat": four fittings that fold up from their flat patterns. */
export default function FabLibrary() {
  return (
    <div className="container-x mt-20 lg:mt-28">
      <div className="max-w-2xl">
        <p className="eyebrow reveal text-blue-ink">From flat to fitting</p>
        <h3 className="display reveal mt-4 text-[clamp(1.875rem,3.6vw,2.75rem)] text-ink">Every fitting starts flat.</h3>
        <p className="reveal mt-5 text-graphite">
          Each piece of ductwork is developed as a flat pattern, cut from sheet, then folded and rolled into shape. Hover or
          focus a fitting to lay it back out, or use its Flat pattern switch.
        </p>
      </div>
      <ul className="mt-10 grid grid-cols-1 gap-x-5 gap-y-10 min-[440px]:grid-cols-2 lg:grid-cols-4">
        {FITTINGS.map((fit, i) => (
          <FabLibCard key={fit.name} index={i} />
        ))}
      </ul>
    </div>
  );
}
