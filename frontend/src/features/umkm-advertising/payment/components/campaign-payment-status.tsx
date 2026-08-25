import React from "react";
import { PaymentStatus } from "../types/payment.types";
import { CheckCircle2, Clock, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

export function CampaignPaymentStatusBadge({
  status,
  size = "md",
}: {
  status: PaymentStatus;
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";

  switch (status) {
    case "PAID":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
          }`}
        >
          <CheckCircle2 className={isSm ? "w-3 h-3 text-emerald-400" : "w-3.5 h-3.5 text-emerald-400"} />
          <span>Terverifikasi (PAID)</span>
        </span>
      );

    case "PENDING":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
          }`}
        >
          <Clock className={isSm ? "w-3 h-3 text-amber-400" : "w-3.5 h-3.5 text-amber-400"} />
          <span>Menunggu Pembayaran</span>
        </span>
      );

    case "UNPAID":
    case "CREATED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-700/40 border border-slate-600 text-slate-300 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
          }`}
        >
          <AlertTriangle className={isSm ? "w-3 h-3 text-slate-400" : "w-3.5 h-3.5 text-slate-400"} />
          <span>Belum Dibayar</span>
        </span>
      );

    case "FAILED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-red-500/10 border border-red-500/30 text-red-300 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
          }`}
        >
          <XCircle className={isSm ? "w-3 h-3 text-red-400" : "w-3.5 h-3.5 text-red-400"} />
          <span>Gagal</span>
        </span>
      );

    case "EXPIRED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-800 border border-slate-700 text-slate-400 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
          }`}
        >
          <Clock className={isSm ? "w-3 h-3 text-slate-400" : "w-3.5 h-3.5 text-slate-400"} />
          <span>Kedaluwarsa</span>
        </span>
      );

    case "CANCELLED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-800 border border-slate-700 text-slate-400 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
          }`}
        >
          <XCircle className={isSm ? "w-3 h-3 text-slate-400" : "w-3.5 h-3.5 text-slate-400"} />
          <span>Dibatalkan</span>
        </span>
      );

    case "REFUNDED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
          }`}
        >
          <RefreshCw className={isSm ? "w-3 h-3 text-purple-400" : "w-3.5 h-3.5 text-purple-400"} />
          <span>Dikembalikan (Refund)</span>
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs text-slate-400 bg-slate-800 rounded">
          {status}
        </span>
      );
  }
}
