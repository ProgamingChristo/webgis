"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import { UmkmWorkspaceService } from "../services/umkm-workspace.service";
import { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";
import { UmkmWorkspaceSummaryView } from "./umkm-workspace-summary";
import { OwnedMerchantList } from "./owned-merchant-list";
import { SubmissionSummary } from "./submission-summary";
import { UmkmQuickActions } from "./umkm-quick-actions";
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={13} />
              General WebGIS
            </Link>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold text-emerald-400">Workspace UMKM</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Pusat Manajemen & Aktivasi UMKM
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Kelola identitas usaha, pengajuan katalog, kampanye promosi transit, dan analitik performa.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={loadWorkspace}
            type="button"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
            title="Muat ulang data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
          <Link
            href="/umkm/merchants/new"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition-colors"
          >
            <Plus size={15} />
            Tambah UMKM
          </Link>
        </div>
      </div>

      {/* Metrics Summary */}
      {summary ? <UmkmWorkspaceSummaryView summary={summary} /> : null}

      {summary ? <UmkmIntelligenceDashboard merchants={summary.owned_merchants.map((merchant) => ({
        id: merchant.id,
        name: merchant.name,
        category: merchant.category,
      }))} /> : null}

      {/* Quick Action Navigation Cards */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3.5">Menu & Layanan Utama</h3>
        <UmkmQuickActions />
      </div>

      {/* Main Two Column Layout: Owned Merchants & Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Owned Merchants */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Merchant Saya</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Usaha terverifikasi yang Anda kelola pada platform GETRA.
              </p>
            </div>
            <Link
              href="/umkm/merchants/new"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              + Tambah Usaha
            </Link>
          </div>

          <OwnedMerchantList merchants={summary?.owned_merchants || []} />
        </div>

        {/* Right Col: Recent Submissions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Status Pengajuan</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Daftar pengajuan merchant baru Anda.
              </p>
            </div>
          </div>

          <SubmissionSummary submissions={summary?.recent_submissions || []} />
        </div>
      </div>
    </div>
  );
}
