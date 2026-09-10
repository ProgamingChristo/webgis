"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { GetraBrandMark } from "./getra-logo";
import { useScrollState } from "../hooks/use-scroll-state";

const links = [
  ["Untuk Siapa", "#cara-kerja"],
  ["Fitur", "#fitur"],
  ["Peluang", "#umkm"],
  ["Cara Kerja", "#tentang"],
  ["Teknologi", "#teknologi"],
  ["FAQ", "#faq"],
] as const;

export function LandingHeader() {
  const scrolled = useScrollState(18);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setMenuOpen(false);

    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) {
        return;
      }

      const focusable = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, menuOpen]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 py-4 sm:px-6 lg:px-8">
      <nav
        className={`pointer-events-auto mx-auto flex min-h-14 max-w-[1184px] items-center justify-between rounded-full border px-4 py-2 shadow-[0_10px_24px_rgba(70,75,113,0.08)] backdrop-blur-xl transition duration-300 sm:min-h-[70px] sm:px-6 ${
          scrolled
            ? "border-[#464b71]/15 bg-white/96"
            : "border-white/80 bg-white/84"
        }`}
        aria-label="Navigasi landing GETRA"
      >
        <Link
          href="/"
          className="group inline-flex items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]"
          aria-label="GETRA home"
        >
          <GetraBrandMark className="text-lg" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3 py-2 text-sm font-semibold text-[#464b71] transition hover:bg-[#118ab2]/8 hover:text-[#118ab2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#118ab2]"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-10 items-center justify-center rounded-full px-3 text-sm font-bold text-[#464b71] transition hover:text-[#118ab2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2] sm:inline-flex"
          >
            Masuk
          </Link>

          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#118ab2] px-4 text-sm font-black text-white shadow-[0_8px_18px_rgba(17,138,178,0.28)] transition hover:bg-[#0d7495] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2] sm:px-5"
          >
            Daftar Akun
          </Link>

          <button
            ref={triggerRef}
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#464b71]/15 px-4 text-sm font-black text-[#464b71] transition hover:border-[#118ab2]/45 hover:bg-[#118ab2]/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2] lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-haspopup="dialog"
            onClick={() => setMenuOpen((value) => !value)}
          >
            Menu
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <>
          <div
            className="pointer-events-auto fixed inset-0 z-30 bg-[#464b71]/20 lg:hidden"
            aria-hidden="true"
            onClick={() => closeMenu()}
          />

          <aside
            ref={menuRef}
            id="landing-mobile-menu"
            className="pointer-events-auto fixed bottom-4 right-4 top-4 z-40 flex w-[min(290px,calc(100vw-3rem))] flex-col rounded-[1.75rem] border border-[#464b71]/15 bg-white/98 p-4 shadow-2xl shadow-[#464b71]/25 ring-1 ring-white/70 backdrop-blur-2xl lg:hidden"
            aria-labelledby="landing-mobile-menu-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#464b71]/15 pb-4">
              <span
                id="landing-mobile-menu-title"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-[#118ab2]"
              >
                Navigasi
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[#464b71]/15 text-sm font-black text-[#464b71] transition hover:border-[#118ab2]/45 hover:bg-[#118ab2]/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]"
                aria-label="Tutup menu navigasi"
                onClick={() => closeMenu()}
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {links.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="inline-flex min-h-12 items-center rounded-2xl border border-[#464b71]/10 px-4 text-sm font-black text-[#464b71] transition hover:border-[#118ab2]/35 hover:bg-[#118ab2]/8 hover:text-[#118ab2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#118ab2]"
                  onClick={() => closeMenu(false)}
                >
                  {label}
                </a>
              ))}
            </div>

            <Link
              href="/login"
              className="mt-auto inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#118ab2] px-4 text-sm font-black text-white transition hover:bg-[#0d7495] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]"
              onClick={() => closeMenu(false)}
            >
              Masuk ke GETRA
            </Link>
          </aside>
        </>
      ) : null}
    </header>
  );
}
