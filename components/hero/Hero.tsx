import type { CSSProperties } from "react";
import { company, contact, services } from "@/lib/content";
import HeroFrame from "./HeroFrame";
import HeroVisual from "./HeroVisual";
import s from "./Hero.module.css";

const DOTS = ["bg-blue", "bg-green", "bg-red"] as const;
const TICKER_COPIES = [0, 1, 2, 3];

// "Delivering a Better Product" -> "Delivering a better product."
const sentence = `${company.tagline.charAt(0)}${company.tagline.slice(1).toLowerCase()}.`;
const [before, after] = sentence.split("better");
const certification = `${company.certification.charAt(0).toLowerCase()}${company.certification.slice(1)}`;
const city = contact.city.split(",")[0];

const delay = (sec: number) => ({ "--delay": `${sec}s` }) as CSSProperties;

function Underline() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 30"
      preserveAspectRatio="none"
      className={`${s.swash} pointer-events-none absolute -bottom-[0.16em] -left-[3%] h-[0.3em] w-[106%] overflow-visible`}
    >
      <path
        d="M4 19C48 12 104 9 162 10.5C214 12 262 17 298 12.5C306 11.5 311 10 316 8"
        pathLength={1}
        fill="none"
        stroke="var(--blue)"
        strokeWidth={7}
        strokeLinecap="round"
      />
    </svg>
  );
}

function Ticker() {
  return (
    <div className="relative border-t border-line bg-paper/80">
      <ul className="sr-only">
        {services.map((sv) => (
          <li key={sv.id}>{sv.title}</li>
        ))}
      </ul>
      <div aria-hidden className="overflow-hidden py-4">
        <div className={`${s.track} flex w-max`}>
          {TICKER_COPIES.map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {services.map((sv, i) => (
                <span key={sv.id} className="eyebrow flex items-center whitespace-nowrap text-graphite">
                  <span className={`mx-6 h-1.5 w-1.5 rounded-full ${DOTS[i % 3]}`} />
                  {sv.title}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <HeroFrame className={`${s.frame} relative flex min-h-[calc(100svh-72px)] flex-col overflow-hidden`}>
      <div aria-hidden className={s.drafting} />

      <div className="container-x relative grid flex-1 items-center gap-10 py-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:py-20">
        <div className="relative z-10">
          <p className={`eyebrow flex items-center gap-3 text-graphite ${s.rise}`} style={delay(0.05)}>
            <span aria-hidden className="hidden gap-1 sm:flex">
              {DOTS.map((c) => (
                <span key={c} className={`h-[3px] w-4 rounded-full ${c}`} />
              ))}
            </span>
            <span>
              <span className="whitespace-nowrap">{city}</span> ·{" "}
              <span className="whitespace-nowrap">Since {company.founded}</span>
            </span>
          </p>

          <h1
            id="hero-title"
            className={`display mt-6 text-[clamp(3rem,1.5rem+5.4vw,6.5rem)] text-ink ${s.rise}`}
            style={delay(0.15)}
          >
            {after === undefined ? (
              sentence
            ) : (
              <>
                {before}
                <span className="relative inline-block whitespace-nowrap">
                  better
                  <Underline />
                </span>
                {after}
              </>
            )}
          </h1>

          <p
            className={`mt-8 max-w-[34ch] text-lg leading-relaxed text-graphite [text-shadow:0_0_2px_var(--paper),0_0_8px_var(--paper)] md:text-xl ${s.rise}`}
            style={delay(0.35)}
          >
            HVAC, plumbing and architectural sheet metal for the Bay Area&rsquo;s builders — {certification}.
          </p>

          <div className={`mt-9 flex flex-wrap gap-3 ${s.rise}`} style={delay(0.5)}>
            <a href="#services" className="btn btn-primary">
              See what we build
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href={contact.phoneHref} className="btn btn-outline text-ink">
              Call {contact.phone}
            </a>
          </div>
        </div>

        <HeroVisual />
      </div>

      <Ticker />
    </HeroFrame>
  );
}
