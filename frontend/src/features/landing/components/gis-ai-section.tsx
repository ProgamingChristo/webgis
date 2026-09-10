import { SectionShell } from "./section-shell";

const FLOW = [
  "Pengguna mengajukan pertanyaan",
  "Asisten memahami kebutuhan",
  "Kriteria pencarian disiapkan",
  "Data lokasi diperiksa",
  "Jarak dan rute dihitung",
  "Hasil yang sesuai dipilih",
  "Asisten menjelaskan hasil",
] as const;

export function GisAiSection() {
  return (
    <SectionShell
      eyebrow="Cara GETRA bekerja"
      title="Data menghitung. Asisten menjelaskan."
      description="Dari kebutuhan menjadi keputusan: GETRA menghitung jarak, waktu berjalan, rute, dan area terjangkau dari data lokasi. Asisten kemudian menjelaskan hasil tersebut dengan bahasa yang mudah dipahami."
    >
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[2rem] border border-[#464b71]/12 bg-[#f6fbfb] p-6 shadow-[0_14px_34px_rgba(70,75,113,0.06)]">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#118ab2]">
            Contoh pertanyaan
          </span>
          <p className="mt-4 rounded-2xl border border-[#118ab2]/18 bg-white p-4 text-lg font-black leading-7 text-[#464b71]">
            “Makan di bawah Rp30.000, maksimal 10 menit jalan.”
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-[#118ab2]/15 bg-white p-4">
              <strong className="text-sm text-[#118ab2]">Asisten memahami</strong>
              <ul className="mt-3 space-y-2 text-sm text-[#66708d]">
                <li>Kategori: makanan</li>
                <li>Harga: maksimal Rp30.000</li>
                <li>Waktu berjalan: maksimal 10 menit</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#62d6c8]/25 bg-[#edfbf8] p-4">
              <strong className="text-sm text-[#367e77]">GETRA menghitung</strong>
              <ul className="mt-3 space-y-2 text-sm text-[#66708d]">
                <li>Tempat yang sesuai</li>
                <li>Rute jalan kaki</li>
                <li>Jarak melalui jaringan jalan</li>
                <li>Area yang dapat dijangkau</li>
              </ul>
            </div>
          </div>
        </article>

        <ol className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FLOW.map((step, index) => (
            <li
              key={step}
              className="relative min-h-28 overflow-hidden rounded-[1.4rem] border border-[#464b71]/12 bg-white p-4 shadow-[0_8px_22px_rgba(70,75,113,0.04)]"
            >
              <span className="absolute -right-1 -top-5 text-6xl font-black tracking-[-0.1em] text-[#118ab2]/8">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="relative grid size-8 place-items-center rounded-xl bg-[#118ab2] text-xs font-black text-white">
                {index + 1}
              </span>
              <span className="relative mt-4 block text-sm font-black leading-6 text-[#464b71]">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </SectionShell>
  );
}
