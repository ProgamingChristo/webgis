"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useScrollState } from "../hooks/use-scroll-state";
import { GetraLogo } from "./getra-logo";

export function LandingHeader() {
  const scrolled = useScrollState(18);
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [["Untuk Siapa", "#tentang"], ["Fitur", "#fitur"], ["Peluang", "#peluang"], ["Cara Kerja", "#cara-kerja"], ["FAQ", "#faq"]] as const;

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 py-5 sm:px-6 lg:px-8">
    <nav className={`getra-landing-nav getra-landing-header pointer-events-auto mx-auto flex min-h-[70px] max-w-[1280px] items-center justify-between border px-5 py-[15px] transition duration-300 sm:px-8 ${scrolled ? "getra-landing-nav--scrolled" : ""}`} aria-label="Navigasi landing GETRA">
      <Link href="/" className="getra-landing-brand group inline-flex items-center gap-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--getra-landing-primary)]" aria-label="GETRA home">
        <GetraLogo priority />
      </Link>
      <div className="hidden items-center gap-8 lg:flex">{links.map(([label, href]) => <a key={href} href={href} className="getra-landing-nav__link rounded-full px-0 py-2 text-[15px] font-medium">{label}</a>)}</div>
      <div className="flex items-center gap-3">
        <Link href="/login" className="getra-landing-header__login hidden rounded-full px-2 text-sm font-semibold sm:inline-flex">Masuk</Link>
        <Link href="/signup" className="getra-landing-header__cta hidden rounded-full px-6 py-2.5 text-sm font-semibold sm:inline-flex">Daftar Akun</Link>
        <button type="button" className="getra-landing-header__menu inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold lg:hidden" aria-expanded={menuOpen} aria-controls="landing-mobile-menu" onClick={() => setMenuOpen((value) => !value)}>Menu</button>
      </div>
    </nav>
    {menuOpen ? <><button type="button" className="pointer-events-auto fixed inset-0 z-30 cursor-default bg-[#464b71]/15 lg:hidden" aria-label="Tutup menu navigasi" onClick={() => setMenuOpen(false)} />
      <aside id="landing-mobile-menu" className="getra-landing-drawer pointer-events-auto fixed bottom-4 right-4 top-4 z-40 flex w-[min(280px,calc(100vw-2rem))] flex-col border p-5 lg:hidden" aria-label="Sidebar navigasi landing GETRA" role="dialog">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--getra-landing-line)] pb-4"><span className="getra-landing-eyebrow">Navigasi</span><button type="button" className="getra-landing-header__close inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border text-sm font-semibold transition" aria-label="Tutup menu navigasi" onClick={() => setMenuOpen(false)}>×</button></div>
        <div className="mt-4 grid gap-2">{links.map(([label, href]) => <a key={href} href={href} className="getra-landing-header__mobile-link inline-flex min-h-12 items-center rounded-[var(--getra-landing-radius-sm)] border px-4 text-sm font-semibold transition" onClick={() => setMenuOpen(false)}>{label}</a>)}</div>
        <Link href="/login" className="getra-landing-button getra-landing-button--primary mt-auto" onClick={() => setMenuOpen(false)}>Buka GETRA</Link>
      </aside></> : null}
  </header>;
}
