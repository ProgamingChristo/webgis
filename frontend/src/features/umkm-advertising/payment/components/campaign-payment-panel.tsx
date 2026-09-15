"use client";

import React, { useState, useEffect } from "react";
import { PaymentService } from "../services/payment.service";
import { CreateCheckoutDTO, PaymentStatusDTO, GetraPaymentReceiptDTO } from "../types/payment.types";
import { SandboxPaymentBadge } from "./sandbox-payment-badge";
import { CampaignPaymentStatusBadge } from "./campaign-payment-status";
import { loadMidtransSnap } from "../utils/load-midtrans-snap";
import { PaymentReceiptModal } from "./payment-receipt-modal";
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
  FileText,
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
  const [receiptData, setReceiptData] = useState<GetraPaymentReceiptDTO | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

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

  const handleViewReceipt = async () => {
    setIsLoadingReceipt(true);
    setErrorMessage(null);
    try {
      const data = await PaymentService.getReceipt(campaignId);
      setReceiptData(data);
      setShowReceiptModal(true);
    } catch (err: any) {
      console.error("[CampaignPaymentPanel] Failed to load receipt:", err);
      setErrorMessage(err.message || "Gagal memuat bukti pembayaran.");
    } finally {
      setIsLoadingReceipt(false);
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

      // 2. Preload Snap script
      let snapAvailable = false;
      try {
        await loadMidtransSnap(checkout.client_key);
        snapAvailable = typeof window !== "undefined" && Boolean(window.snap);
      } catch (scriptErr) {
        console.warn("[CampaignPaymentPanel] Snap script load notice:", scriptErr);
      }

      // 3. If upstream Midtrans returned a token and window.snap is available, open official Snap popup
      if (
        checkout.snap_token &&
        !checkout.snap_token.startsWith("SANDBOX-SNAP-") &&
        snapAvailable &&
        window.snap
      ) {
        setNoticeMessage("Membuka jendela pembayaran Midtrans Snap...");
        window.snap.pay(checkout.snap_token, {
          onSuccess: async () => {
            setNoticeMessage("Pembayaran selesai. Sedang memeriksa status terbaru...");
            await handleRefresh();
          },
          onPending: async () => {
            setNoticeMessage("Menunggu penyelesaian pembayaran di gateway...");
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

      // 4. Open GETRA's Midtrans Sandbox Popup Modal
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
      const orderId = activeCheckout?.order_id || currentOrderId;
      const grossAmount = (paymentInfo?.amount || activeCheckout?.amount || 50000).toString();

      // Trigger authoritative server-side webhook notification
      try {
        await fetch("/api/payments/midtrans/notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            status_code: "200",
            gross_amount: `${grossAmount}.00`,
            signature_key: "SANDBOX_MOCK_SIGNATURE",
            transaction_status: "settlement",
            fraud_status: "accept",
            payment_type:
              selectedMethod === "qris"
                ? "qris"
                : selectedMethod === "va"
                ? "bank_transfer"
                : "credit_card",
            transaction_id: `tx-sandbox-${orderId}`,
          }),
        });
      } catch (hookErr) {
        console.warn("[handleSimulateSettlement] Webhook trigger notice:", hookErr);
      }

      const refreshed = await PaymentService.refreshPaymentStatus(campaignId);
      setPaymentInfo(refreshed);
      setNoticeMessage("Pembayaran Sandbox terverifikasi. Status promosi telah diminta ulang dari server.");
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
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-xs text-slate-600 shadow-sm">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin text-sky-600" />
        Memuat status pembayaran...
      </div>
    );
  }

  const isPaid = paymentInfo?.status === "PAID";
  const displayAmount = paymentInfo?.amount || 50000;
  const currentOrderId = paymentInfo?.order_id || activeCheckout?.order_id || "GETRA-AD-SANDBOX";

  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-2">
          <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
          <h4 className="min-w-0 break-words text-sm font-bold leading-5 text-slate-900">
            Pembayaran promosi: {campaignName}
          </h4>
        </div>
        <SandboxPaymentBadge />
      </div>

      {/* Notice & Error Alerts */}
      {noticeMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-sky-600" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Payment Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="mb-1 block text-[11px] text-slate-500">Status Pembayaran</span>
          <CampaignPaymentStatusBadge status={paymentInfo?.status || "UNPAID"} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="mb-1 block text-[11px] text-slate-500">Nominal Promosi (Sandbox)</span>
          <div className="text-base font-bold text-slate-900">
            {paymentInfo?.amount || activeCheckout?.amount ? `Rp ${displayAmount.toLocaleString("id-ID")}` : "Belum ditentukan"}
          </div>
          <span className="text-[10px] text-slate-500">Uji Coba Teknis</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="mb-1 block text-[11px] text-slate-500">Order ID GETRA</span>
          <div className="break-all font-mono text-xs leading-5 text-slate-700" title={paymentInfo?.order_id || "-"}>
            {paymentInfo?.order_id || "Belum Dibuat"}
          </div>
          {paymentInfo?.paid_at && (
            <span className="mt-0.5 block text-[10px] text-emerald-700">
              Lunas: {new Date(paymentInfo.paid_at).toLocaleString("id-ID")}
            </span>
          )}
        </div>
      </div>

      {/* Sandbox Disclaimer Box */}
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
        <HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">Simulasi Pembayaran Midtrans Sandbox</p>
          <p className="text-[11px] leading-relaxed text-amber-800">
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
              style={{ color: "#ffffff" }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              {isProcessing ? "Menghubungkan Midtrans..." : "Bayar dengan Midtrans (Sandbox)"}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Pembayaran Sandbox Terverifikasi
              </div>
              <button
                type="button"
                onClick={handleViewReceipt}
                disabled={isLoadingReceipt}
                style={{ color: "#ffffff" }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                {isLoadingReceipt ? "Memuat Bukti..." : "Lihat Bukti Pembayaran"}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
            {isRefreshing ? "Memverifikasi..." : "Cek Status"}
          </button>
        </div>

        <a
          href="https://docs.midtrans.com/reference/testing-payments-in-sandbox"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 self-start break-words text-[11px] leading-5 text-slate-500 transition hover:text-sky-700 sm:self-auto"
        >
          <span>Panduan Kartu Tes Sandbox</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* MIDTRANS SANDBOX PAYMENT POPUP MODAL */}
      {showSimulatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl sm:p-6">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px] font-black uppercase tracking-wider text-amber-700">
                  MIDTRANS SANDBOX POPUP
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulatorModal(false)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Order Brief */}
            <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase text-sky-700">Order ID</p>
                <p className="break-all font-mono text-xs font-bold leading-5 text-slate-900">{currentOrderId}</p>
                <p className="mt-1 break-words text-xs leading-5 text-slate-600">{campaignName}</p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-mono text-[10px] uppercase text-sky-700">Total Tagihan</p>
                <p className="text-base font-bold text-emerald-700">Rp {displayAmount.toLocaleString("id-ID")}</p>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div>
              <p className="mb-2 text-xs font-bold text-slate-700">Pilih Metode Pembayaran Sandbox:</p>
              <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setSelectedMethod("qris")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition ${
                    selectedMethod === "qris"
                      ? "border-sky-400 bg-sky-50 text-sky-800 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"
                  }`}
                >
                  <QrCode className="size-5 text-sky-600" />
                  <span>QRIS / GoPay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("va")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition ${
                    selectedMethod === "va"
                      ? "border-sky-400 bg-sky-50 text-sky-800 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"
                  }`}
                >
                  <Building2 className="size-5 text-sky-600" />
                  <span>Virtual Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("cc")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition ${
                    selectedMethod === "cc"
                      ? "border-sky-400 bg-sky-50 text-sky-800 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-sky-300"
                  }`}
                >
                  <CreditCard className="size-5 text-sky-600" />
                  <span>Kartu Kredit</span>
                </button>
              </div>
            </div>

            {/* Method Details Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              {selectedMethod === "qris" && (
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="p-3 bg-white rounded-xl shadow-inner inline-block">
                    <div className="size-28 border-2 border-slate-900 flex items-center justify-center bg-slate-50 text-slate-900 font-mono text-[9px] font-bold">
                      [QRIS SANDBOX]
                    </div>
                  </div>
                  <p className="text-xs font-medium text-slate-700">Pindai kode QR dengan aplikasi pembayaran (mode uji)</p>
                  <p className="text-[11px] text-slate-500">Pembayaran ini hanya untuk simulasi.</p>
                </div>
              )}

              {selectedMethod === "va" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Bank Transfer</span>
                    <span className="font-bold text-slate-800">BCA Virtual Account</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 font-mono">
                    <span className="text-sm font-bold text-sky-700">8801 2345 6789 0001</span>
                    <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] text-sky-700">Salin VA</span>
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
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Masa Berlaku</label>
                      <input
                        readOnly
                        value="12/28"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">CVV / 3DS OTP</label>
                      <input
                        readOnly
                        value="123 (OTP: 112233)"
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800"
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
                style={{ color: "#ffffff" }}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-center text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]"
              >
                <ShieldCheck className="size-4 shrink-0" />
                <span>{isProcessing ? "Memproses..." : "Selesaikan Pembayaran (Sandbox)"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSimulatorModal(false)}
                className="min-h-11 whitespace-nowrap rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GETRA PAYMENT RECEIPT / INVOICE MODAL */}
      {showReceiptModal && receiptData && (
        <PaymentReceiptModal
          receipt={receiptData}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}
