import { SectionShell } from "./section-shell";

const FLOW = [
  "User Question",
  "AI Intent Parsing",
  "Structured Parameters",
  "PostGIS / pgRouting",
  "Spatial Computation",
  "Ranked / Route Result",
  "Grounded AI Explanation",
] as const;

export function GisAiSection() {
  return (
    <SectionShell
      eyebrow="GIS vs AI"
      title="GIS menghitung. AI menginterpretasikan."
      description="Landing ini tidak memanggil production AI. Contoh di bawah hanya menjelaskan pembagian peran: AI menyusun intent, GIS menghitung rute, distance, walking time, service area, containment, dan eligibility."
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-getra-green">
              Example query
            </span>
            <p className="mt-3 rounded-2xl border border-getra-cyan/20 bg-slate-950/70 p-4 text-lg font-black text-white">
              “makan di bawah 30 ribu maksimal 10 menit jalan”
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-getra-cyan/20 bg-getra-cyan/10 p-4">
              <strong className="text-sm text-getra-cyan">AI interprets</strong>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>category = food</li>
                <li>max_price = 30000</li>
                <li>max_walk_time = 10</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-getra-green/20 bg-getra-green/10 p-4">
              <strong className="text-sm text-lime-200">GIS calculates</strong>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>candidate merchants</li>
                <li>walking route</li>
                <li>network distance</li>
                <li>service area eligibility</li>
              </ul>
            </div>
          </div>
        </div>

        <ol className="grid gap-3">
          {FLOW.map((step, index) => (
            <li
              key={step}
              className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/45 p-4"
            >
              <span className="grid size-10 place-items-center rounded-full border border-getra-cyan/40 bg-getra-cyan/10 text-xs font-black text-getra-cyan">
                {index + 1}
              </span>
              <span className="font-black text-white">{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </SectionShell>
  );
}
