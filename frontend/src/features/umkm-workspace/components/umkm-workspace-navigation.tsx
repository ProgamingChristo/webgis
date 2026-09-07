"use client";

export const UMKM_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "usaha-saya", label: "Usaha Saya" },
  { id: "visibilitas", label: "Visibilitas" },
  { id: "peluang", label: "Peluang di Sekitar" },
  { id: "promosi", label: "Promosi" },
] as const;
export type UmkmSection = typeof UMKM_SECTIONS[number]["id"];

export function UmkmWorkspaceNavigation({ section, onChange }: { section: UmkmSection; onChange: (section: UmkmSection) => void }) {
  return <nav aria-label="Navigasi usaha" className="flex flex-wrap gap-1 rounded-xl border border-slate-700 bg-slate-950/60 p-1.5">
    {UMKM_SECTIONS.map((item) => <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined}
      onClick={() => onChange(item.id)} className={`min-h-11 flex-auto rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none ${section === item.id ? "bg-slate-800 text-emerald-300" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
      {item.label}
    </button>)}
  </nav>;
}
