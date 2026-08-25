"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GetraLogo } from "./getra-logo";
import { useScrollState } from "../hooks/use-scroll-state";

export function LandingHeader() {
  const scrolled = useScrollState(18);
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    ["Tentang", "#tentang"],
    ["Cara Kerja", "#cara-kerja"],
    ["Fitur", "#fitur"],
    ["Untuk UMKM", "#umkm"],
    ["Teknologi", "#teknologi"],
  ] as const;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 py-4 sm:px-6 lg:px-8">
      <nav
        className={`pointer-events-auto mx-auto flex min-h-[68px] max-w-7xl items-center justify-between rounded-2xl border px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl transition duration-300 ${
          scrolled
            ? "border-getra-cyan/20 bg-slate-950/88"
            : "border-white/10 bg-slate-950/62"
        }`}
        aria-label="Navigasi landing GETRA"
      >
        <Link
          href="/"
          className="group inline-flex items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan"
          aria-label="GETRA home"
        >
          <GetraLogo priority />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-getra-cyan"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-getra-cyan/55 px-4 text-sm font-black text-getra-cyan transition hover:bg-getra-cyan hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan sm:px-5"
          >
            Masuk
          </Link>

          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-black text-white transition hover:border-getra-cyan/55 hover:bg-getra-cyan/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMenuOpen((value) => !value)}
          >
            Menu
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="pointer-events-auto fixed inset-0 z-30 cursor-default bg-slate-950/20 lg:hidden"
            aria-label="Tutup menu navigasi"
            onClick={() => setMenuOpen(false)}
          />

          <aside
            id="landing-mobile-menu"
            className="pointer-events-auto fixed bottom-4 right-4 top-4 z-40 flex w-[min(260px,calc(100vw-4rem))] flex-col rounded-[1.75rem] border border-getra-cyan/25 bg-slate-950/96 p-4 shadow-2xl shadow-black/45 ring-1 ring-white/10 backdrop-blur-2xl lg:hidden"
            aria-label="Sidebar navigasi landing GETRA"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-getra-cyan">
                Navigasi
              </span>
              <button
                type="button"
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-white/15 text-sm font-black text-white transition hover:border-getra-cyan/55 hover:bg-getra-cyan/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan"
                aria-label="Tutup menu navigasi"
                onClick={() => setMenuOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {links.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="inline-flex min-h-12 items-center rounded-2xl border border-white/10 px-4 text-sm font-black text-slate-200 transition hover:border-getra-cyan/35 hover:bg-getra-cyan/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-getra-cyan"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
            </div>

            <Link
              href="/login"
              className="mt-auto inline-flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-getra-green to-getra-cyan px-4 text-sm font-black text-slate-950 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan"
              onClick={() => setMenuOpen(false)}
            >
              Masuk ke GETRA
            </Link>
          </aside>
        </>
      ) : null}
    </header>
  );
}
