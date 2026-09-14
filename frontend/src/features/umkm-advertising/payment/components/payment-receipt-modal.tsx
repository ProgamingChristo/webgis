"use client";

import React from "react";
import { GetraPaymentReceiptDTO } from "../types/payment.types";
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  AlertTriangle,
  Download,
} from "lucide-react";

interface PaymentReceiptModalProps {
  receipt: GetraPaymentReceiptDTO;
  onClose: () => void;
}

export function PaymentReceiptModal({ receipt, onClose }: PaymentReceiptModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = (isoString?: string | null) => {
    if (!isoString) return "-";
    try {
      return new Date(isoString).toLocaleString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 print:bg-white print:p-0 print:fixed print:inset-0">
      <div className="relative w-full max-w-xl max-h-[95vh] overflow-y-auto rounded-2xl border border-slate-700 bg-[#0b101b] text-slate-100 shadow-2xl shadow-purple-950/60 print:max-w-none print:border-none print:bg-white print:text-black print:shadow-none print:p-8">
        {/* Screen Header (Hidden on Print) */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-wide text-slate-100 uppercase">
              Bukti Pembayaran GETRA
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-900/50 transition"
              title="Cetak atau simpan sebagai PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div className="p-5 sm:p-6 space-y-6 print:space-y-4">
          {/* Top Brand & Sandbox Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 print:border-black">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white print:text-black">
                  GETRA
                </span>
                <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 print:text-black print:border-black">
                  SANDBOX / TEST PAYMENT
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                Sistem Periklanan & Promosi UMKM Terverifikasi
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-mono text-slate-400 print:text-slate-600 block uppercase">
                Nomor Bukti
              </span>
              <span className="text-xs font-mono font-bold text-purple-300 print:text-black">
                {receipt.invoice_number}
              </span>
            </div>
          </div>

          {/* Success Status Callout */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 print:border-green-700 print:bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 print:text-green-700" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-300 print:text-green-800">
                PEMBAYARAN SANDBOX TERVERIFIKASI (LUNAS)
              </p>
              <p className="text-[11px] text-emerald-400/80 print:text-green-700">
                Transaksi telah divalidasi oleh sistem Midtrans Sandbox dan promosi telah aktif.
              </p>
            </div>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs print:border-slate-300 print:bg-slate-50">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-purple-400" />
                Nama Merchant / Usaha
              </span>
              <p className="font-semibold text-slate-200 print:text-black">{receipt.merchant_name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                Paket Promosi
              </span>
              <p className="font-semibold text-slate-200 print:text-black">{receipt.campaign_name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                Order ID GETRA
              </span>
              <p className="font-mono text-slate-200 print:text-black break-all">{receipt.order_id}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-cyan-400" />
                ID Transaksi Midtrans
              </span>
              <p className="font-mono text-slate-200 print:text-black break-all">{receipt.transaction_id || "-"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                Metode Pembayaran
              </span>
              <p className="font-semibold text-slate-200 print:text-black uppercase">
                {receipt.payment_type}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 print:text-slate-600 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Waktu Transaksi / Lunas
              </span>
              <p className="text-slate-200 print:text-black">{formattedDate(receipt.paid_at || receipt.created_at)}</p>
            </div>
          </div>

          {/* Amount Box */}
          <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 print:border-slate-400 print:bg-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-300 print:text-black">
                Total Pembayaran (Sandbox)
              </p>
              <p className="text-[10px] text-slate-400 print:text-slate-600">
                Gateway: {receipt.provider}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-emerald-400 print:text-black">
                Rp {receipt.amount.toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] font-mono text-emerald-300/80 print:text-slate-600 uppercase">
                {receipt.currency} - LUNAS
              </p>
            </div>
          </div>

          {/* Sandbox Legal Disclaimer */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-[11px] text-amber-300/90 print:border-amber-700 print:bg-amber-50 print:text-black">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 print:text-amber-800" />
              <p className="leading-relaxed">
                <strong>PEMBERITAHUAN RESMI:</strong> {receipt.disclaimer}. Transaksi ini merupakan simulasi pengujian teknis gateway pembayaran Midtrans Sandbox pada sistem GETRA. Tidak ada penarikan dana riil dari rekening bank ataupun kartu kredit pengguna.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden on Print) */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-950 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Unduh / Cetak Bukti</span>
          </button>
        </div>
      </div>
    </div>
  );
}
