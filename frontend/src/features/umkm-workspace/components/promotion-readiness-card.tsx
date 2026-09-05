"use client";

import Link from "next/link";
import { useAdvertisingEligibility } from "@/src/features/umkm-advertising/hooks/use-advertising-eligibility";
import { getPromotionRequirement, promotionRequirementHref } from "@/src/features/umkm-advertising/utils/promotion-requirement";

export function PromotionReadinessCard({ merchantId, merchantName, onReviewVisibility, refreshToken }: {
  merchantId: string;
  merchantName?: string;
  onReviewVisibility?: () => void;
  refreshToken?: unknown;
}) {
  const { eligibility, loading, error, refetch } = useAdvertisingEligibility(merchantId, refreshToken);
  const actionClass = "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-emerald-400/30 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10 sm:w-auto";
  const requirement = eligibility && !eligibility.eligible ? getPromotionRequirement(eligibility.reason) : null;

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/70 p-5 sm:p-6" aria-label="Kesiapan promosi">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Promosikan Usaha</p>
      {merchantName && <p className="mt-2 break-words text-sm text-slate-300">{merchantName}</p>}
      <h2 className="mt-2 text-xl font-bold text-slate-100">
        {loading ? "Memeriksa kesiapan promosi…" : error || !eligibility ? "Kesiapan promosi belum tersedia" : eligibility.eligible ? "Siap Dipromosikan" : "Belum Siap Dipromosikan"}
      </h2>
      {loading ? <p className="mt-2 text-sm text-slate-400" role="status">Memeriksa persyaratan usaha Anda.</p> : null}
      {error && <><p className="mt-2 text-sm text-slate-400" role="alert">{error}</p><button type="button" className={actionClass} onClick={() => void refetch()}>Coba lagi</button></>}
      {!loading && !error && eligibility?.eligible && <>
        <p className="mt-2 text-sm leading-6 text-slate-400">Usaha memenuhi persyaratan promosi. Buat draf, lalu lengkapi materi, sasaran, dan jadwal sebelum mengaktifkannya.</p>
        <Link className={actionClass} href={`/umkm/advertising?merchantId=${encodeURIComponent(merchantId)}#buat-promosi`}>Buat Promosi</Link>
      </>}
      {!loading && !error && requirement && <>
        <p className="mt-2 text-sm leading-6 text-slate-400">{requirement.detail}</p>
        {onReviewVisibility && requirement.destination === "visibility"
          ? <button type="button" className={actionClass} onClick={onReviewVisibility}>Lihat yang perlu dilengkapi</button>
          : <Link className={actionClass} href={promotionRequirementHref(requirement.destination, merchantId)}>Lihat yang perlu dilengkapi</Link>}
      </>}
    </section>
  );
}
