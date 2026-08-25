import { LANDING_METRICS } from "../data/landing-content";

export function HeroMetricStrip() {
  return (
    <section
      className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.035] p-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Pilar GETRA"
    >
      {LANDING_METRICS.map((metric) => (
        <article
          key={metric.label}
          className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-getra-cyan">
            {metric.label}
          </span>
          <strong className="mt-2 block text-sm text-white">
            {metric.value}
          </strong>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            {metric.description}
          </p>
        </article>
      ))}
    </section>
  );
}
