"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useAdvertisingEligibility } from "../hooks/use-advertising-eligibility";
import { getPromotionRequirement, promotionRequirementHref } from "../utils/promotion-requirement";

export function AdvertisingEligibilityGate({ merchantId, children }: {
  merchantId: string;
  children?: ReactNode;
  onClaimSuccess?: () => void;
}) {
  const { eligibility, loading, error, refetch } = useAdvertisingEligibility(merchantId);

  if (loading) return <p className="rounded-2xl border border-slate-700 p-5 text-sm text-slate-300" role="status">Memeriksa kesiapan promosi…</p>;
  if (error || !eligibility) return (
    <section className="rounded-2xl border border-slate-700 p-5 text-slate-300">
      <p role="alert">{error || "Kesiapan promosi belum tersedia."}</p>
      <button type="button" onClick={() => void refetch()} className="mt-3 min-h-10 font-semibold text-cyan-300">Coba lagi</button>
    </section>
  );
  if (eligibility.eligible) return (
    <section className="rounded-2xl border border-emerald-400/20 bg-slate-950/80 p-5 sm:p-6">
      <p className="mb-5 flex items-center gap-2 font-semibold text-emerald-200"><Check size={18} aria-hidden="true" />Siap Dipromosikan</p>
      {children}
    </section>
  );

  const requirement = getPromotionRequirement(eligibility.reason);
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/80 p-5 sm:p-6">
      <h2 className="font-bold text-slate-100">Belum Siap Dipromosikan</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{requirement.detail}</p>
      <Link href={promotionRequirementHref(requirement.destination, merchantId)} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-cyan-400/30 px-4 text-sm font-semibold text-cyan-200">{requirement.action}</Link>
    </section>
  );
}
