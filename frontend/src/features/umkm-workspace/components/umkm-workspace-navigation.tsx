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
  return <nav aria-label="Navigasi usaha" className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/90 p-1.5 shadow-sm">
    {UMKM_SECTIONS.map((item) => <button key={item.id} type="button" aria-current={section === item.id ? "page" : undefined}
      onClick={() => onChange(item.id)} className={`min-h-11 flex-auto rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${section === item.id ? "bg-white text-slate-900 shadow-sm border border-slate-200/80" : "text-slate-600 hover:bg-white/60 hover:text-slate-900"}`}>
      {item.label}
    </button>)}
  </nav>;
}
