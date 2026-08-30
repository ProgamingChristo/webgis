"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Save,
  Search,
  Send,
  Store,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { MerchantMapPicker } from "./merchant-submission-map-picker";
import { MerchantSubmissionService } from "../services/merchant-submission.service";
import {
  ClaimableMerchant,
  CreateMerchantSubmissionInput,
  MerchantSubmissionRecord,
} from "../types/merchant-submission.types";

interface MerchantSubmissionFormProps {
  initialData?: MerchantSubmissionRecord;
}

type OnboardingMode = "CHOICE" | "CLAIM" | "REGISTER";

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
  const [mode, setMode] = useState<OnboardingMode>(initialData ? "REGISTER" : "CHOICE");

  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState(initialData?.category || CATEGORY_OPTIONS[0]);
  const [description, setDescription] = useState(initialData?.description || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [coordinates, setCoordinates] = useState<[number, number]>(
    initialData?.location?.coordinates || [106.827153, -6.175392],
  );
  const [storedImageUrl, setStoredImageUrl] = useState(initialData?.image_url || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(initialData?.image_url || "");

  const [claimQuery, setClaimQuery] = useState(initialData?.name || "");
  const [claimResults, setClaimResults] = useState<ClaimableMerchant[]>([]);
  const [claimSearched, setClaimSearched] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const validateRegistration = (requirePhoto: boolean): boolean => {
    if (!name.trim() || name.trim().length < 2) {
      setError("Nama usaha minimal 2 karakter.");
      return false;
    }
    if (!category.trim()) {
      setError("Kategori usaha wajib dipilih.");
      return false;
    }
    if (!address.trim()) {
      setError("Alamat atau patokan lokasi wajib diisi.");
      return false;
    }
    if (!Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) {
      setError("Titik lokasi usaha belum valid. Klik peta atau gunakan lokasi Anda.");
      return false;
    }
    if (requirePhoto && !photoFile && !uploadedPhotoUrl && !storedImageUrl) {
      setError("Foto utama tempat usaha wajib diupload sebelum ajukan verifikasi.");
      return false;
    }
    setError(null);
    return true;
  };

  const buildPayload = async (): Promise<CreateMerchantSubmissionInput> => {
    let resolvedImageUrl = uploadedPhotoUrl || storedImageUrl || null;

    if (photoFile) {
      const upload = await MerchantSubmissionService.uploadPhoto(photoFile);
      resolvedImageUrl = upload.image_url;
      setUploadedPhotoUrl(upload.image_url);
      setStoredImageUrl(upload.image_url);
      setPhotoFile(null);
    }

    return {
      name: name.trim(),
      category: category.trim(),
      description: description.trim() || null,
      address: address.trim() || null,
      location: {
        type: "Point",
        coordinates,
      },
      image_url: resolvedImageUrl,
    };
  };

  const handleSearchClaim = async () => {
    if (claimQuery.trim().length < 2) {
      setError("Masukkan minimal 2 karakter nama usaha untuk mencari data existing.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setClaimSearched(false);
      const result = await MerchantSubmissionService.searchClaimableMerchants(claimQuery.trim());
      setClaimResults(result.merchants);
      setClaimSearched(true);
    } catch (err: any) {
      console.error("[MerchantSubmissionForm] Claim search error:", err);
      setError(err.message || "Gagal mencari usaha existing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimMerchant = async (merchant: ClaimableMerchant) => {
    try {
      setClaimingId(merchant.id);
      setError(null);
      await MerchantSubmissionService.claimMerchant(merchant.id);
      router.push("/umkm");
    } catch (err: any) {
      console.error("[MerchantSubmissionForm] Claim merchant error:", err);
      setError(err.message || "Gagal mengajukan klaim usaha.");
    } finally {
      setClaimingId(null);
    }
  };

  const startRegisterFromSearch = () => {
    setName((current) => current || claimQuery.trim());
    setMode("REGISTER");
    setError(null);
  };

  const handleSaveDraft = async () => {
    if (!validateRegistration(false)) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload = await buildPayload();

      if (initialData?.id) {
        await MerchantSubmissionService.updateDraft(initialData.id, payload);
        router.push(`/umkm/submissions/${initialData.id}`);
      } else {
        const res = await MerchantSubmissionService.createDraft(payload);
        if (res.duplicate_warning?.has_potential_duplicate) {
          setDuplicateWarning(
            `Perhatian: terdapat merchant dengan nama serupa di sekitar lokasi: "${res.duplicate_warning.nearby_merchant_name}". Pengajuan tetap tersimpan sebagai draft.`,
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
    if (!validateRegistration(true)) return;

    try {
      setSubmitting(true);
      setError(null);

      const payload = await buildPayload();

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
      setError(err.message || "Gagal mengajukan usaha untuk verifikasi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
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
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">
            UMKM onboarding
          </p>
          <h1 className="mt-2 text-xl font-bold text-white tracking-tight">
            {mode === "REGISTER" ? "Daftarkan Usaha Baru" : "Daftarkan / Klaim Usaha"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cari data existing GETRA, MAPID, atau Menu Go terlebih dahulu agar tidak membuat merchant duplikat.
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

        {mode === "CHOICE" ? (
          <section className="space-y-5">
            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/10 p-5">
              <h2 className="text-sm font-semibold text-white">Apakah usaha sudah tersedia di GETRA?</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Jika usaha berasal dari MAPID atau Menu Go, gunakan klaim ownership. Jika belum ada, lanjutkan pendaftaran usaha baru.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("CLAIM")}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-5 text-left transition-colors hover:border-emerald-400/60 hover:bg-emerald-950/25"
              >
                <Search size={20} className="text-emerald-300" />
                <strong className="mt-4 block text-sm text-white">Klaim Usaha yang Sudah Ada</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  Cari merchant GETRA, MAPID, atau Menu Go lalu ajukan ownership tanpa membuat record baru.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("REGISTER")}
                className="rounded-2xl border border-slate-700 bg-slate-950/60 p-5 text-left transition-colors hover:border-cyan-400/50 hover:bg-slate-900"
              >
                <Store size={20} className="text-cyan-300" />
                <strong className="mt-4 block text-sm text-white">Daftarkan Usaha Baru</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  Gunakan ini hanya jika usaha belum tersedia di data existing GETRA.
                </span>
              </button>
            </div>
          </section>
        ) : null}

        {mode === "CLAIM" ? (
          <section className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Cari nama usaha existing
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={claimQuery}
                  onChange={(event) => setClaimQuery(event.target.value)}
                  placeholder="Contoh: Warung Nusantara"
                  className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={handleSearchClaim}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Search size={14} />
                  {submitting ? "Mencari..." : "Cari Usaha"}
                </button>
              </div>
            </div>

            {claimSearched ? (
              <div className="space-y-3">
                {claimResults.length > 0 ? (
                  claimResults.map((merchant) => (
                    <article
                      key={merchant.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white">{merchant.name}</h3>
                            <span className="rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                              {merchant.source || "GETRA"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{merchant.category}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin size={13} />
                            {merchant.address || "Alamat belum tersedia"}
                          </p>
                          {merchant.mobility ? (
                            <p className="mt-1 text-[11px] text-amber-200">
                              Status lokasi: {merchant.mobility}
                              {merchant.observedAt ? `, terakhir ditemukan ${merchant.observedAt}` : ""}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleClaimMerchant(merchant)}
                          disabled={claimingId !== null}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-900/50 disabled:opacity-50"
                        >
                          <BadgeCheck size={14} />
                          {claimingId === merchant.id ? "Mengajukan..." : "Klaim Usaha Ini"}
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-center">
                    <p className="text-sm font-semibold text-white">Usaha belum ditemukan.</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Jika sudah yakin belum ada di GETRA, lanjutkan pendaftaran usaha baru.
                    </p>
                    <button
                      type="button"
                      onClick={startRegisterFromSearch}
                      className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                    >
                      Daftarkan Usaha Baru
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            <div className="border-t border-slate-800 pt-5">
              <button
                type="button"
                onClick={startRegisterFromSearch}
                className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
              >
                Tidak menemukan usaha? Daftarkan usaha baru
              </button>
            </div>
          </section>
        ) : null}

        {mode === "REGISTER" ? (
          <form onSubmit={(event) => event.preventDefault()} className="space-y-7">
            {!initialData ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-950/10 p-4">
                <p className="text-xs font-semibold text-amber-100">Pastikan usaha belum tersedia sebelum mendaftar.</p>
                <button
                  type="button"
                  onClick={() => setMode("CLAIM")}
                  className="mt-2 text-xs font-semibold text-amber-200 underline-offset-4 hover:underline"
                >
                  Cari & klaim usaha existing
                </button>
              </div>
            ) : null}

            <section className="space-y-4">
              <SectionHeader title="Identitas" description="Data dasar yang dipakai untuk validasi dan discoverability awal." />
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Nama Usaha / Toko <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: Warung Kopi Selamat GETRA"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Kategori Usaha <span className="text-rose-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  disabled={submitting}
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Deskripsi Usaha & Produk/Layanan Unggulan
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Jelaskan menu, produk, layanan, atau keunggulan usaha Anda untuk komuter pejalan kaki."
                  className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  disabled={submitting}
                />
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader title="Lokasi" description="Koordinat diambil dari MapLibre. Merchant tidak perlu mengetik latitude/longitude manual." />
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Alamat Lengkap / Patokan Lokasi <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Contoh: Jl. Kebon Jeruk No. 12, seberang Halte TransJakarta"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  disabled={submitting}
                />
              </div>

              <MerchantMapPicker
                initialCoordinates={coordinates}
                onCoordinatesChange={setCoordinates}
              />
            </section>

            <section className="space-y-4">
              <SectionHeader title="Bukti" description="Upload foto utama tempat usaha atau produk. URL manual tidak dipakai untuk merchant." />
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Foto Utama Tempat Usaha / Produk <span className="text-rose-400">*</span>
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-5 text-center transition-colors hover:border-emerald-500/70 hover:bg-slate-900">
                  <Upload size={18} className="text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    {photoFile ? photoFile.name : storedImageUrl ? "Ganti foto utama" : "Upload Foto"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    JPG, PNG, atau WEBP. Maksimal 5 MB.
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={submitting}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setPhotoFile(file);
                      if (file) {
                        setUploadedPhotoUrl("");
                        setStoredImageUrl("");
                      }
                    }}
                  />
                </label>
                {storedImageUrl && !photoFile ? (
                  <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                    Foto utama sudah tersimpan dari upload sebelumnya.
                  </p>
                ) : null}
              </div>
            </section>

            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href="/umkm"
                className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-center text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 sm:w-auto"
              >
                Batal
              </Link>

              <div className="w-full sm:w-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>Simpan Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{submitting ? "Memproses..." : "Ajukan Verifikasi"}</span>
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
