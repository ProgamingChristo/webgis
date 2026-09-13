/** Shared light GETRA controls used by owner submission and admin review. */
export const reviewStyles = {
  card: "min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6",
  inset: "min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4",
  focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
  button: "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  primary: "border border-sky-700 bg-sky-700 text-white hover:bg-sky-800",
  success: "border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
  danger: "border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  error: "rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800",
} as const;
