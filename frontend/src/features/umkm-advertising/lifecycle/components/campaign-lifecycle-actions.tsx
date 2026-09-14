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
    } catch {
      setActionError("Promosi belum dapat dijeda. Coba lagi.");
    }
  };

  const handleResume = async () => {
    try {
      setActionError(null);
      await onResume();
    } catch {
      setActionError("Promosi belum dapat dilanjutkan. Coba lagi.");
    }
  };

  const handleConfirmCancel = async () => {
    try {
      setActionError(null);
      await onCancel();
      setShowCancelModal(false);
    } catch {
      setActionError("Promosi belum dapat dibatalkan. Coba lagi.");
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
        <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
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
            style={{ color: "#92400e" }}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-amber-100 disabled:opacity-50 sm:flex-none"
          >
            {isUpdating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
            Jeda promosi
          </button>
        )}

        {allowedActions.canResume && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleResume}
            style={{ color: "#065f46" }}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-emerald-100 disabled:opacity-50 sm:flex-none"
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
            style={{ color: "#e11d48" }}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-50 sm:ml-auto sm:flex-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Batalkan promosi
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-3 flex items-start gap-3 text-rose-600">
              <div className="rounded-full bg-rose-100 p-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="break-words text-base font-bold leading-6 text-slate-900">
                Konfirmasi pembatalan promosi
              </h3>
            </div>

            <p className="mb-6 text-xs leading-relaxed text-slate-600">
              Yakin ingin membatalkan promosi ini? Promosi akan langsung berhenti dan tidak dapat diaktifkan kembali.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => setShowCancelModal(false)}
                style={{ color: "#334155" }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold transition-colors hover:bg-slate-50"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleConfirmCancel}
                style={{ color: "#ffffff" }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Ya, batalkan promosi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
