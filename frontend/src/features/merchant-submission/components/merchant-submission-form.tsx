"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  MapPin,
  Save,
  Search,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { MerchantMapPicker } from "./merchant-submission-map-picker";
import { MerchantDescriptionAssistant } from "./merchant-description-assistant";
import { MerchantRegistrationPreview, MerchantRegistrationSteps, MERCHANT_REGISTRATION_STEPS } from "./merchant-registration-steps";
import { MerchantSubmissionService } from "../services/merchant-submission.service";
import { getRegistrationValidationIssue, OPERATING_DAYS } from "../services/merchant-registration-validation";
import {
  ClaimableMerchant,
  CreateMerchantSubmissionInput,
  MerchantSubmissionRecord,
  MerchantOperatingHours,
  MerchantBusinessInfo,
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

const DEFAULT_COORDINATES: [number, number] = [106.827153, -6.175392];

function initialOperatingHours(value: MerchantSubmissionRecord["opening_hours"] | undefined): MerchantOperatingHours {
  return Object.fromEntries(OPERATING_DAYS.map(([key]) => {
    const stored = value?.[key];
    return [key, stored && typeof stored === "object"
      ? { is_closed: Boolean(stored.is_closed), opens_at: stored.opens_at || "08:00", closes_at: stored.closes_at || "21:00" }
      : { is_closed: false, opens_at: "08:00", closes_at: "21:00" }];
  }));
}

export function MerchantSubmissionForm({ initialData }: MerchantSubmissionFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<OnboardingMode>(initialData ? "REGISTER" : "CHOICE");
  const [registrationStep, setRegistrationStep] = useState(0);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState(initialData?.category || CATEGORY_OPTIONS[0]);
  const [description, setDescription] = useState(initialData?.description || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [openingHours, setOpeningHours] = useState<MerchantOperatingHours>(() => initialOperatingHours(initialData?.opening_hours));
  const [coordinates, setCoordinates] = useState<[number, number]>(
    initialData?.location?.coordinates || DEFAULT_COORDINATES,
  );
  const [storedImageUrl, setStoredImageUrl] = useState(initialData?.image_url || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(initialData?.image_url || "");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(initialData?.image_url || "");
  const photoObjectUrlRef = useRef<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [menuPhotoFile, setMenuPhotoFile] = useState<File | null>(null);
  const [menuPhotoUrl, setMenuPhotoUrl] = useState(initialData?.public_media?.menu_urls?.[0] || "");
  const [menuPhotoPreviewUrl, setMenuPhotoPreviewUrl] = useState(initialData?.public_media?.menu_urls?.[0] || "");
  const menuObjectUrlRef = useRef<string | null>(null);
  const menuPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [contactPhone, setContactPhone] = useState(initialData?.business_info?.contact_phone || "");
  const [priceRange, setPriceRange] = useState<MerchantBusinessInfo["price_range"]>(initialData?.business_info?.price_range || null);
  const [paymentMethods, setPaymentMethods] = useState<MerchantBusinessInfo["payment_methods"]>(initialData?.business_info?.payment_methods || ["CASH"]);

  const [claimQuery, setClaimQuery] = useState(initialData?.name || "");
  const [claimResults, setClaimResults] = useState<ClaimableMerchant[]>([]);
  const [claimSearched, setClaimSearched] = useState(false);
  const [selectedClaimMerchant, setSelectedClaimMerchant] = useState<ClaimableMerchant | null>(null);
  const [claimContactName, setClaimContactName] = useState("");
  const [claimContactPhone, setClaimContactPhone] = useState("");
  const [claimRelationship, setClaimRelationship] = useState<"OWNER" | "MANAGER" | "AUTHORIZED_REPRESENTATIVE">("OWNER");
  const [claimStatement, setClaimStatement] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [formResetVersion, setFormResetVersion] = useState(0);

  useEffect(() => () => {
    if (photoObjectUrlRef.current) URL.revokeObjectURL(photoObjectUrlRef.current);
    if (menuObjectUrlRef.current) URL.revokeObjectURL(menuObjectUrlRef.current);
  }, []);

  useEffect(() => {
    if (mode === "REGISTER") stepHeadingRef.current?.focus();
  }, [mode, registrationStep]);

  useEffect(() => {
    if (!showClearConfirmation) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setShowClearConfirmation(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [showClearConfirmation, submitting]);

  const hasRegistrationInput = Boolean(
    initialData ||
    name.trim() ||
    description.trim() ||
    address.trim() ||
    storedImageUrl ||
    uploadedPhotoUrl ||
    photoFile ||
    menuPhotoUrl ||
    menuPhotoFile ||
    contactPhone.trim() ||
    priceRange ||
    paymentMethods.some((method) => method !== "CASH") ||
    paymentMethods.length !== 1 ||
    coordinates[0] !== DEFAULT_COORDINATES[0] ||
    coordinates[1] !== DEFAULT_COORDINATES[1] ||
    JSON.stringify(openingHours) !== JSON.stringify(initialOperatingHours(undefined))
  );

  const handleClearRegistrationForm = () => {
    if (photoObjectUrlRef.current) {
      URL.revokeObjectURL(photoObjectUrlRef.current);
      photoObjectUrlRef.current = null;
    }
    if (menuObjectUrlRef.current) {
      URL.revokeObjectURL(menuObjectUrlRef.current);
      menuObjectUrlRef.current = null;
    }
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (menuPhotoInputRef.current) menuPhotoInputRef.current.value = "";

    setName("");
    setCategory(CATEGORY_OPTIONS[0]);
    setDescription("");
    setAddress("");
    setOpeningHours(initialOperatingHours(undefined));
    setCoordinates([...DEFAULT_COORDINATES]);
    setStoredImageUrl("");
    setPhotoFile(null);
    setUploadedPhotoUrl("");
    setPhotoPreviewUrl("");
    setMenuPhotoFile(null);
    setMenuPhotoUrl("");
    setMenuPhotoPreviewUrl("");
    setContactPhone("");
    setPriceRange(null);
    setPaymentMethods(["CASH"]);
    setError(null);
    setDuplicateWarning(null);
    setRegistrationStep(0);
    setFormResetVersion((current) => current + 1);
    setShowClearConfirmation(false);
  };

  const validateRegistration = (requirePhoto: boolean, currentStep?: number): boolean => {
    const issue = getRegistrationValidationIssue({
      name, category, address, coordinates, openingHours, contactPhone,
      hasPhoto: Boolean(photoFile || uploadedPhotoUrl || storedImageUrl),
    }, requirePhoto, currentStep);
    if (issue) {
      setRegistrationStep(issue.step);
      setError(issue.message);
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

    let resolvedMenuUrl = menuPhotoUrl || null;
    if (menuPhotoFile) {
      const upload = await MerchantSubmissionService.uploadPhoto(menuPhotoFile);
      resolvedMenuUrl = upload.image_url;
      setMenuPhotoUrl(upload.image_url);
      setMenuPhotoFile(null);
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
      opening_hours: openingHours,
      public_media: {
        storefront_url: resolvedImageUrl,
        menu_urls: resolvedMenuUrl ? [resolvedMenuUrl] : [],
        product_urls: [],
      },
      business_info: {
        contact_phone: contactPhone.trim() || null,
        price_range: priceRange,
        payment_methods: paymentMethods,
      },
      image_url: resolvedImageUrl,
    };
  };

  const handleSearchClaim = async () => {
    if (claimQuery.trim().length < 2) {
      setError("Masukkan minimal 2 karakter nama usaha untuk mencari.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setClaimSearched(false);
      const result = await MerchantSubmissionService.searchClaimableMerchants(claimQuery.trim());
      setClaimResults(result.merchants);
      setClaimSearched(true);
      setMode("CLAIM");
    } catch (err: any) {
      console.error("[MerchantSubmissionForm] Claim search error:", err);
      setError(err.message || "Gagal mencari usaha. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimMerchant = async (merchant: ClaimableMerchant) => {
    if (claimContactName.trim().length < 2 || claimContactPhone.trim().length < 8) {
      setError("Nama dan nomor kontak verifikasi wajib diisi.");
      return;
    }
    if (claimStatement.trim().length < 20) {
      setError("Jelaskan bukti hubungan Anda dengan usaha ini minimal 20 karakter.");
      return;
    }
    try {
      setClaimingId(merchant.id);
      setError(null);
      await MerchantSubmissionService.claimMerchant(merchant.id, {
        evidence: {
          contactName: claimContactName.trim(),
          contactPhone: claimContactPhone.trim(),
          relationship: claimRelationship,
          statement: claimStatement.trim(),
        },
      });
      router.push("/umkm");
    } catch (err: any) {
      console.error("[MerchantSubmissionForm] Claim merchant error:", err);
      setError(err.message || "Gagal mengajukan klaim usaha.");
    } finally {
      setClaimingId(null);
    }
  };

  const startRegisterFromSearch = () => {
    if (!claimSearched) return;
    setName((current) => current || claimQuery.trim());
    setMode("REGISTER");
    setRegistrationStep(0);
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
    <div className="mx-auto max-w-4xl px-0 py-3 sm:px-2 sm:py-6">
      <div className="mb-6">
        <Link
          href="/umkm"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={13} />
          Kembali ke Usaha Saya
        </Link>
      </div>

      <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-8">
        <div className="border-b border-slate-800 pb-5 mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">
            Usaha Saya
          </p>
          <h1 className="mt-2 break-words text-xl font-bold leading-7 tracking-tight text-white">
            {initialData ? "Lanjutkan Pendaftaran" : "Daftarkan / Klaim Usaha"}
          </h1>
          <p className="mt-1 break-words text-xs leading-5 text-slate-400">
            {mode === "REGISTER"
              ? "Lengkapi data usaha secara bertahap, lalu kirim untuk diperiksa admin GETRA."
              : "Cari usaha yang sudah tersedia di GETRA, MAPID, atau Menu Go terlebih dahulu. Jika belum ada, daftarkan usaha baru."}
          </p>
        </div>

        {error ? (
          <div role="alert" className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2 mb-6">
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

        {mode === "CHOICE" || mode === "CLAIM" ? (
          <section className="space-y-5">
            <div>
              <label htmlFor="claim-merchant-search" className="block text-xs font-semibold text-slate-200 mb-1.5">
                Cari nama usaha Anda
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  id="claim-merchant-search"
                  value={claimQuery}
                  onChange={(event) => {
                    setClaimQuery(event.target.value);
                    setClaimSearched(false);
                    setClaimResults([]);
                    setSelectedClaimMerchant(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !submitting) void handleSearchClaim();
                  }}
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
                      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-col items-start gap-1.5 sm:flex-row sm:items-center">
                            <h3 className="break-words text-sm font-semibold leading-5 text-white">{merchant.name}</h3>
                            <span className="shrink-0 whitespace-nowrap rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                              {merchant.source || "GETRA"}
                            </span>
                          </div>
                          <p className="mt-1 break-words text-xs leading-5 text-slate-400">{merchant.category}</p>
                          <p className="mt-2 flex min-w-0 items-start gap-1.5 text-xs leading-5 text-slate-500">
                            <MapPin className="mt-0.5 shrink-0" size={13} />
                            <span className="break-words">{merchant.address || "Alamat belum tersedia"}</span>
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
                          onClick={() => {
                            setSelectedClaimMerchant(merchant);
                            setError(null);
                          }}
                          disabled={claimingId !== null}
                          className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-900/50 disabled:opacity-50 sm:w-auto"
                        >
                          <BadgeCheck size={14} />
                          {selectedClaimMerchant?.id === merchant.id ? "Dipilih" : "Klaim Usaha Ini"}
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

            {selectedClaimMerchant ? (
              <section className="rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-4 sm:p-5" aria-labelledby="claim-evidence-title">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">Usaha dipilih</p>
                  <h2 id="claim-evidence-title" className="mt-1 break-words text-base font-semibold text-white">
                    {selectedClaimMerchant.name}
                  </h2>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                    {selectedClaimMerchant.category} · {selectedClaimMerchant.address || "Alamat belum tersedia"}
                  </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block min-w-0 text-xs font-semibold text-slate-200">
                    Nama kontak verifikasi
                    <input
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                      value={claimContactName}
                      onChange={(event) => setClaimContactName(event.target.value)}
                      maxLength={120}
                    />
                  </label>
                  <label className="block min-w-0 text-xs font-semibold text-slate-200">
                    Nomor kontak
                    <input
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                      value={claimContactPhone}
                      onChange={(event) => setClaimContactPhone(event.target.value)}
                      inputMode="tel"
                      maxLength={32}
                    />
                  </label>
                  <label className="block min-w-0 text-xs font-semibold text-slate-200 sm:col-span-2">
                    Hubungan dengan usaha
                    <select
                      className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                      value={claimRelationship}
                      onChange={(event) => setClaimRelationship(event.target.value as typeof claimRelationship)}
                    >
                      <option value="OWNER">Pemilik</option>
                      <option value="MANAGER">Pengelola</option>
                      <option value="AUTHORIZED_REPRESENTATIVE">Perwakilan resmi</option>
                    </select>
                  </label>
                  <label className="block min-w-0 text-xs font-semibold text-slate-200 sm:col-span-2">
                    Bukti kepemilikan atau pengelolaan
                    <textarea
                      className="mt-1.5 w-full resize-y rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm leading-6 text-white outline-none focus:border-emerald-500"
                      rows={4}
                      value={claimStatement}
                      onChange={(event) => setClaimStatement(event.target.value)}
                      placeholder="Jelaskan hubungan Anda dengan usaha dan bukti yang dapat diverifikasi admin GETRA. Informasi ini tidak dipublikasikan."
                      maxLength={1000}
                    />
                  </label>
                </div>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="min-h-10 rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200"
                    onClick={() => setSelectedClaimMerchant(null)}
                    disabled={claimingId !== null}
                  >
                    Ganti Usaha
                  </button>
                  <button
                    type="button"
                    className="min-h-10 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    onClick={() => void handleClaimMerchant(selectedClaimMerchant)}
                    disabled={claimingId !== null}
                  >
                    {claimingId ? "Mengirim Klaim..." : "Ajukan Klaim untuk Verifikasi"}
                  </button>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                  Bukti klaim hanya dapat dilihat oleh Anda dan admin yang memeriksa. Pengelolaan usaha tersedia setelah klaim disetujui.
                </p>
              </section>
            ) : null}

            {claimSearched && claimResults.length > 0 && !selectedClaimMerchant ? <div className="border-t border-slate-800 pt-5">
              <button
                type="button"
                onClick={startRegisterFromSearch}
                className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
              >
                Tidak ada yang sesuai? Daftarkan Usaha Baru
              </button>
            </div> : null}
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
                  Kembali mencari usaha
                </button>
              </div>
            ) : null}

            <MerchantRegistrationSteps
              currentStep={registrationStep}
              disabled={submitting}
              onStepChange={(step) => {
                setRegistrationStep(step);
                setError(null);
              }}
            />
            <h2 className="text-lg font-semibold text-white outline-none" ref={stepHeadingRef} tabIndex={-1}>
              {MERCHANT_REGISTRATION_STEPS[registrationStep]}
            </h2>

            {registrationStep === 0 ? <section className="space-y-4">
              <SectionHeader title="Identitas Usaha" description="Bantu orang mengenali usaha dan produk atau layanan Anda." />
              <div>
                <label htmlFor="merchant-name" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Nama Usaha / Toko <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="merchant-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: Warung Kopi Selamat GETRA"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  disabled={submitting}
                />
              </div>

              <div>
                <label htmlFor="merchant-category" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Kategori Usaha <span className="text-rose-400">*</span>
                </label>
                <select
                  id="merchant-category"
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
                <label className="mb-1.5 block text-xs font-semibold text-slate-200" htmlFor="merchant-description">
                  Deskripsi Usaha & Produk/Layanan Unggulan
                </label>
                <MerchantDescriptionAssistant
                  businessName={name}
                  category={category}
                  disabled={submitting}
                  id="merchant-description"
                  key={`merchant-description-${formResetVersion}`}
                  onChange={setDescription}
                  priceRange={priceRange ?? null}
                  value={description}
                />
              </div>
            </section> : null}

            {registrationStep === 1 ? <section className="space-y-4">
              <SectionHeader title="Lokasi Usaha" description="Pilih titik usaha di peta. Pastikan sesuai dengan alamat dan pintu masuk yang mudah ditemukan." />
              <div>
                <label htmlFor="merchant-address" className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Alamat Lengkap / Patokan Lokasi <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  id="merchant-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Contoh: Jl. Kebon Jeruk No. 12, seberang Halte TransJakarta"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition-all placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  disabled={submitting}
                />
              </div>

              <MerchantMapPicker
                initialCoordinates={coordinates}
                key={`merchant-map-${formResetVersion}`}
                onCoordinatesChange={setCoordinates}
              />
            </section> : null}

            {registrationStep === 2 ? <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <SectionHeader title="Jam Operasional" description="Atur jadwal per hari. Jadwal lintas tengah malam belum didukung." />
                <button
                  type="button"
                  className="self-start text-xs font-semibold text-cyan-300 hover:text-cyan-200 sm:self-auto"
                  onClick={() => {
                    const monday = openingHours.monday;
                    if (!monday) return;
                    setOpeningHours(Object.fromEntries(OPERATING_DAYS.map(([key]) => [key, { ...monday }])));
                  }}
                >
                  Terapkan Senin ke semua hari
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50">
                {OPERATING_DAYS.map(([key, label]) => {
                  const hours = openingHours[key];
                  return (
                    <div className="grid min-w-0 gap-3 border-b border-slate-800 p-3 last:border-b-0 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-center" key={key}>
                      <strong className="text-xs text-slate-200">{label}</strong>
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                        <input
                          aria-label={`Jam buka ${label}`}
                          className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white disabled:opacity-40"
                          type="time"
                          value={hours?.opens_at || "08:00"}
                          disabled={hours?.is_closed}
                          onChange={(event) => setOpeningHours((current) => ({ ...current, [key]: { ...current[key], opens_at: event.target.value } }))}
                        />
                        <span className="text-xs text-slate-500">–</span>
                        <input
                          aria-label={`Jam tutup ${label}`}
                          className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white disabled:opacity-40"
                          type="time"
                          value={hours?.closes_at || "21:00"}
                          disabled={hours?.is_closed}
                          onChange={(event) => setOpeningHours((current) => ({ ...current, [key]: { ...current[key], closes_at: event.target.value } }))}
                        />
                      </div>
                      <label className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={Boolean(hours?.is_closed)}
                          onChange={(event) => setOpeningHours((current) => ({ ...current, [key]: { ...current[key], is_closed: event.target.checked } }))}
                        />
                        Tutup
                      </label>
                    </div>
                  );
                })}
              </div>
              <SectionHeader title="Informasi Usaha" description="Informasi kontak dan transaksi membantu profil usaha lebih lengkap." />
              <div>
                <label className="block text-xs font-semibold text-slate-200">
                  Nomor kontak usaha
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    inputMode="tel"
                    maxLength={32}
                    placeholder="Contoh: 0812..."
                  />
                </label>
              </div>
              <fieldset>
                <legend className="text-xs font-semibold text-slate-200">Metode pembayaran</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["CASH", "QRIS", "DEBIT", "TRANSFER"] as const).map((method) => (
                    <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-300" key={method}>
                      <input
                        type="checkbox"
                        checked={paymentMethods.includes(method)}
                        onChange={(event) => setPaymentMethods((current) => event.target.checked ? [...new Set([...current, method])] : current.filter((item) => item !== method))}
                      />
                      {method === "CASH" ? "Tunai" : method}
                    </label>
                  ))}
                </div>
              </fieldset>
            </section> : null}

            {registrationStep === 4 ? <section className="space-y-4">
              <SectionHeader title="Foto Usaha" description="Tambahkan foto tempat usaha atau produk yang akan tampil di profil publik." />
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Foto Utama Tempat Usaha / Produk <span className="text-rose-400">*</span>
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-5 text-center transition-colors hover:border-emerald-500/70 hover:bg-slate-900">
                  {photoPreviewUrl ? (
                    // Preview can be a temporary blob URL, so Next Image optimization is not applicable.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreviewUrl}
                      alt="Preview foto utama usaha"
                      className="mb-2 h-40 w-full rounded-lg object-cover sm:h-52"
                    />
                  ) : null}
                  <Upload size={18} className="text-emerald-400" />
                  <span className="max-w-full break-all text-xs font-semibold leading-5 text-slate-200">
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
                    ref={photoInputRef}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (photoObjectUrlRef.current) {
                        URL.revokeObjectURL(photoObjectUrlRef.current);
                        photoObjectUrlRef.current = null;
                      }
                      setPhotoFile(file);
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        photoObjectUrlRef.current = previewUrl;
                        setPhotoPreviewUrl(previewUrl);
                        setUploadedPhotoUrl("");
                        setStoredImageUrl("");
                      } else {
                        setPhotoPreviewUrl(storedImageUrl);
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
            </section> : null}

            {registrationStep === 3 ? <section className="space-y-4">
              <SectionHeader title="Menu & Harga" description="Bantu calon pelanggan mengetahui pilihan dan kisaran harga yang tersedia." />
              <label className="block text-xs font-semibold text-slate-200">
                Kisaran harga
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-emerald-500"
                  value={priceRange || ""}
                  onChange={(event) => setPriceRange((event.target.value || null) as MerchantBusinessInfo["price_range"])}
                >
                  <option value="">Belum ditentukan</option>
                  <option value="BUDGET">Terjangkau</option>
                  <option value="STANDARD">Menengah</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </label>
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">Foto menu (opsional)</label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-5 text-center hover:border-cyan-500/70">
                  {menuPhotoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={menuPhotoPreviewUrl} alt="Preview foto menu" className="mb-2 h-40 w-full rounded-lg object-cover sm:h-52" />
                  ) : null}
                  <Upload size={18} className="text-cyan-300" />
                  <span className="max-w-full break-all text-xs font-semibold leading-5 text-slate-200">{menuPhotoFile?.name || (menuPhotoUrl ? "Ganti foto menu" : "Upload Foto Menu")}</span>
                  <span className="text-[11px] text-slate-500">Menu Go yang sudah terhubung tetap dipertahankan. JPG, PNG, atau WEBP; maksimal 5 MB.</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={submitting}
                    ref={menuPhotoInputRef}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (menuObjectUrlRef.current) URL.revokeObjectURL(menuObjectUrlRef.current);
                      setMenuPhotoFile(file);
                      if (file) {
                        const previewUrl = URL.createObjectURL(file);
                        menuObjectUrlRef.current = previewUrl;
                        setMenuPhotoPreviewUrl(previewUrl);
                        setMenuPhotoUrl("");
                      } else {
                        setMenuPhotoPreviewUrl(menuPhotoUrl);
                      }
                    }}
                  />
                </label>
              </div>
            </section> : null}

            {registrationStep >= 4 ? <section className="space-y-4">
              <SectionHeader
                title={registrationStep === 5 ? "Periksa sebelum mengirim" : "Preview Usaha"}
                description={registrationStep === 5
                  ? "Periksa alamat, titik lokasi, jadwal, dan foto. Admin akan memverifikasi pendaftaran sebelum fitur pengelolaan usaha diaktifkan."
                  : "Ringkasan ini menggunakan data yang Anda isi. Anda dapat kembali ke langkah sebelumnya untuk memperbaikinya."}
              />
              <MerchantRegistrationPreview
                name={name}
                category={category}
                description={description}
                address={address}
                coordinates={coordinates}
                contactPhone={contactPhone}
                priceRange={priceRange}
                paymentMethods={paymentMethods}
                hasPhoto={Boolean(photoFile || uploadedPhotoUrl || storedImageUrl)}
                hasMenu={Boolean(menuPhotoFile || menuPhotoUrl)}
                operatingHours={OPERATING_DAYS.map(([key, label]) => (
                  <span key={key}>{label}: {openingHours[key]?.is_closed ? "Tutup" : `${openingHours[key]?.opens_at || "Belum diisi"} - ${openingHours[key]?.closes_at || "Belum diisi"}`}</span>
                ))}
              />
              {registrationStep === 5 ? <p className="text-xs leading-5 text-slate-400">Belum siap mengirim? Simpan sebagai draft dan lanjutkan nanti. Status pemeriksaan dapat dilihat di Usaha Saya.</p> : null}
            </section> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                disabled={submitting || registrationStep === 0}
                onClick={() => {
                  setRegistrationStep((current) => Math.max(0, current - 1));
                  setError(null);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-xs font-semibold text-slate-200 disabled:opacity-40"
              >
                <ArrowLeft size={14} /> Sebelumnya
              </button>
              {registrationStep < MERCHANT_REGISTRATION_STEPS.length - 1 ? <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  if (validateRegistration(false, registrationStep)) setRegistrationStep((current) => current + 1);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Lanjutkan <ArrowRight size={14} />
              </button> : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link
                  href="/umkm"
                  className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-center text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 sm:w-auto"
                >
                  Batal
                </Link>
                <button
                  type="button"
                  onClick={() => setShowClearConfirmation(true)}
                  disabled={submitting || !hasRegistrationInput}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/15 px-4 text-xs font-semibold text-rose-200 transition-colors hover:border-rose-400/50 hover:bg-rose-950/30 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <Trash2 size={14} />
                  Bersihkan Form
                </button>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50 sm:w-auto"
                >
                  <Save size={14} />
                  <span>Simpan Draft</span>
                </button>

                {registrationStep === MERCHANT_REGISTRATION_STEPS.length - 1 ? <button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-500 disabled:opacity-50 sm:w-auto"
                >
                  <Send size={14} />
                  <span>{submitting ? "Memproses..." : "Ajukan Verifikasi"}</span>
                </button> : null}
              </div>
            </div>
          </form>
        ) : null}
      </div>

      {showClearConfirmation ? (
        <div
          aria-labelledby="clear-merchant-form-title"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-950/60 text-rose-300">
                <Trash2 size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="break-words text-base font-bold leading-6 text-white" id="clear-merchant-form-title">
                  Bersihkan semua input?
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {initialData
                    ? "Semua input di layar, lokasi, jadwal, dan foto akan dikosongkan. Draft tersimpan tidak berubah sampai Anda menyimpannya kembali."
                    : "Semua input, lokasi, jadwal, dan foto yang belum disimpan akan dihapus dan tidak dapat dipulihkan."}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                autoFocus
                type="button"
                onClick={() => setShowClearConfirmation(false)}
                disabled={submitting}
                className="min-h-10 rounded-xl border border-slate-700 bg-slate-800 px-4 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleClearRegistrationForm}
                disabled={submitting}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Ya, Bersihkan Form
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
