"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Store, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { AdvertisingEligibilityGate, CampaignList } from "@/src/features/umkm-advertising";
import { useUserMerchants } from "@/src/features/umkm-advertising/hooks/use-user-merchants";

export default function AdvertisingPage() {
  const initialMerchantId = () => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("merchantId") ?? "";
    }
    return "";
  };

  const [merchantIdInput, setMerchantIdInput] = useState<string>(initialMerchantId);
  const [activeMerchantId, setActiveMerchantId] = useState<string | null>(
    initialMerchantId() || null
  );

  const {
    ownedMerchants,
    recommendedMerchants,
    claiming,
    claimMerchant,
    refetch,
  } = useUserMerchants();

  // If user has owned merchants and no activeMerchantId is set yet, auto-select first one
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!activeMerchantId && ownedMerchants.length > 0 && !initialMerchantId()) {
        setActiveMerchantId(ownedMerchants[0].id);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [ownedMerchants, activeMerchantId]);

  const handleManualSelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (merchantIdInput.trim()) {
      setActiveMerchantId(merchantIdInput.trim());
    }
  };

  const handleClaimAndSelect = async (mId: string) => {
    const success = await claimMerchant(mId);
    if (success) {
      setActiveMerchantId(mId);
    }
  };

  const activeMerchant = [...ownedMerchants, ...recommendedMerchants].find(
    (m) => m.id === activeMerchantId
  );

  return (
    <main className="advertising-theme min-h-screen bg-[#050a10] bg-[linear-gradient(rgba(34,211,238,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.035)_1px,transparent_1px)] bg-[size:32px_32px] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-cyan-400/20 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:flex sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">
                GETRA for Business
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Advertising Manager
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Kelola campaign, materi promosi, dan target wilayah untuk merchant yang sudah terverifikasi.
            </p>
          </div>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-cyan-400/25 px-4 text-xs font-bold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/10 sm:mt-0"
          >
            ← Kembali ke dashboard
          </Link>
        </header>

        {!activeMerchantId ? (
          <div className="space-y-6">
            {/* Owned Merchants List */}
            {ownedMerchants.length > 0 && (
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
                        <div className="flex items-center justify-between">
                          <strong className="text-sm font-bold text-slate-100 group-hover:text-emerald-300">
                            {m.name}
                          </strong>
                          <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <CheckCircle2 className="size-3" /> Terdaftar
                          </span>
                        </div>
                        {m.address && (
                          <p className="mt-1 text-xs text-slate-400 line-clamp-1">{m.address}</p>
                        )}
                        <p className="mt-2 font-mono text-[10px] text-slate-500">{m.id}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-end text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                        Kelola Iklan <ChevronRight className="size-3 ml-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Claim Recommended Demo Merchants */}
            <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/80 p-5 shadow-xl sm:p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-cyan-400" />
                <h2 className="text-sm font-black uppercase tracking-wider text-cyan-300">
                  Pilih & Klaim Toko Demo (1-Click)
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Pilih salah satu toko contoh berikut untuk langsung menghubungkannya ke akun UMKM Anda:
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recommendedMerchants.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div>
                      <strong className="text-sm font-bold text-slate-100">{m.name}</strong>
                      {m.address && (
                        <p className="mt-1 text-xs text-slate-400 line-clamp-1">{m.address}</p>
                      )}
                      <p className="mt-2 font-mono text-[10px] text-slate-500">{m.id}</p>
                    </div>

                    <button
                      type="button"
                      disabled={claiming}
                      onClick={() => handleClaimAndSelect(m.id)}
                      className="mt-4 flex min-h-9 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-3 text-xs font-black text-slate-950 transition hover:brightness-110 disabled:opacity-50"
                    >
                      {claiming ? "Mengklaim..." : "Pilih & Kelola Toko Ini"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Manual UUID Input */}
            <form
              onSubmit={handleManualSelect}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Opsi Lanjutan
              </p>
              <label htmlFor="merchant-id" className="mt-1 block text-sm font-bold text-slate-200">
                Gunakan UUID Merchant Kustom
              </label>
              <p className="mt-1 text-xs text-slate-400">
                Masukkan ID merchant secara manual jika Anda memiliki merchant khusus.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  id="merchant-id"
                  type="text"
                  value={merchantIdInput}
                  onChange={(e) => setMerchantIdInput(e.target.value)}
                  placeholder="UUID Merchant Anda"
                  className="min-h-11 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 font-mono text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                  required
                />
                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-gradient-to-r from-lime-400 to-cyan-400 px-6 text-sm font-black text-slate-950 transition hover:brightness-110"
                >
                  Gunakan merchant
                </button>
              </div>
            </form>
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
    </main>
  );
}
