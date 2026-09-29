"use client";

import { useEffect } from "react";

export default function Reveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));

    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -80px 0px" }
    );
    els.forEach((el) => io.observe(el));

    const t = setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>(".reveal:not(.in)")
        .forEach((el) => el.classList.add("in"));
    }, 4000);

    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);
  return null;
}
