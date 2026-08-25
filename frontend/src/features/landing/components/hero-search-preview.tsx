import { Search } from "lucide-react";

import { HERO_SEARCH_CHIPS } from "../data/landing-content";

export function HeroSearchPreview() {
  return (
    <section
      className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20"
      aria-label="Contoh smart search GETRA"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-getra-cyan/12 text-getra-cyan">
          <Search size={18} aria-hidden="true" />
        </span>

        <div>
          <p className="m-0 text-sm font-bold text-white">
            “Makan di bawah Rp30 ribu, maksimal 10 menit jalan”
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Preview konsep UI. Belum memanggil AI/backend.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {HERO_SEARCH_CHIPS.map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-getra-green/25 bg-getra-green/10 px-3 py-1 text-xs font-black text-lime-200"
          >
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}
