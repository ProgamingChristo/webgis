import { LANDING_PROBLEM_TAGS } from "../data/landing-content";
import { GetraMapScreenshot } from "./getra-map-screenshot";
import { SectionShell } from "./section-shell";

export function WhyGetraSection() {
  return (
    <SectionShell
      id="tentang"
      eyebrow="Why GETRA exists"
      title="Sebuah kota tidak berhenti di pintu stasiun."
      description="Perjalanan setelah turun dari transportasi massal sering kali justru menjadi bagian yang paling sulit dinilai. GETRA membaca akses, demand, relevance, dan freshness sebagai layer spasial yang saling terkait."
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2.4rem] border border-getra-cyan/20 bg-[radial-gradient(circle_at_28%_20%,rgba(41,199,216,0.14),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3 sm:p-5">
          <GetraMapScreenshot />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {LANDING_PROBLEM_TAGS.map((tag) => (
            <article
              key={tag.title}
              className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-getra-cyan/40 hover:bg-getra-cyan/5 focus-within:border-getra-cyan/40"
              tabIndex={0}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-getra-green">
                {tag.layer}
              </span>
              <h3 className="mt-3 text-base font-black text-white">
                {tag.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {tag.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
