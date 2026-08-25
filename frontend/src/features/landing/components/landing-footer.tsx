import Link from "next/link";

import { GetraLogo } from "./getra-logo";

const footerGroups = [
  {
    title: "Explore",
    links: [
      ["Tentang", "#tentang"],
      ["Cara Kerja", "#cara-kerja"],
      ["Fitur", "#fitur"],
      ["Untuk UMKM", "#umkm"],
      ["Teknologi", "#teknologi"],
    ],
  },
  {
    title: "Access",
    links: [
      ["Masuk", "/login"],
      ["Daftar GETRA", "/signup"],
      ["Kembali ke atas", "#top"],
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="bg-[radial-gradient(circle_at_20%_0%,rgba(41,199,216,0.12),transparent_28%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan"
            aria-label="GETRA home"
          >
            <GetraLogo variant="footer" />
          </Link>

          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400">
            GETRA adalah WebGIS spatial decision support system untuk membaca
            akses transit, jaringan pedestrian, UMKM, community signal, dan
            konteks kawasan secara grounded.
          </p>

          <div className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-getra-green">
                GIS menghitung
              </span>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Route, distance, service area, dan spatial eligibility.
              </p>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-getra-cyan">
                AI menginterpretasikan
              </span>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Intent, filter, dan explanation yang tetap grounded.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={`Footer ${group.title}`}>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-getra-cyan">
                {group.title}
              </h2>
              <ul className="mt-4 grid gap-3">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-10 items-center rounded-lg py-1 text-sm font-bold text-slate-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-getra-cyan"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 pt-6 text-xs leading-6 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          MAPID 2025 / 2026 competition context: public landing showcase memakai
          data test/fixture dan tidak membuka API privat.
        </p>
        <p>© 2026 GETRA. Built for spatially grounded city decisions.</p>
      </div>
    </footer>
  );
}
