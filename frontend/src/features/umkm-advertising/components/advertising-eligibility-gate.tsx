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

  if (loading) return <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-xs" role="status">Memeriksa kesiapan promosi…</p>;
  if (error || !eligibility) return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-xs">
      <p role="alert" className="text-red-600 font-semibold">{error || "Kesiapan promosi belum tersedia."}</p>
      <button type="button" onClick={() => void refetch()} className="mt-3 min-h-10 font-bold text-sky-600 hover:text-sky-700">Coba lagi</button>
    </section>
  );
  if (eligibility.eligible) return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="mb-6 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
        <Check size={16} className="text-emerald-600" aria-hidden="true" />
        Siap dipromosikan
      </div>
      {children}
    </section>
  );

  const requirement = getPromotionRequirement(eligibility.reason);
  const title = eligibility.reason === "PROFILE_INCOMPLETE"
    ? "Profil perlu dilengkapi"
    : "Belum memenuhi syarat promosi";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{requirement.detail}</p>
      <Link href={promotionRequirementHref(requirement.destination, merchantId)} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white shadow-xs hover:bg-sky-700 transition">{requirement.action}</Link>
    </section>
  );
}
