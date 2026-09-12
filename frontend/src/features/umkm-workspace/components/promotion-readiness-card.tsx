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
  const actionClass = "mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 sm:w-auto";
  const requirement = eligibility && !eligibility.eligible ? getPromotionRequirement(eligibility.reason) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm" aria-label="Kesiapan promosi">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Kesiapan Promosi</p>
      {merchantName && <p className="mt-1 break-words text-xs text-slate-500">{merchantName}</p>}
      <h2 className="mt-2 text-lg font-bold text-slate-900">
        {loading ? "Memeriksa kesiapan promosi…" : error || !eligibility ? "Kesiapan promosi belum tersedia" : eligibility.eligible ? "Siap Dipromosikan" : "Belum Siap Dipromosikan"}
      </h2>
      {loading ? <p className="mt-2 text-xs text-slate-500" role="status">Memeriksa persyaratan usaha Anda...</p> : null}
      {error && <><p className="mt-2 text-xs text-rose-600" role="alert">{error}</p><button type="button" className={actionClass} onClick={() => void refetch()}>Coba lagi</button></>}
      {!loading && !error && eligibility?.eligible && <>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">Usaha memenuhi persyaratan promosi. Buat draf, lalu lengkapi materi, sasaran, dan jadwal sebelum mengaktifkannya.</p>
        <Link className={actionClass} href={`/umkm/advertising?merchantId=${encodeURIComponent(merchantId)}#buat-promosi`}>Buat Promosi</Link>
      </>}
      {!loading && !error && requirement && <>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">{requirement.detail}</p>
        {onReviewVisibility && requirement.destination === "visibility"
          ? <button type="button" className={actionClass} onClick={onReviewVisibility}>Lihat yang perlu dilengkapi</button>
          : <Link className={actionClass} href={promotionRequirementHref(requirement.destination, merchantId)}>Lihat yang perlu dilengkapi</Link>}
      </>}
    </section>
  );
}
