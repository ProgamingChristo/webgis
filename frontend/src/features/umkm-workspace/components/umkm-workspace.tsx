"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import { useStakeholder } from "@/src/components/providers/StakeholderProvider";
import { useUmkmWorkspace } from "../hooks/use-umkm-workspace";
import { deriveUmkmWorkspaceState } from "../model/umkm-workspace-state";
import type { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";
import { UmkmEntryState } from "./umkm-entry-state";
import { UmkmPendingState } from "./umkm-pending-state";
import { UmkmActiveWorkspace } from "./umkm-active-workspace";

const DEFAULT_EMPTY_SUMMARY: UmkmWorkspaceSummary = {
  verified_merchants_count: 0,
  pending_submissions_count: 0,
  active_campaigns_count: 0,
  owned_merchants: [],
  recent_submissions: [],
  recent_claims: [],
};

export function UmkmWorkspace() {
  const { context, loading: authLoading } = useAuth();
  const { setActiveExperience } = useStakeholder();
  const { summary, loading, error, refresh } = useUmkmWorkspace(context?.user.id ?? null);

  useEffect(() => {
    setActiveExperience("UMKM");
  }, [setActiveExperience]);

  if (authLoading || (!summary && loading)) {
    return (
      <div role="status" aria-label="Memuat usaha Anda" className="mx-auto max-w-xl py-16 px-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 mb-4 animate-pulse">
          <RefreshCw size={24} className="animate-spin text-sky-600" />
        </div>
        <p className="text-sm font-medium text-slate-700">Memuat usaha Anda...</p>
        <p className="mt-1 text-xs text-slate-500">Menghubungkan ke ruang kelola GETRA UMKM</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2 sm:py-4">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <Link className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors" href="/app">
          ← Kembali ke peta
        </Link>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          aria-label="Segarkan data usaha"
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw aria-hidden size={13} className={loading ? "animate-spin text-sky-600" : "text-slate-500"} />
          Segarkan
        </button>
      </div>
      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-sm">
          <p className="font-semibold">{error}</p>
          <p className="mt-1 text-xs text-rose-700">{summary ? "Data sebelumnya masih ditampilkan. " : ""}Silakan klik Segarkan untuk mencoba lagi.</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition-colors"
          >
            <RefreshCw size={12} />
            Coba Lagi
          </button>
        </div>
      ) : null}
      {summary ? (
        <UmkmWorkspaceContent summary={summary} />
      ) : !loading && !error ? (
        <UmkmWorkspaceContent summary={DEFAULT_EMPTY_SUMMARY} />
      ) : null}
    </div>
  );
}

export function UmkmWorkspaceContent({ summary }: { summary: UmkmWorkspaceSummary }) {
  const state = deriveUmkmWorkspaceState(summary);
  if (state === "NO_MERCHANT" || state === "HAS_DRAFT") return <UmkmEntryState summary={summary} />;
  if (state === "PENDING_VERIFICATION") return <UmkmPendingState summary={summary} />;
  return <UmkmActiveWorkspace summary={summary} state={state} />;
}
