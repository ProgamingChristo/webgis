"use client";

import React, { useState } from "react";
import { CampaignAllowedActions, CampaignLifecycleStatus } from "../types/lifecycle.types";
import { 
  Pause, 
  Play, 
  Trash2, 
  AlertTriangle, 
  Loader2 
} from "lucide-react";

interface CampaignLifecycleActionsProps {
  status: CampaignLifecycleStatus;
  allowedActions: CampaignAllowedActions;
  isUpdating: boolean;
  onPause: () => Promise<any>;
  onResume: () => Promise<any>;
  onCancel: () => Promise<any>;
  className?: string;
}

export function CampaignLifecycleActions({
  status,
  allowedActions,
  isUpdating,
  onPause,
  onResume,
  onCancel,
  className = "",
}: CampaignLifecycleActionsProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handlePause = async () => {
    try {
      setActionError(null);
      await onPause();
    } catch (err: any) {
      setActionError(err?.message || "Gagal pause campaign.");
    }
  };

  const handleResume = async () => {
    try {
      setActionError(null);
      await onResume();
    } catch (err: any) {
      setActionError(err?.message || "Gagal resume campaign.");
    }
  };

  const handleConfirmCancel = async () => {
    try {
      setActionError(null);
      await onCancel();
      setShowCancelModal(false);
    } catch (err: any) {
      setActionError(err?.message || "Gagal membatalkan campaign.");
    }
  };

  const hasAnyAction =
    allowedActions.canPause ||
    allowedActions.canResume ||
    allowedActions.canCancel;

  if (!hasAnyAction) {
    return null;
  }

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-campaign-status={status}
    >
      {actionError && (
        <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
        {allowedActions.canPause && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={handlePause}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/60 disabled:opacity-50 transition-colors shadow-sm sm:flex-none"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
            Jeda Campaign
          </button>
        )}

        {allowedActions.canResume && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleResume}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 disabled:opacity-50 transition-colors shadow-sm sm:flex-none"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Lanjutkan Tayang
          </button>
        )}

        {allowedActions.canCancel && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => setShowCancelModal(true)}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/40 disabled:opacity-50 transition-colors shadow-sm sm:ml-auto sm:flex-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Batalkan Campaign
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-3 flex items-start gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="break-words text-base font-bold leading-6 text-slate-900 dark:text-white">
                Konfirmasi Pembatalan Campaign
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Apakah Anda yakin ingin membatalkan campaign ini? Campaign yang dibatalkan akan langsung berhenti tayang dan tidak dapat diaktifkan kembali.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleConfirmCancel}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, Batalkan Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
