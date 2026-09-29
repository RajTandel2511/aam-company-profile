import type { Metadata } from "next";
import "./globals.css";
import { company } from "@/lib/content";

export const metadata: Metadata = {
  title: `${company.name} — ${company.tagline}`,
  description:
    "HVAC, plumbing and architectural sheet metal for Bay Area builders since 1994. An SBE & MBE company, headquartered in South San Francisco.",
  // Concept draft: reachable by link, kept out of search results until AAM approves it.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Montserrat matches the geometric wordmark in the AAM logo. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400..800&family=JetBrains+Mono:wght@400..600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
