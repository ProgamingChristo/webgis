"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { GetraAppShell } from "@/src/components/getra-ui";
import { AdvertisingEligibilityGate, CampaignList } from "@/src/features/umkm-advertising";
import { useUserMerchants } from "@/src/features/umkm-advertising/hooks/use-user-merchants";

export default function AdvertisingPage() {
  return (
    <GetraAppShell
      description="Periksa kesiapan usaha, buat promosi, dan pantau hasilnya."
      eyebrow="Ruang Usaha"
      title="Promosikan Usaha"
      tone="umkm"
    >
      <Suspense fallback={<p className="text-sm text-slate-600">Memuat usaha Anda…</p>}>
        <MerchantAdvertising />
      </Suspense>
    </GetraAppShell>
  );
}

function MerchantAdvertising() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { ownedMerchants, ineligibleMerchants, allBusinesses, loading, error, refetch } = useUserMerchants();
  const merchants = allBusinesses && allBusinesses.length > 0
    ? allBusinesses
    : [...ownedMerchants, ...ineligibleMerchants];
  const requestedMerchantId = searchParams.get("merchantId");
  const activeMerchant = requestedMerchantId
    ? merchants.find((merchant) => merchant.id === requestedMerchantId)
    : merchants[0];

  if (loading) return <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-xs" role="status">Memuat usaha Anda…</p>;
  if (error) return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-xs">
      <p role="alert" className="text-red-600 font-semibold">Usaha Anda belum dapat dimuat.</p>
      <button type="button" onClick={() => void refetch()} className="mt-3 min-h-10 font-bold text-sky-600 hover:text-sky-700">Coba lagi</button>
    </section>
  );
  if (merchants.length === 0) return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <h2 className="text-lg font-bold text-slate-900">Kelola usaha sebelum membuat promosi</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Daftarkan atau klaim usaha, lalu tunggu verifikasi kepemilikan dari admin.</p>
      <Link href="/umkm" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white shadow-xs hover:bg-sky-700 transition">Kembali ke Ruang Usaha</Link>
    </section>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-slate-900">
      <Link
        href={activeMerchant ? `/umkm?merchantId=${encodeURIComponent(activeMerchant.id)}#promosi` : "/umkm"}
        className="inline-flex min-h-10 items-center gap-1.5 text-sm font-bold text-sky-600 hover:text-sky-700 transition"
      >
        <ArrowLeft size={16} />
        Kembali ke Ruang Usaha
      </Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <Store size={20} className="text-sky-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">Usaha yang dipromosikan</h2>
        </div>
        {merchants.length > 1 || !activeMerchant ? (
          <div className="mt-4">
            <label htmlFor="promotion-merchant" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Pilih usaha</label>
            <select
              id="promotion-merchant"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50/60 px-3.5 text-sm text-slate-900 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 outline-hidden transition"
              value={activeMerchant?.id || ""}
              onChange={(event) => router.replace(`/umkm/advertising?merchantId=${encodeURIComponent(event.target.value)}`, { scroll: false })}
            >
              {!activeMerchant && <option value="" disabled>Pilih usaha Anda</option>}
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name} ({merchant.statusLabel || (merchant.canCreateCampaign ? "Siap dipromosikan" : "Perlu verifikasi")})
                </option>
              ))}
            </select>
          </div>
        ) : <p className="mt-3 break-words font-bold text-slate-900 text-base">{activeMerchant.name}</p>}
        {activeMerchant?.address && <p className="mt-2 break-words text-xs text-slate-500">{activeMerchant.address}</p>}
      </section>

      {activeMerchant ? (
        activeMerchant.relationshipState === "SUBMISSION_PENDING" ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6 shadow-xs" data-testid="submission-pending-card">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-amber-900">{activeMerchant.name}</h3>
              <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800">
                Menunggu verifikasi
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-700">
              Verifikasi diperlukan sebelum promosi dapat dibuat.
            </p>
            <div className="mt-4">
              <Link
                href="/umkm#pengajuan"
                className="inline-flex min-h-10 items-center rounded-xl border border-amber-300 bg-white px-4 text-xs font-bold text-amber-800 hover:bg-amber-100 shadow-xs"
              >
                Lihat Status
              </Link>
            </div>
          </section>
        ) : activeMerchant.relationshipState === "CLAIM_PENDING" ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6 shadow-xs" data-testid="claim-pending-card">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-amber-900">{activeMerchant.name}</h3>
              <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800">
                Claim sedang diperiksa
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-700">
              Setelah kepemilikan disetujui, usaha dapat dipromosikan.
            </p>
            <div className="mt-4">
              <Link
                href="/umkm#klaim"
                className="inline-flex min-h-10 items-center rounded-xl border border-amber-300 bg-white px-4 text-xs font-bold text-amber-800 hover:bg-amber-100 shadow-xs"
              >
                Lihat Status
              </Link>
            </div>
          </section>
        ) : (
          <AdvertisingEligibilityGate key={activeMerchant.id} merchantId={activeMerchant.id}>
            <CampaignList key={activeMerchant.id} merchantId={activeMerchant.id} merchantName={activeMerchant.name} />
          </AdvertisingEligibilityGate>
        )
      ) : (
        <p className="text-sm text-slate-600" role="alert">Usaha pada tautan tidak tersedia untuk akun Anda. Pilih usaha dari daftar di atas.</p>
      )}
    </div>
  );
}
