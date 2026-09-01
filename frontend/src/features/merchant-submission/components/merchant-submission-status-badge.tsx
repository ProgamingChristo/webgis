"use client";

import React from "react";
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { MerchantSubmissionStatus } from "../types/merchant-submission.types";

interface StatusBadgeProps {
  status: MerchantSubmissionStatus;
  size?: "sm" | "md";
}

export function MerchantSubmissionStatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const isSm = size === "sm";
  const iconSize = isSm ? 10 : 12;
  const paddingClass = isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  switch (status) {
    case "DRAFT":
      return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium bg-slate-700/80 border border-slate-600 text-slate-300 ${paddingClass}`}>
          <FileText size={iconSize} />
          Draft
        </span>
      );
    case "PENDING_REVIEW":
      return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium bg-amber-950/80 border border-amber-500/30 text-amber-300 ${paddingClass}`}>
          <Clock size={iconSize} />
          Menunggu Review
        </span>
      );
    case "APPROVED":
      return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 ${paddingClass}`}>
          <CheckCircle size={iconSize} />
          Disetujui
        </span>
      );
    case "REJECTED":
      return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium bg-rose-950/80 border border-rose-500/30 text-rose-300 ${paddingClass}`}>
          <XCircle size={iconSize} />
          Ditolak
        </span>
      );
    case "CANCELLED":
      return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium bg-slate-800 border border-slate-700 text-slate-400 ${paddingClass}`}>
          <AlertCircle size={iconSize} />
          Dibatalkan
        </span>
      );
  }
}
