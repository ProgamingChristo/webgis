"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Lock,
  Megaphone,
  SearchCheck,
} from "lucide-react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import { UmkmWorkspaceService } from "../services/umkm-workspace.service";
import { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";
import { OwnedMerchantBrief } from "../types/umkm-workspace.types";
import { UmkmWorkspaceSummaryView } from "./umkm-workspace-summary";
import { OwnedMerchantList } from "./owned-merchant-list";
import { SubmissionSummary } from "./submission-summary";
import { UmkmIntelligenceDashboard } from "@/src/features/umkm-intelligence";

export function UmkmWorkspace() {
  const { context: authContext, loading: authLoading } = useAuth();
  const { setActiveExperience } = useStakeholder();

  const [summary, setSummary] = useState<UmkmWorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set experience mode to UMKM on mount
  useEffect(() => {
    setActiveExperience("UMKM");
  }, [setActiveExperience]);

  const loadWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await UmkmWorkspaceService.getWorkspaceSummary();
      setSummary(data);
    } catch (err: any) {
      console.error("[UmkmWorkspace] Load error:", err);
      setError(err.message || "Gagal memuat data workspace UMKM.");
    } finally {
      setLoading(false);
    }
  }, []);

  const archiveMerchant = useCallback(async (merchant: OwnedMerchantBrief) => {
    await UmkmWorkspaceService.archiveOwnedMerchant(merchant.id);
    setSummary((current) => {
      if (!current) return current;
      const ownedMerchants = current.owned_merchants.filter(({ id }) => id !== merchant.id);
      return {
        ...current,
        verified_merchants_count: ownedMerchants.length,
        owned_merchants: ownedMerchants,
      };
    });
  }, []);

  useEffect(() => {
    if (authLoading || !authContext) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authContext, authLoading, loadWorkspace]);

  if (authLoading || (loading && !summary)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-300 font-medium">Memuat Workspace UMKM...</p>
      </div>
    );
  }

  if (error && !summary) {
    const displayError =
      error;

    return (
      <div className="max-w-4xl mx-auto p-6 py-12">
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 backdrop-blur text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-3">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-base font-semibold text-white">Tidak Dapat Mengakses Workspace</h2>
          <p className="text-xs text-slate-400 mt-1 mb-5">{displayError}</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/app"
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              Kembali ke Beranda
            </Link>
            <button
              onClick={loadWorkspace}
              type="button"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasVerifiedMerchant = (summary?.owned_merchants.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-7 py-2 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/app"
              className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-200"
            >
              <ArrowLeft className="shrink-0" size={13} />
              <span className="break-words">General WebGIS</span>
            </Link>
            <span aria-hidden className="text-slate-600">/</span>
            <span className="break-words text-xs font-semibold text-emerald-400">Workspace UMKM</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={loadWorkspace}
            type="button"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary */}
      {summary ? <UmkmWorkspaceSummaryView summary={summary} /> : null}

      <UmkmFeatureOverview hasVerifiedMerchant={hasVerifiedMerchant} />

      {summary && hasVerifiedMerchant ? <UmkmIntelligenceDashboard merchants={summary.owned_merchants.map((merchant) => ({
        id: merchant.id,
        name: merchant.name,
        category: merchant.category,
      }))} /> : null}

      {/* Main Two Column Layout: Owned Merchants & Submissions */}
      <div className="grid grid-cols-1 gap-7 xl:grid-cols-5">
        {/* Left 2 Cols: Owned Merchants */}
        <div className="scroll-mt-32 space-y-4 xl:col-span-3" id="usaha-saya">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Merchant Saya</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Usaha yang kepemilikannya sudah terverifikasi dan dapat Anda kelola.
              </p>
            </div>
            {(summary?.owned_merchants.length ?? 0) > 0 ? (
              <Link
                href="/umkm/merchants/new"
                className="inline-flex shrink-0 self-start text-xs font-semibold text-emerald-400 transition-colors hover:text-emerald-300 sm:self-auto"
              >
                + Daftarkan / Klaim Usaha Lain
              </Link>
            ) : null}
          </div>

          <OwnedMerchantList
            merchants={summary?.owned_merchants || []}
            onArchiveMerchant={archiveMerchant}
          />
        </div>

        {/* Right Col: Recent Submissions */}
        <div className="min-w-0 space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Status Pengajuan</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pantau proses pendaftaran dan klaim usaha Anda.
              </p>
            </div>
          </div>

          <SubmissionSummary
            submissions={summary?.recent_submissions || []}
            claims={summary?.recent_claims || []}
          />
        </div>
      </div>
    </div>
  );
}

function UmkmFeatureOverview({ hasVerifiedMerchant }: { hasVerifiedMerchant: boolean }) {
  const features = [
    {
      title: "Profil & Discoverability",
      description: "Lengkapi data usaha, foto, produk atau layanan, jam operasional, dan kesiapan ditemukan komuter.",
      icon: SearchCheck,
      href: null,
    },
    {
      title: "Spatial Intelligence / AI Copilot",
      description: "Baca konteks demand sekitar, kompetisi, dan insight lokasi yang sudah dihitung GETRA.",
      icon: Bot,
      href: null,
    },
    {
      title: "Advertising & Promosi",
      description: "Kelola Sponsored Pin, promo card kontekstual, creative, schedule, dan analytics campaign.",
      icon: Megaphone,
      href: "/umkm/advertising",
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">Fitur UMKM</h2>
        <p className="mt-0.5 text-xs text-slate-400">
          Modul bisnis aktif setelah kepemilikan usaha terverifikasi.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          const locked = !hasVerifiedMerchant;

          return (
            <article
              className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/45 p-4 sm:p-5"
              key={feature.title}
            >
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-950 text-cyan-200">
                  <Icon size={19} />
                </span>
                {locked ? (
                  <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                    <Lock className="mr-1.5" size={11} />
                    Menunggu Verifikasi
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-950/35 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                    Aktif
                  </span>
                )}
              </div>

              <h3 className="mt-4 break-words text-sm font-bold leading-5 text-white">{feature.title}</h3>
              <p className="mt-2 break-words text-xs leading-5 text-slate-400">
                {locked
                  ? "Fitur bisnis tersedia setelah kepemilikan usaha diverifikasi."
                  : feature.description}
              </p>

              {!locked && feature.href ? (
                <Link
                  className="mt-4 inline-flex text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                  href={feature.href}
                >
                  Buka Modul
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
