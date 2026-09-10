import { CheckCircle2, Clock3, Route } from "lucide-react";

const ITEMS = [
  {
    icon: Clock3,
    label: "Waktu berjalan",
    value: "8 menit",
  },
  {
    icon: Route,
    label: "Jangkauan",
    value: "10 menit berjalan",
  },
  {
    icon: CheckCircle2,
    label: "Keterangan",
    value: "Contoh tampilan",
  },
] as const;

export function HeroSpatialOverlay() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      {ITEMS.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-slate-950/72 p-3 backdrop-blur"
          >
            <div className="flex items-center gap-2 text-getra-cyan">
              <Icon size={15} aria-hidden="true" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {item.label}
              </span>
            </div>
            <strong className="mt-2 block text-sm text-white">
              {item.value}
            </strong>
          </div>
        );
      })}
    </div>
  );
}
