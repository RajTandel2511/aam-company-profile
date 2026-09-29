import { BASE, company, contact, credentials, BUILD_YEAR } from "@/lib/content";

const credential = (label: string) => credentials.find((c) => c.label === label)?.value ?? "";
const licenseLine = `CA License ${credential("CA Contractor License")} · DIR ${credential("DIR Registration")}`;

// Mirrors the section ids/labels in components/Nav.tsx.
const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#shop", label: "Shop" },
  { href: "#reach", label: "Reach" },
  { href: "#work", label: "Work" },
  { href: "#credentials", label: "Credentials" },
  { href: "#contact", label: "Contact" },
];

const linkCls =
  "text-ink underline decoration-transparent underline-offset-4 transition-colors hover:text-blue-ink hover:decoration-blue-ink";

export default function Footer() {
  const year = BUILD_YEAR;
  return (
    <footer className="border-t border-line bg-white">
      <div className="container-x py-14 md:py-20">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <img
              src={`${BASE}/brand/aam-logo-vertical.png`}
              alt={`${company.short} logo`}
              width={126}
              height={96}
              loading="lazy"
              decoding="async"
              className="h-24 w-auto"
            />
            <p className="mt-6 font-bold text-ink">{company.name}</p>
            <p className="text-graphite">{company.certification}</p>
            <p className="eyebrow mt-3 text-graphite">{licenseLine}</p>
          </div>

          <nav aria-label="Footer" className="md:col-span-3">
            <p className="eyebrow text-graphite">Sections</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-semibold md:grid-cols-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={linkCls}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <address className="not-italic md:col-span-4">
            <p className="eyebrow text-graphite">Office</p>
            <p className="mt-4 text-ink">
              {contact.street}
              <br />
              {contact.city}
            </p>
            <p className="mt-3">
              <a href={contact.phoneHref} className={`font-semibold ${linkCls}`}>
                {contact.phone}
              </a>
              <br />
              <a href={`mailto:${contact.email}`} className={`font-semibold [overflow-wrap:anywhere] ${linkCls}`}>
                {contact.email}
              </a>
            </p>
          </address>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <div>
            <p className="text-sm text-graphite">
              © {year} {company.name}
            </p>
            {/* Remove once AAM approves this page for publication. */}
            <p className="mt-1 text-xs text-graphite">
              Concept draft — not an official website of {company.name}
            </p>
          </div>
          <a href="#top" className={`group eyebrow inline-flex items-center gap-2 ${linkCls}`}>
            <span aria-hidden className="flex gap-[3px]">
              <span className="h-[2px] w-2.5 bg-blue" />
              <span className="h-[2px] w-2.5 bg-green" />
              <span className="h-[2px] w-2.5 bg-red" />
            </span>
            Back to top
            <span aria-hidden className="inline-block transition-transform duration-300 ease-out group-hover:-translate-y-1">
              ↑
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
