"use client";

import { useEffect, useRef, useState } from "react";
import { BASE, company, contact } from "@/lib/content";
import { clamp } from "@/lib/motion";

const LINKS = [
  { label: "Services", href: "#services" },
  { label: "Shop", href: "#shop" },
  { label: "Reach", href: "#reach" },
  { label: "Work", href: "#work" },
  { label: "Credentials", href: "#credentials" },
  { label: "Contact", href: "#contact" },
] as const;

const STREAM_BG = ["bg-blue", "bg-green", "bg-red"] as const;
const STREAM_AFTER = ["after:bg-blue", "after:bg-green", "after:bg-red"] as const;

function PhoneIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <path d="M4.2 1.5 6 4.6a1 1 0 0 1-.2 1.2l-1 1a8.6 8.6 0 0 0 4.4 4.4l1-1a1 1 0 0 1 1.2-.2l3.1 1.8a1 1 0 0 1 .4 1.3l-.6 1.2a2 2 0 0 1-2 1.1C6.6 14.8 1.2 9.4.6 3.7a2 2 0 0 1 1.1-2L2.9 1a1 1 0 0 1 1.3.5Z" />
    </svg>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Scroll progress, split into three streams that fill in sequence.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      setScrolled(window.scrollY > 8);
      bars.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleX(${clamp(p * 3 - i)})`;
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header
      className={`sticky top-0 z-50 h-[72px] border-b bg-paper transition-colors duration-300 ${
        scrolled || open ? "border-line" : "border-transparent"
      }`}
    >
      <nav aria-label="Primary" className="container-x flex h-full items-center justify-between gap-6">
        <a href="#top" className="shrink-0 rounded-sm" onClick={close}>
          <img
            src={`${BASE}/brand/aam-logo-horizontal.png`}
            alt={company.name}
            width={1677}
            height={333}
            className="h-[34px] w-auto"
          />
        </a>

        <ul className="hidden items-center gap-7 lg:flex">
          {LINKS.map((l, i) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`relative py-2 text-[14px] font-semibold text-ink/75 transition-colors hover:text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-full after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100 focus-visible:after:scale-x-100 ${STREAM_AFTER[i % 3]}`}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a href={contact.phoneHref} className="btn btn-primary hidden px-4 py-2.5 text-[14px] sm:inline-flex">
            <PhoneIcon />
            {contact.phone}
          </a>
          <button
            ref={menuButton}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
            className="relative grid h-11 w-11 place-items-center rounded-full border border-ink/15 lg:hidden"
          >
            {/* three streams that fold into an X */}
            <span aria-hidden className="relative block h-3.5 w-5">
              {STREAM_BG.map((c, i) => (
                <span
                  key={c}
                  className={`absolute left-0 h-[2.5px] w-full rounded-full transition-[transform,opacity] duration-300 ease-out ${c} ${
                    ["top-0", "top-1/2 -translate-y-1/2", "bottom-0"][i]
                  } ${open ? ["translate-y-[5.75px] rotate-45", "opacity-0", "-translate-y-[5.75px] -rotate-45"][i] : ""}`}
                />
              ))}
            </span>
          </button>
        </div>
      </nav>

      {/* 3px scroll progress: blue, then green, then red */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-full flex h-[3px]">
        {STREAM_BG.map((c, i) => (
          <span key={c} className="relative flex-1 overflow-hidden">
            <span
              ref={(el) => {
                bars.current[i] = el;
              }}
              className={`absolute inset-0 origin-left ${c}`}
              style={{ transform: "scaleX(0)" }}
            />
          </span>
        ))}
      </div>

      <div
        id="mobile-menu"
        className={`absolute inset-x-0 top-full z-10 border-b border-line bg-paper shadow-[0_24px_48px_-24px_rgb(var(--ink-rgb)/0.25)] transition-[opacity,transform,visibility] duration-300 ease-out lg:hidden ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <ul className="container-x py-4">
          {LINKS.map((l, i) => (
            <li key={l.href} className="border-b border-line last:border-b-0">
              <a href={l.href} onClick={close} className="flex items-center gap-4 py-4 text-2xl font-bold text-ink">
                <span aria-hidden className={`h-2 w-2 rounded-full ${STREAM_BG[i % 3]}`} />
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="container-x pb-6">
          <a href={contact.phoneHref} onClick={close} className="btn btn-primary w-full justify-center">
            <PhoneIcon />
            Call {contact.phone}
          </a>
        </div>
      </div>
    </header>
  );
}
