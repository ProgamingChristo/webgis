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
  Store,
  MapPin,
  Calendar,
  CreditCard,
  Phone,
  FileText,
  ShieldCheck,
  Tag,
  Sparkles,
} from "lucide-react";

function InstagramIcon({ size = 12, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
import type { MerchantSubmissionRecord } from "../types/merchant-submission.types";
import { MerchantSubmissionService } from "../services/merchant-submission.service";
import { MerchantSubmissionStatusBadge } from "./merchant-submission-status-badge";
import { PendingLocationPreview } from "@/src/features/umkm-workspace/components/pending-location-preview";
import {
  readSubmissionDescription,
  submissionPriceLabels,
  submissionPaymentLabels,
  submissionDayLabels,
} from "../model/submission-presentation";

interface SubmissionDetailProps {
  submissionId: string;
  initialData?: MerchantSubmissionRecord;
}

const ORDERED_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function MerchantSubmissionDetail({ submissionId, initialData }: SubmissionDetailProps) {
  const [submission, setSubmission] = useState<MerchantSubmissionRecord | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await MerchantSubmissionService.getSubmission(submissionId);
        setSubmission(data);
      } catch (err: unknown) {
        console.error("[MerchantSubmissionDetail] Load error:", err);
        setError("Detail pengajuan belum dapat dimuat. Coba lagi.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [submissionId, initialData]);

  const handleCancel = async () => {
    if (!confirm("Apakah Anda yakin ingin membatalkan pengajuan ini?")) return;

    try {
      setCancelling(true);
      const updated = await MerchantSubmissionService.cancelSubmission(submissionId);
      setSubmission(updated);
    } catch (err: unknown) {
      console.error("[MerchantSubmissionDetail] Cancel error:", err);
      setError("Pengajuan belum dapat dibatalkan. Coba lagi.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-9 h-9 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-500">Memuat detail pengajuan UMKM...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-12">
        <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50/70 max-w-md mx-auto shadow-sm">
          <AlertTriangle size={32} className="text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Pengajuan Belum Dapat Dimuat</h2>
          <p className="text-xs text-slate-600 mt-1.5 mb-5 leading-relaxed">
            {error || "Data pengajuan usaha tidak ditemukan atau Anda tidak memiliki akses."}
          </p>
          <Link
            href="/umkm"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
          >
            <ArrowLeft size={14} />
            Kembali ke Ruang Kelola
          </Link>
        </div>
      </div>
    );
  }

  const [lng, lat] = submission.location.coordinates;
  const parsed = readSubmissionDescription(submission.description);
  const priceKey = submission.business_info?.price_range as keyof typeof submissionPriceLabels | undefined;
  const priceText = priceKey ? submissionPriceLabels[priceKey] : "Standar";
  const payments = Array.isArray(submission.business_info?.payment_methods)
    ? submission.business_info.payment_methods
    : [];
  const facilityList = parsed.facilities
    ? parsed.facilities.split(",").map((f) => f.trim()).filter(Boolean)
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" data-testid="merchant-submission-detail-container">
      {/* Top Navigation */}
      <div>
        <Link
          href="/umkm"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-sky-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Kembali ke Ruang Kelola UMKM
        </Link>
      </div>

      {/* Main Container */}
      <div className="min-w-0 space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        {/* A. Submission Header */}
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-sky-700">
                <Store size={13} className="text-sky-600" />
                Pendaftaran Usaha
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-[11px] text-slate-500">ID: {submission.id.slice(0, 8)}</span>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-2.5 sm:flex-row sm:items-center">
              <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-slate-950">
                {submission.name}
              </h1>
              <MerchantSubmissionStatusBadge status={submission.status} />
            </div>
            <p className="text-xs text-slate-500">
              Kategori: <strong className="font-semibold text-slate-800">{submission.category}</strong>
              {" • "}Diajukan pada:{" "}
              {new Date(submission.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {submission.status === "DRAFT" ? (
              <Link
                href={`/umkm/merchants/new?edit=${submission.id}`}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 sm:flex-none"
              >
                <Edit size={14} />
                Lanjutkan Edit
              </Link>
            ) : null}

            {submission.status === "PENDING_REVIEW" ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 sm:flex-none"
              >
                <XCircle size={14} />
                {cancelling ? "Membatalkan..." : "Batalkan Pengajuan"}
              </button>
            ) : null}

            {submission.status === "APPROVED" && submission.canonical_merchant_id ? (
              <Link
                href={`/umkm?merchantId=${submission.canonical_merchant_id}#promosi`}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 sm:flex-none"
              >
                <Megaphone size={14} />
                Periksa Kesiapan Promosi
              </Link>
            ) : null}
          </div>
        </div>

        {/* Status Callout Banner */}
        {submission.status === "PENDING_REVIEW" ? (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3.5">
            <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-950">Sedang Dalam Tahap Verifikasi & Kurasi</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Pengajuan usaha Anda telah berhasil dikirim ke tim admin GETRA. Tim kami sedang meninjau kelayakan lokasi, profil usaha, dan kelengkapan data sebelum dipublikasikan ke peta commuter.
              </p>
            </div>
          </div>
        ) : null}

        {submission.status === "APPROVED" ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3.5">
            <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-emerald-950">Pengajuan Telah Disetujui!</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Usaha Anda telah resmi terverifikasi dan kini aktif di GETRA. Usaha Anda dapat ditemukan oleh commuter dan siap untuk kampanye promosi.
              </p>
            </div>
          </div>
        ) : null}

        {submission.status === "REJECTED" ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3.5">
            <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-950">Pengajuan Belum Disetujui</h4>
              <p className="text-xs text-rose-800 leading-relaxed">
                Catatan Reviewer: <strong>{submission.review_note || "Data usaha belum memenuhi kriteria verifikasi."}</strong>
              </p>
            </div>
          </div>
        ) : null}

        {/* Structured Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* B. Business Information Card */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <Store size={16} className="text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">Informasi Usaha</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Nama Usaha</span>
                <p className="mt-0.5 font-semibold text-slate-900">{submission.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 font-medium">Kategori</span>
                  <p className="mt-0.5 font-semibold text-slate-900">{submission.category}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Jenis Usaha</span>
                  <p className="mt-0.5 font-semibold text-slate-900">{parsed.businessType || "Permanen"}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Menu Andalan</span>
                <p className="mt-0.5 font-semibold text-sky-800 bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-100 inline-block">
                  {parsed.featuredMenu || "Tidak dicantumkan"}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Kisaran Harga</span>
                <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-slate-900">
                  <Tag size={13} className="text-slate-400" />
                  <span>{priceText}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Deskripsi Usaha</span>
                <p className="mt-1 leading-relaxed text-slate-700 bg-white p-3 rounded-xl border border-slate-200/80">
                  {parsed.description || "Tidak ada deskripsi tambahan."}
                </p>
              </div>
            </div>
          </section>

          {/* C. Location & Coordinates Card */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <MapPin size={16} className="text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">Lokasi & Titik Koordinat</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Alamat Lengkap</span>
                <p className="mt-0.5 font-semibold text-slate-900 leading-relaxed">
                  {submission.address || "Alamat tidak dicantumkan"}
                </p>
              </div>

              <div>
                <PendingLocationPreview coordinates={[lng, lat]} merchantName={submission.name} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Status Lokasi</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Titik Pin Terkonfirmasi
                </span>
              </div>
            </div>
          </section>

          {/* D. Operating Information & Facilities */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <Calendar size={16} className="text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">Jam Operasional & Fasilitas</h2>
            </div>

            <div className="space-y-4 text-xs">
              {/* Operating Hours Table */}
              <div>
                <span className="text-slate-500 font-medium block mb-1.5">Jadwal Operasional</span>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {ORDERED_DAYS.map((day) => {
                    const dayHours = submission.opening_hours?.[day];
                    const isClosed = !dayHours || dayHours.is_closed;
                    const label = submissionDayLabels[day] || day;
                    return (
                      <div
                        key={day}
                        className="rounded-lg border border-slate-200/80 bg-white p-2 text-center"
                      >
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">{label}</span>
                        <span className={`text-[11px] font-semibold mt-0.5 block ${isClosed ? "text-slate-400" : "text-sky-800"}`}>
                          {isClosed ? "Tutup" : `${dayHours.opens_at ?? ""} - ${dayHours.closes_at ?? ""}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <span className="text-slate-500 font-medium block mb-1.5">Metode Pembayaran</span>
                <div className="flex flex-wrap gap-1.5">
                  {payments.length > 0 ? (
                    payments.map((method) => (
                      <span
                        key={method}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                      >
                        <CreditCard size={12} className="text-slate-500" />
                        {submissionPaymentLabels[method] || method}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">Pembayaran tunai</span>
                  )}
                </div>
              </div>

              {/* Facilities */}
              <div>
                <span className="text-slate-500 font-medium block mb-1.5">Fasilitas Tempat</span>
                <div className="flex flex-wrap gap-1.5">
                  {facilityList.length > 0 ? (
                    facilityList.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                      >
                        <Sparkles size={11} className="text-emerald-600" />
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">Tidak ada fasilitas khusus dicantumkan</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* E. Media, Contact & Private Verification Status */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
              <Phone size={16} className="text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">Kontak & Media</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Phone size={12} className="text-sky-600" />
                    Telepon / WhatsApp
                  </span>
                  <p className="font-semibold text-slate-900">
                    {submission.business_info?.contact_phone || "Tidak dicantumkan"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <InstagramIcon size={12} className="text-pink-600" />
                    Instagram
                  </span>
                  <p className="font-semibold text-slate-900">
                    {parsed.instagram || "Tidak dicantumkan"}
                  </p>
                </div>
              </div>

              {/* Photo preview */}
              {submission.image_url ? (
                <div>
                  <span className="text-slate-500 font-medium block mb-1.5">Foto Tempat Usaha</span>
                  <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={submission.image_url}
                      alt={submission.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : null}

              {/* Additional notes */}
              {parsed.notes ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <FileText size={12} className="text-slate-400" />
                    Catatan Pemilik
                  </span>
                  <p className="text-slate-700 leading-relaxed">{parsed.notes}</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* H & I: Safe Private Evidence & Ownership Verification Rule */}
        <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-sky-700" />
              <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wide">
                Bukti Kepemilikan & Status Legalitas
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-300/80 px-2.5 py-0.5 text-[10px] font-bold text-sky-800">
              Privat & Terlindungi
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-sky-100 bg-white p-3 space-y-1 sm:col-span-2">
              <p className="font-semibold text-slate-800">
                Dokumen verifikasi telah berhasil diunggah dan disimpan.
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Sesuai standar privasi GETRA, dokumen kepemilikan dan bukti identitas usaha tidak pernah ditampilkan secara publik di halaman peta, pencarian, atau profil pengunjung. Dokumen ini hanya diperiksa oleh kurator admin resmi GETRA.
              </p>
            </div>

            <div className="rounded-xl border border-sky-100 bg-white p-3 flex flex-col justify-center space-y-1.5 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500">Tahap Selanjutnya</span>
              <span className="text-xs font-bold text-sky-900">Kurasi & Publikasi</span>
              <span className="text-[10px] text-slate-500">Estimasi verifikasi: 1x24 jam kerja</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
