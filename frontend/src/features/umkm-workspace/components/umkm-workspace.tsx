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

export function UmkmWorkspace() {
  const { context, loading: authLoading } = useAuth();
  const { setActiveExperience } = useStakeholder();
  const { summary, loading, error, refresh } = useUmkmWorkspace(context?.user.id ?? null);
  useEffect(() => { setActiveExperience("UMKM"); }, [setActiveExperience]);
  if (authLoading || (!summary && loading)) return <p role="status" className="py-20 text-center text-sm text-slate-300">Memuat usaha Anda...</p>;
  return <div className="mx-auto max-w-6xl space-y-6 py-2 sm:py-4">
    <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
      <Link className="text-xs text-slate-400 hover:text-white" href="/app">Kembali ke peta</Link>
      <button type="button" onClick={refresh} disabled={loading} aria-label="Segarkan data usaha" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 disabled:opacity-60">
        <RefreshCw aria-hidden size={14} className={loading ? "animate-spin" : ""} />Segarkan
      </button>
    </div>
    {error ? <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200"><p>{error}</p><p className="mt-2 text-slate-300">{summary ? "Data sebelumnya masih ditampilkan. " : ""}Gunakan Segarkan untuk mencoba lagi.</p></div> : null}
    {summary ? <UmkmWorkspaceContent summary={summary} /> : null}
  </div>;
}

export function UmkmWorkspaceContent({ summary }: { summary: UmkmWorkspaceSummary }) {
  const state = deriveUmkmWorkspaceState(summary);
  if (state === "NO_MERCHANT" || state === "HAS_DRAFT") return <UmkmEntryState summary={summary} />;
  if (state === "PENDING_VERIFICATION") return <UmkmPendingState summary={summary} />;
  return <UmkmActiveWorkspace summary={summary} state={state} />;
}
