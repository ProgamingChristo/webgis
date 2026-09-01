"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  ArrowLeft,
  Edit,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Megaphone,
} from "lucide-react";
import { MerchantSubmissionRecord } from "../types/merchant-submission.types";
import { MerchantSubmissionService } from "../services/merchant-submission.service";
import { MerchantSubmissionStatusBadge } from "./merchant-submission-status-badge";

interface SubmissionDetailProps {
  submissionId: string;
}

export function MerchantSubmissionDetail({ submissionId }: SubmissionDetailProps) {
  const [submission, setSubmission] = useState<MerchantSubmissionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await MerchantSubmissionService.getSubmission(submissionId);
        setSubmission(data);
      } catch (err: any) {
        console.error("[MerchantSubmissionDetail] Load error:", err);
        setError(err.message || "Gagal memuat detail pengajuan.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [submissionId]);

  const handleCancel = async () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan ini?")) return;

    try {
      setCancelling(true);
      const updated = await MerchantSubmissionService.cancelSubmission(submissionId);
      setSubmission(updated);
    } catch (err: any) {
      console.error("[MerchantSubmissionDetail] Cancel error:", err);
      setError(err.message || "Gagal membatalkan pengajuan.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-400">Memuat detail pengajuan...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-12">
        <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 max-w-md mx-auto">
          <AlertTriangle size={24} className="text-rose-400 mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-white">Gagal Memuat Pengajuan</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">{error || "Data tidak ditemukan."}</p>
          <Link
            href="/umkm"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <ArrowLeft size={13} />
            Kembali ke Workspace
          </Link>
        </div>
      </div>
    );
  }

  const [lng, lat] = submission.location.coordinates;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/umkm"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={13} />
          Kembali ke Workspace UMKM
        </Link>
      </div>

      <div className="min-w-0 space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-8">
        {/* Header with Title & Status */}
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
              <h1 className="min-w-0 break-words text-xl font-bold leading-7 tracking-tight text-white">{submission.name}</h1>
              <MerchantSubmissionStatusBadge status={submission.status} />
            </div>
            <p className="mt-2 break-words text-xs leading-5 text-slate-400">
              Kategori: <strong className="text-slate-200">{submission.category}</strong> • Dibuat: {new Date(submission.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {submission.status === "DRAFT" ? (
              <Link
                href={`/umkm/merchants/new?edit=${submission.id}`}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 sm:flex-none"
              >
                <Edit size={13} />
                Lanjutkan Edit
              </Link>
            ) : null}

            {submission.status === "PENDING_REVIEW" ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-rose-500/20 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-slate-700 disabled:opacity-50 sm:flex-none"
              >
                <XCircle size={13} />
                {cancelling ? "Membatalkan..." : "Batalkan Pengajuan"}
              </button>
            ) : null}

            {submission.status === "APPROVED" && submission.canonical_merchant_id ? (
              <Link
                href={`/umkm/advertising?merchantId=${submission.canonical_merchant_id}`}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-500 sm:flex-none"
              >
                <Megaphone size={14} />
                Pasang Iklan Merchant
              </Link>
            ) : null}
          </div>
        </div>

        {/* Status Callout Banner */}
        {submission.status === "PENDING_REVIEW" ? (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
            <Clock size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-amber-200">Sedang Dalam Tahap Verifikasi</h4>
              <p className="text-xs text-amber-400/90 mt-0.5 leading-relaxed">
                Tim kurasi GETRA sedang meninjau kelayakan data dan koordinat usaha Anda. Anda akan mendapatkan notifikasi setelah review selesai.
              </p>
            </div>
          </div>
        ) : null}

        {submission.status === "APPROVED" ? (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
            <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-emerald-200">Pengajuan Telah Disetujui!</h4>
              <p className="text-xs text-emerald-400/90 mt-0.5 leading-relaxed">
                Merchant Anda kini telah aktif dalam katalog terverifikasi GETRA dan siap dikelola pada menu Merchant Saya.
              </p>
            </div>
          </div>
        ) : null}

        {submission.status === "REJECTED" ? (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
            <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-rose-200">Pengajuan Belum Dapat Disetujui</h4>
              <p className="text-xs text-rose-300 mt-0.5 leading-relaxed">
                Catatan Reviewer: <strong>{submission.review_note || "Data usaha belum memenuhi kriteria kelayakan."}</strong>
              </p>
            </div>
          </div>
        ) : null}

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-400">Alamat Lengkap</span>
            <p className="break-words text-slate-200 font-medium">{submission.address || "Tidak dicantumkan"}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-slate-400">Titik Koordinat PostGIS</span>
            <p className="break-all text-slate-200 font-mono font-medium">
              Lng: {lng.toFixed(6)}, Lat: {lat.toFixed(6)}
            </p>
          </div>

          {submission.description ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 sm:col-span-2">
              <span className="text-slate-400">Deskripsi Usaha</span>
              <p className="break-words text-slate-200 leading-relaxed">{submission.description}</p>
            </div>
          ) : null}

          {submission.image_url ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 sm:col-span-2">
              <span className="text-slate-400">Foto Tempat Usaha</span>
              <div className="relative h-48 rounded-lg overflow-hidden border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={submission.image_url}
                  alt={submission.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
