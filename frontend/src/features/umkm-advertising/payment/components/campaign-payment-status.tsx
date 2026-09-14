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
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 font-medium text-emerald-800 ${
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
          className={`inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 font-medium text-amber-800 ${
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
          className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white font-medium text-slate-700 ${
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
          className={`inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 font-medium text-red-700 ${
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
          className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 font-medium text-slate-600 ${
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
          className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 font-medium text-slate-600 ${
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
          className={`inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 font-medium text-sky-700 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
          }`}
        >
          <RefreshCw className={isSm ? "w-3 h-3 text-cyan-600" : "w-3.5 h-3.5 text-cyan-600"} />
          <span>Dikembalikan (Refund)</span>
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {status}
        </span>
      );
  }
}
