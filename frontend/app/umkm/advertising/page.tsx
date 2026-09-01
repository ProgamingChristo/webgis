"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Store, CheckCircle2, ChevronRight } from "lucide-react";
import { GetraAppShell } from "@/src/components/getra-ui";
import { AdvertisingEligibilityGate, CampaignList } from "@/src/features/umkm-advertising";
import { useUserMerchants } from "@/src/features/umkm-advertising/hooks/use-user-merchants";

export default function AdvertisingPage() {
  const [activeMerchantId, setActiveMerchantId] = useState<string | null>(null);

  const { ownedMerchants, ineligibleMerchants, loading, error, refetch } = useUserMerchants();

  // If user has owned merchants and no activeMerchantId is set yet, auto-select first one
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!activeMerchantId && ownedMerchants.length > 0) {
        setActiveMerchantId(ownedMerchants[0].id);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [ownedMerchants, activeMerchantId]);

  const activeMerchant = ownedMerchants.find(
    (m) => m.id === activeMerchantId
  );

  return (
    <GetraAppShell
      description="Kelola Sponsored Pin, promo card kontekstual, creative, targeting, schedule, dan analytics interaksi."
      eyebrow="GETRA Spatial Promotion"
      title="Advertising & Promosi"
      tone="umkm"
    >
    <div className="advertising-theme text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        {!activeMerchantId ? (
          <div className="space-y-6">
            {loading ? (
              <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-300">
                Memeriksa merchant yang memenuhi syarat promosi...
              </section>
            ) : null}
            {error ? (
              <section className="rounded-2xl border border-rose-500/25 bg-rose-950/20 p-6 text-sm text-rose-200" role="alert">
                {error}
              </section>
            ) : null}
            {/* Owned Merchants List */}
            {!loading && !error && ownedMerchants.length > 0 && (
              <section className="rounded-2xl border border-emerald-400/25 bg-slate-950/80 p-5 shadow-xl sm:p-6">
                <div className="flex items-center gap-2">
                  <Store className="size-4 text-emerald-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-emerald-300">
                    Toko Terdaftar Milik Anda
                  </h2>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Pilih toko yang ingin Anda promosikan:
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {ownedMerchants.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMerchantId(m.id)}
                      className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left transition hover:border-emerald-400/60 hover:bg-slate-900"
                    >
                      <div>
                        <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                          <strong className="min-w-0 break-words text-sm font-bold leading-5 text-slate-100 group-hover:text-emerald-300">
                            {m.name}
                          </strong>
                          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <CheckCircle2 className="size-3" /> Terdaftar
                          </span>
                        </div>
                        {m.address && (
                          <p className="mt-1 break-words text-xs leading-5 text-slate-400 line-clamp-2">{m.address}</p>
                        )}
                        <p className="mt-2 break-all font-mono text-[10px] text-slate-500">{m.id}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-end text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                        Kelola Promosi <ChevronRight className="size-3 ml-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!loading && !error && ownedMerchants.length === 0 ? (
              <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/80 p-5 shadow-xl sm:p-6">
                <div className="flex items-center gap-2">
                  <Store className="size-4 text-cyan-400" />
                  <h2 className="text-sm font-black uppercase tracking-wider text-cyan-300">
                    Merchant terverifikasi diperlukan
                  </h2>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {ineligibleMerchants.length > 0
                    ? eligibilityMessage(ineligibleMerchants[0]?.reason)
                    : "Campaign hanya dapat dikelola untuk merchant dengan ownership canonical aktif dan status terverifikasi."}
                </p>
                <Link href="/umkm/merchants/new" className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-cyan-400/30 px-4 text-xs font-bold text-cyan-200">
                  Daftarkan / Klaim Usaha
                </Link>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
                  Merchant Aktif
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Store className="size-4 text-cyan-400" />
                  <strong className="text-base text-slate-100">
                    {activeMerchant?.name || "Merchant"}
                  </strong>
                </div>
                <p className="mt-0.5 break-all font-mono text-xs text-slate-400">
                  {activeMerchantId}
                </p>
              </div>
              <button
                onClick={() => setActiveMerchantId(null)}
                className="min-h-10 rounded-xl border border-slate-600 px-4 text-xs font-bold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
              >
                Ganti Merchant
              </button>
            </div>

            <AdvertisingEligibilityGate
              merchantId={activeMerchantId}
              onClaimSuccess={() => refetch()}
            >
              <div className="mt-6 border-t border-slate-800 pt-6">
                <CampaignList merchantId={activeMerchantId} />
              </div>
            </AdvertisingEligibilityGate>
          </div>
        )}
      </div>
    </div>
    </GetraAppShell>
  );
}

function eligibilityMessage(reason?: string | null) {
  if (reason === "MERCHANT_UNVERIFIED") return "Usaha milik Anda belum terverifikasi untuk promosi.";
  if (reason === "MERCHANT_INACTIVE") return "Usaha milik Anda sedang tidak aktif atau belum dipublikasikan.";
  if (reason === "GEOMETRY_INVALID") return "Lokasi usaha belum valid untuk promosi spasial.";
  if (reason === "UMKM_MODE_REQUIRED") return "Mode UMKM perlu diaktifkan sebelum mengelola promosi.";
  return "Anda belum memiliki usaha terverifikasi yang dapat dikelola untuk promosi.";
}
