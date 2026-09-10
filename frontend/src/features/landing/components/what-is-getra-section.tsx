import { WHAT_IS_GETRA_NODES } from "../data/landing-content";
import { GetraBrandMark } from "./getra-logo";
import { SectionShell } from "./section-shell";

export function WhatIsGetraSection() {
  return (
    <SectionShell
      id="cara-kerja"
      eyebrow="Personalisasi sudut pandang"
      title="GETRA beradaptasi dengan cara Anda melihat kota."
      description="Satu platform dengan pengalaman berbeda untuk setiap kebutuhan: dari langkah pejalan kaki, denyut toko lokal, hingga analisis prospek wilayah."
    >
      <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <article className="rounded-[2rem] border border-[#464b71]/12 bg-[#f6fbfb] p-6 shadow-[0_14px_34px_rgba(70,75,113,0.06)] sm:p-8">
          <GetraBrandMark showTagline className="text-2xl" />
          <p className="mt-6 max-w-md text-base leading-8 text-[#66708d]">
            Gunakan peta untuk mencari tempat, menilai akses, membagikan
            temuan, dan memahami kondisi area dari konteks yang Anda butuhkan.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["Transit", "Pejalan kaki", "Komunitas", "UMKM"].map((item) => (
              <span
                key={item}
                className="rounded-full border border-[#118ab2]/18 bg-white px-3 py-1.5 text-xs font-black text-[#464b71]"
              >
                {item}
              </span>
            ))}
          </div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2">
          {WHAT_IS_GETRA_NODES.map((node, index) => (
            <article
              key={node.title}
              className="relative overflow-hidden rounded-[1.5rem] border border-[#464b71]/12 bg-white p-5 shadow-[0_10px_28px_rgba(70,75,113,0.05)]"
            >
              <span className="absolute -right-1 -top-5 text-7xl font-black tracking-[-0.1em] text-[#118ab2]/8">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[#118ab2]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="relative mt-4 text-lg font-black text-[#464b71]">{node.title}</h3>
              <p className="relative mt-3 text-sm leading-6 text-[#66708d]">{node.description}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
