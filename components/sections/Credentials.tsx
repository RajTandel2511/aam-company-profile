import { company, credentials } from "@/lib/content";
import CredPlate from "./CredPlate";

export default function Credentials() {
  return (
    <section id="credentials" aria-labelledby="cred-h" className="section bg-paper">
      <div className="container-x">
        <div className="max-w-2xl">
          <p className="eyebrow reveal text-red-ink">Credentials</p>
          <h2 id="cred-h" className="display reveal mt-4 text-[clamp(2.25rem,5vw,4rem)] text-ink">
            Qualified to build it.
          </h2>
          <p className="reveal mt-6 text-lg text-graphite">
            {company.certification} — licensed in California, registered for public works, and ready for
            prevailing-wage projects.
          </p>
        </div>
        <ul className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {credentials.map((c, i) => (
            <CredPlate key={c.label} label={c.label} value={c.value} detail={c.detail} index={i} hasSeal={c.value === "SBE & MBE"} />
          ))}
        </ul>
      </div>
    </section>
  );
}
