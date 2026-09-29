import type { ReactNode } from "react";
import { contact, leadership } from "@/lib/content";
import ContactStreams from "./ContactStreams";
import styles from "./Contact.module.css";

const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${contact.street}, ${contact.city}`,
)}`;

type Detail = { label: string; value: ReactNode; href?: string; external?: boolean; wide?: boolean };

const DETAILS: Detail[] = [
  {
    label: "Address",
    value: (
      <>
        {contact.street}
        <br />
        {contact.city}
      </>
    ),
    href: mapsHref,
    external: true,
    wide: true,
  },
  { label: "Phone", value: contact.phone, href: contact.phoneHref },
  { label: "Email", value: contact.email, href: `mailto:${contact.email}` },
  { label: "Fax", value: contact.fax },
  { label: "Hours", value: contact.hours },
];

const linkCls =
  "underline decoration-ink/25 decoration-1 underline-offset-4 transition-colors hover:text-blue-ink hover:decoration-blue-ink";

function StreamMark() {
  return (
    <span aria-hidden className="flex gap-[3px]">
      <span className="h-[2px] w-3 bg-blue" />
      <span className="h-[2px] w-3 bg-green" />
      <span className="h-[2px] w-3 bg-red" />
    </span>
  );
}

export default function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="section overflow-hidden border-t border-line bg-paper">
      <div className="container-x">
        <div className="reveal">
          <p className="eyebrow flex items-center gap-3 text-red-ink">
            <StreamMark />
            Bidding a project?
          </p>
          <h2 id="contact-title" className="display mt-5 text-[clamp(3rem,10vw,9rem)] text-ink">
            Send us the plans.
          </h2>
          <p className="mt-6 max-w-xl text-lg text-graphite">
            HVAC, plumbing, architectural sheet metal, controls — send drawings and specs and we will put a bid together.
          </p>
        </div>

        {/* Streams converge into the email address. */}
        <div className="mt-10 grid items-center gap-4 md:mt-14 lg:grid-cols-12 lg:gap-0">
          <div className={`${styles.bleed} relative h-[110px] sm:h-[150px] lg:col-span-5 lg:h-[200px]`}>
            <div aria-hidden className={`${styles.drafting} absolute inset-0`} />
            <ContactStreams className="absolute left-0 top-0 h-full w-[calc(100%-var(--gutter))] lg:w-full" />
          </div>
          <div className="reveal lg:col-span-7">
            <a
              href={`mailto:${contact.email}`}
              className="group relative inline-block text-[clamp(1.15rem,5.4vw,3rem)] lg:text-[clamp(2rem,3.3vw,3rem)] font-extrabold leading-tight tracking-tight text-ink transition-colors duration-300 [overflow-wrap:anywhere] hover:text-blue-ink"
            >
              {contact.email}
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-1 h-[3px] origin-left scale-x-0 bg-blue transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
            </a>
          </div>
        </div>
        {/* Outside the row above so the arrows aim at the email line itself; the
            margin matches that row's 5/12 first column, and lg:-mt-12 tucks it
            back up under the email inside the 200px stream row. */}
        <p className="reveal mt-4 text-lg text-graphite lg:-mt-12 lg:ml-[41.6667%]">
          or call{" "}
          <a href={contact.phoneHref} className={`font-bold text-ink ${linkCls}`}>
            {contact.phone}
          </a>
        </p>

        <div className="mt-20 grid gap-12 md:mt-28 lg:grid-cols-12 lg:gap-8">
          <div className="reveal lg:col-span-4">
            <h3 className="eyebrow text-graphite">Leadership</h3>
            <ul className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-1">
              {leadership.map((p) => (
                <li key={p.name} className="bg-paper p-5 sm:p-6">
                  <p className="text-xl font-bold leading-snug text-ink">{p.name}</p>
                  <p className="eyebrow mt-2 text-graphite">{p.title}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal lg:col-span-8">
            <h3 className="eyebrow text-graphite">Contact details</h3>
            <dl className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
              {DETAILS.map((d) => (
                <div key={d.label} className={`bg-paper p-5 sm:p-6 ${d.wide ? "sm:col-span-2" : ""}`}>
                  <dt className="eyebrow text-graphite">{d.label}</dt>
                  <dd className="mt-2 text-lg font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
                    {d.href ? (
                      <a
                        href={d.href}
                        className={linkCls}
                        {...(d.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {d.value}
                        {d.external && <span className="sr-only"> (opens map in a new tab)</span>}
                      </a>
                    ) : (
                      d.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
