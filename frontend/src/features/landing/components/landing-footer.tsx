import Link from "next/link";

import { GetraBrandMark } from "./getra-logo";

const footerGroups = [
  {
    title: "Menu",
    links: [
      ["Jelajahi", "#tentang"],
      ["Untuk Siapa", "#cara-kerja"],
      ["Fitur", "#fitur"],
      ["Peluang", "#umkm"],
      ["Teknologi", "#teknologi"],
    ],
  },
  {
    title: "Bantuan",
    links: [
      ["FAQ", "#faq"],
      ["Masuk", "/login"],
      ["Daftar GETRA", "/signup"],
      ["Kembali ke atas", "#top"],
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-[#464b71]/12 bg-white px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <Link
            href="/"
            className="inline-flex rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]"
            aria-label="GETRA home"
          >
            <GetraBrandMark showTagline className="text-xl" />
          </Link>

          <p className="mt-5 max-w-xl text-sm leading-7 text-[#66708d]">
            Peta Transit dan Usaha. GETRA membantu memahami mobilitas, usaha
            lokal, dan peluang di sekitar kota secara inklusif dan
            berkelanjutan.
          </p>

          <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#464b71]/10 bg-[#f6fbfb] p-4">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#118ab2]">
                Data lokasi menghitung
              </span>
              <p className="mt-2 text-xs leading-5 text-[#66708d]">
                Rute, jarak, area terjangkau, dan kesesuaian lokasi.
              </p>
            </div>
            <div className="rounded-2xl border border-[#464b71]/10 bg-[#f6fbfb] p-4">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#118ab2]">
                Asisten menjelaskan
              </span>
              <p className="mt-2 text-xs leading-5 text-[#66708d]">
                Pertanyaan, filter, dan penjelasan berdasarkan data GETRA.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={`Footer ${group.title}`}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-[#118ab2]">
                {group.title}
              </h2>
              <ul className="mt-4 grid gap-3">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex min-h-8 items-center rounded text-sm font-semibold text-[#464b71] transition hover:text-[#118ab2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#118ab2]"
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

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-[#464b71]/10 pt-6 text-xs leading-6 text-[#66708d] sm:flex-row sm:items-center sm:justify-between">
        <p>Halaman pengenalan ini memakai data contoh dan tidak menampilkan data pribadi atau data produksi.</p>
        <p>© 2026 GETRA. Membantu keputusan kota berdasarkan data lokasi.</p>
      </div>
    </footer>
  );
}
