"use client";

import React from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { SubmissionBrief } from "../types/umkm-workspace.types";

interface SubmissionSummaryProps {
  submissions: SubmissionBrief[];
}

export function SubmissionSummary({ submissions }: SubmissionSummaryProps) {
  if (submissions.length === 0) {
    return (
      <div className="p-5 rounded-xl border border-slate-700/60 bg-slate-800/30 text-center py-6">
        <p className="text-xs text-slate-400">Tidak ada pengajuan merchant dalam proses.</p>
      </div>
    );
  }

  const getStatusBadge = (status: SubmissionBrief["status"]) => {
    switch (status) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-700/80 border border-slate-600 text-slate-300">
            <FileText size={10} />
            Draft
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/80 border border-amber-500/30 text-amber-300">
            <Clock size={10} />
            Menunggu Review
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
            <CheckCircle size={10} />
            Disetujui
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-950/80 border border-rose-500/30 text-rose-300">
            <XCircle size={10} />
            Ditolak
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-400">
            <AlertCircle size={10} />
            Dibatalkan
          </span>
        );
    }
  };

  return (
    <div className="divide-y divide-slate-700/50 rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
      {submissions.map((sub) => (
        <div key={sub.id} className="p-3.5 hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-semibold text-white truncate">{sub.name}</h5>
              {getStatusBadge(sub.status)}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {sub.category} • {sub.address || "Lokasi tersimpan"}
            </p>
          </div>
          <Link
            href={`/umkm/submissions/${sub.id}`}
            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium shrink-0 ml-2"
          >
            {sub.status === "DRAFT" ? "Lanjutkan Draft" : "Lihat Detail"}
            <ArrowRight size={12} />
          </Link>
        </div>
      ))}
    </div>
  );
}
