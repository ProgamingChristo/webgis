"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Store } from "lucide-react";
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
      <Suspense fallback={<p className="text-sm text-slate-300">Memuat usaha Anda…</p>}>
        <MerchantAdvertising />
      </Suspense>
    </GetraAppShell>
  );
}

export function MerchantAdvertising() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { ownedMerchants, ineligibleMerchants, loading, error, refetch } = useUserMerchants();
  const merchants = [...ownedMerchants, ...ineligibleMerchants];
  const requestedMerchantId = searchParams.get("merchantId");
  const activeMerchant = requestedMerchantId
    ? merchants.find((merchant) => merchant.id === requestedMerchantId)
    : merchants[0];

  if (loading) return <p className="rounded-2xl border border-slate-700 p-5 text-sm text-slate-300" role="status">Memuat usaha Anda…</p>;
  if (error) return (
    <section className="rounded-2xl border border-slate-700 p-5 text-sm text-slate-300">
      <p role="alert">Usaha Anda belum dapat dimuat.</p>
      <button type="button" onClick={() => void refetch()} className="mt-3 min-h-10 font-semibold text-cyan-300">Coba lagi</button>
    </section>
  );
  if (merchants.length === 0) return (
    <section className="rounded-2xl border border-slate-700 bg-slate-950/80 p-6">
      <h2 className="font-bold text-slate-100">Kelola usaha sebelum membuat promosi</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">Daftarkan atau klaim usaha, lalu tunggu verifikasi kepemilikan dari admin.</p>
      <Link href="/umkm" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-cyan-400/30 px-4 text-sm font-semibold text-cyan-200">Kembali ke Ruang Usaha</Link>
    </section>
  );

  return (
    <div className="advertising-theme mx-auto max-w-5xl space-y-6 text-slate-100">
      <Link href={activeMerchant ? `/umkm?merchantId=${encodeURIComponent(activeMerchant.id)}#promosi` : "/umkm"} className="inline-flex min-h-10 items-center text-sm font-semibold text-cyan-300">Kembali ke Ruang Usaha</Link>
      <section className="rounded-2xl border border-slate-700 bg-slate-950/80 p-5">
        <div className="flex items-center gap-2"><Store size={18} className="text-emerald-300" aria-hidden="true" /><h2 className="font-semibold">Usaha yang dipromosikan</h2></div>
        {merchants.length > 1 || !activeMerchant ? (
          <div className="mt-4">
            <label htmlFor="promotion-merchant" className="mb-2 block text-sm text-slate-300">Pilih usaha</label>
            <select
              id="promotion-merchant"
              className="min-h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100"
              value={activeMerchant?.id || ""}
              onChange={(event) => router.replace(`/umkm/advertising?merchantId=${encodeURIComponent(event.target.value)}`, { scroll: false })}
            >
              {!activeMerchant && <option value="" disabled>Pilih usaha Anda</option>}
              {merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>)}
            </select>
          </div>
        ) : <p className="mt-3 break-words font-bold">{activeMerchant.name}</p>}
        {activeMerchant?.address && <p className="mt-2 break-words text-sm text-slate-400">{activeMerchant.address}</p>}
      </section>
      {activeMerchant ? (
        <AdvertisingEligibilityGate key={activeMerchant.id} merchantId={activeMerchant.id}>
          <CampaignList key={activeMerchant.id} merchantId={activeMerchant.id} merchantName={activeMerchant.name} />
        </AdvertisingEligibilityGate>
      ) : <p className="text-sm text-slate-300" role="alert">Usaha pada tautan tidak tersedia untuk akun Anda. Pilih usaha dari daftar di atas.</p>}
    </div>
  );
}
