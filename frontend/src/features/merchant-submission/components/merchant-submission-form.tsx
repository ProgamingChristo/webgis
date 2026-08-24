"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MerchantMapPicker } from "./merchant-submission-map-picker";
import { MerchantSubmissionService } from "../services/merchant-submission.service";
import { CreateMerchantSubmissionInput, MerchantSubmissionRecord } from "../types/merchant-submission.types";

interface MerchantSubmissionFormProps {
  initialData?: MerchantSubmissionRecord;
}

const CATEGORY_OPTIONS = [
  "Makanan & Minuman",
  "Kopi & Minuman Ringan",
  "Retail & Toko Kelontong",
  "Jasa & Layanan Publik",
  "Kesehatan & Apotek",
  "Fashion & Aksesori",
  "Lainnya",
];

export function MerchantSubmissionForm({ initialData }: MerchantSubmissionFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState(initialData?.category || CATEGORY_OPTIONS[0]);
  const [description, setDescription] = useState(initialData?.description || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [coordinates, setCoordinates] = useState<[number, number]>(
    initialData?.location?.coordinates || [106.827153, -6.175392]
  );
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!name.trim() || name.trim().length < 2) {
      setError("Nama usaha minimal 2 karakter.");
      return false;
    }
    if (!category.trim()) {
      setError("Kategori usaha wajib dipilih.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateMerchantSubmissionInput = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        location: {
          type: "Point",
          coordinates,
        },
        image_url: imageUrl.trim() || null,
      };

      if (initialData?.id) {
        await MerchantSubmissionService.updateDraft(initialData.id, payload);
        router.push(`/umkm/submissions/${initialData.id}`);
      } else {
        const res = await MerchantSubmissionService.createDraft(payload);
        if (res.duplicate_warning?.has_potential_duplicate) {
          setDuplicateWarning(
            `Perhatian: Terdapat merchant dengan nama serupa di sekitar lokasi: "${res.duplicate_warning.nearby_merchant_name}". Pengajuan Anda tetap tersimpan sebagai draft.`
          );
        }
        router.push(`/umkm/submissions/${res.submission.id}`);
      }
    } catch (err: any) {
      console.error("[MerchantSubmissionForm] Save draft error:", err);
      setError(err.message || "Gagal menyimpan draft pengajuan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateMerchantSubmissionInput = {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        location: {
          type: "Point",
          coordinates,
        },
        image_url: imageUrl.trim() || null,
      };

      let submissionId = initialData?.id;
      if (!submissionId) {
        const res = await MerchantSubmissionService.createDraft(payload);
        submissionId = res.submission.id;
      } else {
        await MerchantSubmissionService.updateDraft(submissionId, payload);
      }

      await MerchantSubmissionService.submitForReview(submissionId);
      router.push(`/umkm/submissions/${submissionId}`);
    } catch (err: any) {
      console.error("[MerchantSubmissionForm] Submit review error:", err);
      setError(err.message || "Gagal mengajukan merchant untuk review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/umkm"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={13} />
          Kembali ke Workspace UMKM
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="border-b border-slate-800 pb-5 mb-6">
          <h1 className="text-xl font-bold text-white tracking-tight">
            {initialData ? "Edit Draft Pengajuan UMKM" : "Tambahkan UMKM ke GETRA"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftarkan usaha fisik Anda agar dapat terindeks pada peta pencarian komuter dan memenuhi syarat program promosi transit.
          </p>
        </div>

        {error ? (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 mb-6">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {duplicateWarning ? (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2 mb-6">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        ) : null}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Nama Usaha */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Nama Usaha / Toko <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Warung Kopi Selamat GETRA"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Kategori Usaha <span className="text-rose-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none transition-all"
              disabled={submitting}
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Deskripsi Usaha & Produk Unggulan
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan jenis menu, layanan, atau keunggulan usaha Anda untuk komuter pejalan kaki."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition-all resize-none"
              disabled={submitting}
            />
          </div>

          {/* Alamat Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Alamat Lengkap / Patokan Lokasi
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Contoh: Jl. Kebon Jeruk No. 12, seberang Halte TransJakarta"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
              disabled={submitting}
            />
          </div>

          {/* MapLibre Location Picker */}
          <div className="pt-2">
            <MerchantMapPicker
              initialCoordinates={coordinates}
              onCoordinatesChange={setCoordinates}
            />
          </div>

          {/* Foto Usaha (URL) */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Foto Tempat Usaha / Produk (URL)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition-all font-mono text-xs"
              disabled={submitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              href="/umkm"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-center transition-colors"
            >
              Batal
            </Link>

            <div className="w-full sm:w-auto flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                <span>Simpan Draft</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-colors disabled:opacity-50"
              >
                <Send size={14} />
                <span>{submitting ? "Memproses..." : "Ajukan untuk Review"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
