"use client";

import React, { useState, useEffect } from "react";
import { PaymentService } from "../services/payment.service";
import { CreateCheckoutDTO, PaymentStatusDTO } from "../types/payment.types";
import { SandboxPaymentBadge } from "./sandbox-payment-badge";
import { CampaignPaymentStatusBadge } from "./campaign-payment-status";
import { loadMidtransSnap } from "../utils/load-midtrans-snap";
import {
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  QrCode,
  Building2,
  X,
  ShieldCheck,
} from "lucide-react";

export function CampaignPaymentPanel({
  campaignId,
  campaignName,
  onPaymentUpdated,
}: {
  campaignId: string;
  campaignName: string;
  onPaymentUpdated?: () => void;
}) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentStatusDTO | null>(null);
  const [activeCheckout, setActiveCheckout] = useState<CreateCheckoutDTO | null>(null);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"qris" | "va" | "cc">("qris");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    PaymentService.getPaymentStatus(campaignId)
      .then((data) => {
        if (isMounted) {
          setPaymentInfo(data);
          setIsLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error("[CampaignPaymentPanel] Failed to load payment status:", err);
          setErrorMessage(err.message || "Gagal memuat informasi pembayaran.");
          setIsLoading(false);
        }
      });

    loadMidtransSnap().catch((err) => {
      console.warn("[CampaignPaymentPanel] Preload Snap script failed:", err);
    });

    return () => {
      isMounted = false;
    };
  }, [campaignId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setNoticeMessage(null);
    setErrorMessage(null);
    try {
      const refreshed = await PaymentService.refreshPaymentStatus(campaignId);
      setPaymentInfo(refreshed);
      if (refreshed.status === "PAID") {
        setNoticeMessage("Pembayaran Sandbox terverifikasi secara real-time dari Midtrans!");
        if (onPaymentUpdated) onPaymentUpdated();
      } else {
        setNoticeMessage(`Status pembayaran saat ini: ${refreshed.status}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memperbarui status dari Midtrans.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePay = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setNoticeMessage("Mempersiapkan sesi transaksi Midtrans Sandbox...");

    try {
      // 1. Request backend to create checkout session
      const checkout = await PaymentService.createCheckout(campaignId);
      setActiveCheckout(checkout);

      // 2. If it's a real token from Midtrans (not a local fallback prefix), try opening real Snap popup
      if (checkout.snap_token && !checkout.snap_token.startsWith("SANDBOX-SNAP-")) {
        try {
          await loadMidtransSnap();
          if (window.snap) {
            setNoticeMessage("Membuka popup resmi Midtrans Snap Sandbox...");
            window.snap.pay(checkout.snap_token, {
              onSuccess: async () => {
                setNoticeMessage("Pembayaran selesai. Memverifikasi status server-side...");
                await handleRefresh();
              },
              onPending: async () => {
                setNoticeMessage("Menunggu penyelesaian transaksi di Midtrans Sandbox...");
                await handleRefresh();
              },
              onError: async (result: any) => {
                console.error("[Snap onError]", result);
                setErrorMessage("Pembayaran gagal atau dibatalkan di gateway Midtrans.");
                await handleRefresh();
              },
              onClose: async () => {
                setNoticeMessage("Jendela pembayaran ditutup.");
                await handleRefresh();
              },
            });
            return;
          }
        } catch (snapErr) {
          console.warn("[Snap JS load/call]", snapErr);
        }
      }

      // 3. Open GETRA's Midtrans Sandbox Simulator Modal
      setShowSimulatorModal(true);
      setNoticeMessage("Jendela popup Midtrans Sandbox aktif.");
    } catch (err: any) {
      console.error("[CampaignPaymentPanel] Checkout error:", err);
      setErrorMessage(err.message || "Gagal membuka sesi pembayaran Midtrans.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateSettlement = async () => {
    setIsProcessing(true);
    setShowSimulatorModal(false);
    setNoticeMessage("Menyelesaikan transaksi Sandbox dan memverifikasi status...");
    try {
      const refreshed = await PaymentService.refreshPaymentStatus(campaignId);
      setPaymentInfo(refreshed);
      setNoticeMessage("✅ Transaksi Midtrans Sandbox Berhasil! Status campaign kini AKTIF.");
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (err: any) {
      console.error("[handleSimulateSettlement error]", err);
      setErrorMessage(err.message || "Gagal memverifikasi status simulasi.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-purple-400" />
        Memuat status pembayaran...
      </div>
    );
  }

  const isPaid = paymentInfo?.status === "PAID";
  const displayAmount = paymentInfo?.amount || 50000;
  const currentOrderId = paymentInfo?.order_id || activeCheckout?.order_id || "GETRA-AD-SANDBOX";

  return (
    <div className="min-w-0 space-y-4 rounded-xl border border-slate-700 bg-slate-950/80 p-4 shadow-xl sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex min-w-0 items-start gap-2">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
          <h4 className="min-w-0 break-words text-sm font-bold leading-5 text-slate-100">
            Pembayaran Campaign: {campaignName}
          </h4>
        </div>
        <SandboxPaymentBadge />
      </div>

      {/* Notice & Error Alerts */}
      {noticeMessage && (
        <div className="flex items-center gap-2 p-3 text-xs bg-purple-950/40 border border-purple-800/60 text-purple-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs bg-red-950/40 border border-red-800/60 text-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Payment Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Status Pembayaran</span>
          <CampaignPaymentStatusBadge status={paymentInfo?.status || "UNPAID"} />
        </div>

        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Nominal Promosi (Sandbox)</span>
          <div className="text-base font-bold text-slate-100">
            Rp {displayAmount.toLocaleString("id-ID")}
          </div>
          <span className="text-[10px] text-slate-500">Uji Coba Teknis</span>
        </div>

        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Order ID GETRA</span>
          <div className="break-all text-xs font-mono leading-5 text-slate-300" title={paymentInfo?.order_id || "-"}>
            {paymentInfo?.order_id || "Belum Dibuat"}
          </div>
          {paymentInfo?.paid_at && (
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              Lunas: {new Date(paymentInfo.paid_at).toLocaleString("id-ID")}
            </span>
          )}
        </div>
      </div>

      {/* Sandbox Disclaimer Box */}
      <div className="flex items-start gap-2.5 p-3.5 bg-amber-950/20 border border-amber-900/40 rounded-lg text-xs text-amber-300/90">
        <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-200">Simulasi Pembayaran Midtrans Sandbox</p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            Pembayaran ini menggunakan gateway <strong>Midtrans Sandbox</strong>. Gunakan nomor kartu tes simulator resmi Midtrans untuk menyelesaikan pembayaran tanpa memotong biaya riil.
          </p>
        </div>
      </div>

      {/* Action CTA Buttons */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {!isPaid ? (
            <button
              type="button"
              onClick={handlePay}
              disabled={isProcessing}
              className="inline-flex min-h-10 items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-purple-900/40 transition"
            >
              <CreditCard className="w-4 h-4" />
              {isProcessing ? "Menghubungkan Midtrans..." : "Bayar dengan Midtrans (Sandbox)"}
            </button>
          ) : (
            <div className="inline-flex min-h-10 items-center justify-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Pembayaran Sandbox Terverifikasi
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-400" : ""}`} />
            {isRefreshing ? "Memverifikasi..." : "Cek Status"}
          </button>
        </div>

        <a
          href="https://docs.midtrans.com/reference/testing-payments-in-sandbox"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 self-start break-words text-[11px] leading-5 text-slate-400 transition hover:text-purple-300 sm:self-auto"
        >
          <span>Panduan Kartu Tes Sandbox</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* MIDTRANS SANDBOX PAYMENT POPUP MODAL */}
      {showSimulatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-slate-700 bg-[#0c121e] p-4 text-slate-100 shadow-2xl shadow-purple-950/50 sm:p-6">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px] font-black uppercase tracking-wider text-purple-300">
                  MIDTRANS SANDBOX POPUP
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulatorModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Order Brief */}
            <div className="flex flex-col gap-3 rounded-xl border border-purple-500/20 bg-purple-950/30 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-purple-300 uppercase">Order ID</p>
                <p className="break-all text-xs font-mono font-bold leading-5 text-slate-200">{currentOrderId}</p>
                <p className="mt-1 break-words text-xs leading-5 text-slate-400">{campaignName}</p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-[10px] font-mono text-purple-300 uppercase">Total Tagihan</p>
                <p className="text-base font-bold text-emerald-400">Rp {displayAmount.toLocaleString("id-ID")}</p>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div>
              <p className="text-xs font-bold text-slate-300 mb-2">Pilih Metode Pembayaran Sandbox:</p>
              <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSelectedMethod("qris")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition ${
                    selectedMethod === "qris"
                      ? "border-purple-400 bg-purple-600/20 text-purple-200 shadow-md shadow-purple-950"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <QrCode className="size-5 text-purple-400" />
                  <span>QRIS / GoPay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("va")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition ${
                    selectedMethod === "va"
                      ? "border-purple-400 bg-purple-600/20 text-purple-200 shadow-md shadow-purple-950"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <Building2 className="size-5 text-indigo-400" />
                  <span>Virtual Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("cc")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition ${
                    selectedMethod === "cc"
                      ? "border-purple-400 bg-purple-600/20 text-purple-200 shadow-md shadow-purple-950"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <CreditCard className="size-5 text-cyan-400" />
                  <span>Kartu Kredit</span>
                </button>
              </div>
            </div>

            {/* Method Details Box */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              {selectedMethod === "qris" && (
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-3 bg-white rounded-xl shadow-inner inline-block">
                    <div className="size-28 border-2 border-slate-900 flex items-center justify-center bg-slate-50 text-slate-900 font-mono text-[9px] font-bold">
                      [QRIS SANDBOX]
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">Scan QR Code via GoPay / BCA / Livin (Sandbox)</p>
                  <p className="text-[11px] text-slate-500">NMID: ID1020000000000 | Midtrans Merchant</p>
                </div>
              )}

              {selectedMethod === "va" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Bank Transfer</span>
                    <span className="font-bold text-slate-200">BCA Virtual Account</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center font-mono">
                    <span className="text-sm font-bold text-indigo-300">8801 2345 6789 0001</span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">Salin VA</span>
                  </div>
                  <p className="text-[11px] text-slate-400">ATM / Mobile Banking simulator siap menerima pembayaran uji.</p>
                </div>
              )}

              {selectedMethod === "cc" && (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400">Nomor Kartu Uji Midtrans</label>
                    <input
                      readOnly
                      value="4811 1111 1111 1114"
                      className="w-full mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-cyan-300"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Masa Berlaku</label>
                      <input
                        readOnly
                        value="12/28"
                        className="w-full mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">CVV / 3DS OTP</label>
                      <input
                        readOnly
                        value="123 (OTP: 112233)"
                        className="w-full mt-1 p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-xs text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={handleSimulateSettlement}
                disabled={isProcessing}
                className="flex min-h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition active:scale-[0.99]"
              >
                <ShieldCheck className="size-4" />
                {isProcessing ? "Memproses..." : "Selesaikan Pembayaran (Sandbox)"}
              </button>
              <button
                type="button"
                onClick={() => setShowSimulatorModal(false)}
                className="min-h-10 whitespace-nowrap py-2.5 px-4 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 text-xs font-semibold transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
