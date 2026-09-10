import { LANDING_PROBLEM_TAGS } from "../data/landing-content";
import { GetraMapScreenshot } from "./getra-map-screenshot";
import { SectionShell } from "./section-shell";

export function WhyGetraSection() {
  return (
    <SectionShell
      id="tentang"
      eyebrow="Satu peta, banyak kebutuhan"
      title="Kota yang sama. Kebutuhan yang berbeda."
      description="GETRA menghubungkan mobilitas, usaha lokal, dan peluang wilayah dalam satu pengalaman berbasis lokasi yang hidup dan adaptif."
    >
      <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-[#464b71]/10 bg-[#f6fbfb] p-3 sm:p-5">
          <GetraMapScreenshot />
          <div className="absolute bottom-8 left-7 rounded-2xl border border-white/80 bg-white/92 p-4 shadow-[0_12px_24px_rgba(70,75,113,0.12)] backdrop-blur sm:bottom-10 sm:left-10">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#118ab2]">
              Semua berawal dari peta
            </span>
            <p className="mt-1 text-sm font-black text-[#464b71]">
              Akses dan kebutuhan dibaca bersama.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {LANDING_PROBLEM_TAGS.map((tag, index) => (
            <article
              key={tag.title}
              className="group rounded-[1.5rem] border border-[#464b71]/12 bg-white p-5 shadow-[0_10px_28px_rgba(70,75,113,0.05)] transition hover:-translate-y-0.5 hover:border-[#118ab2]/30"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#118ab2]">
                  {tag.layer}
                </span>
                <span className="text-2xl font-black tracking-[-0.08em] text-[#464b71]/12">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-2 text-base font-black text-[#464b71]">{tag.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#66708d]">{tag.description}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
