"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CreditCard,
  FileCheck,
  HelpCircle,
  Locate,
  Phone,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  Utensils,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { MerchantMapPicker } from "./merchant-submission-map-picker";
import { MerchantDescriptionAssistant } from "./merchant-description-assistant";
import {
  MerchantRegistrationPreview,
  MerchantRegistrationSteps,
} from "./merchant-registration-steps";
import { MerchantSubmissionService } from "../services/merchant-submission.service";
import {
  getRegistrationValidationIssue,
  OPERATING_DAYS,
} from "../services/merchant-registration-validation";
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

function initialOperatingHours(
  value: MerchantSubmissionRecord["opening_hours"] | undefined
): MerchantOperatingHours {
  return Object.fromEntries(
    OPERATING_DAYS.map(([key]) => {
      const stored = value?.[key];
      return [
        key,
        stored && typeof stored === "object"
          ? {
              is_closed: Boolean(stored.is_closed),
              opens_at: stored.opens_at || "08:00",
              closes_at: stored.closes_at || "21:00",
            }
          : { is_closed: false, opens_at: "08:00", closes_at: "21:00" },
      ];
    })
  );
}

export function MerchantSubmissionForm({ initialData }: MerchantSubmissionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimMerchantIdParam = searchParams.get("claimMerchantId");
  const claimNameParam = searchParams.get("name");
  const modeParam = searchParams.get("mode");

  const [mode, setMode] = useState<OnboardingMode>(() => {
    if (initialData) return "REGISTER";
    if (claimMerchantIdParam && modeParam === "claim") return "CLAIM";
    if (modeParam === "claim") return "CLAIM";
    if (modeParam === "register") return "REGISTER";
    return "CHOICE";
  });

  const [registrationStep, setRegistrationStep] = useState(0);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // Step 1 Form State
  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState(initialData?.category || CATEGORY_OPTIONS[0]);
  const [businessType, setBusinessType] = useState<"MENETAP" | "KELILING">("MENETAP");
  const [description, setDescription] = useState(initialData?.description || "");
  const [featuredMenu, setFeaturedMenu] = useState("");
  const [priceRange, setPriceRange] = useState<MerchantBusinessInfo["price_range"]>(
    initialData?.business_info?.price_range || null
  );

  // Step 2 Form State
  const [address, setAddress] = useState(initialData?.address || "");
  const [coordinates, setCoordinates] = useState<[number, number]>(
    initialData?.location?.coordinates || [106.827153, -6.175392]
  );
  const [openingHours, setOpeningHours] = useState<MerchantOperatingHours>(() =>
    initialOperatingHours(initialData?.opening_hours)
  );
  const [paymentMethods, setPaymentMethods] = useState<MerchantBusinessInfo["payment_methods"]>(
    initialData?.business_info?.payment_methods || ["CASH"]
  );
  const [facilities, setFacilities] = useState<string[]>(["Tempat Duduk", "Take Away"]);

  // Step 3 Form State
  const [storedImageUrl, setStoredImageUrl] = useState(initialData?.image_url || "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(initialData?.image_url || "");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(initialData?.image_url || "");
  const photoObjectUrlRef = useRef<string | null>(null);

  const [menuPhotoFile, setMenuPhotoFile] = useState<File | null>(null);
  const [menuPhotoUrl, setMenuPhotoUrl] = useState(
    initialData?.public_media?.menu_urls?.[0] || ""
  );
  const [menuPhotoPreviewUrl, setMenuPhotoPreviewUrl] = useState(
    initialData?.public_media?.menu_urls?.[0] || ""
  );
  const menuObjectUrlRef = useRef<string | null>(null);

  const [promoPhotoPreviewUrl, setPromoPhotoPreviewUrl] = useState("");

  const [contactPhone, setContactPhone] = useState(
    initialData?.business_info?.contact_phone || ""
  );
  const [instagram, setInstagram] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [ownershipProofFile, setOwnershipProofFile] = useState<File | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const menuPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [formResetVersion, setFormResetVersion] = useState(0);

  // Claim Search State
  const [claimQuery, setClaimQuery] = useState(claimNameParam || initialData?.name || "");
  const [claimResults, setClaimResults] = useState<ClaimableMerchant[]>([]);
  const [claimSearched, setClaimSearched] = useState(Boolean(claimMerchantIdParam));
  const [selectedClaimMerchant, setSelectedClaimMerchant] = useState<ClaimableMerchant | null>(() => {
    if (claimMerchantIdParam && modeParam === "claim") {
      return {
        id: claimMerchantIdParam,
        name: claimNameParam || "Usaha Terpilih",
        category: "UMKM",
        address: "",
        longitude: 0,
        latitude: 0,
        source: "CANONICAL",
        status: "verified" as const,
      };
    }
    return null;
  });
  const [claimContactName, setClaimContactName] = useState("");
  const [claimContactPhone, setClaimContactPhone] = useState("");
  const [claimRelationship, setClaimRelationship] = useState<
    "OWNER" | "MANAGER" | "AUTHORIZED_REPRESENTATIVE"
  >("OWNER");
  const [claimStatement, setClaimStatement] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

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
    // Map visual step to logical step checks
    if (currentStep === 0) {
      const issue = getRegistrationValidationIssue(
        {
          name,
          category,
          address,
          coordinates,
          openingHours,
          contactPhone,
          hasPhoto: Boolean(photoFile || uploadedPhotoUrl || storedImageUrl),
        },
        false,
        0
      );
      if (issue) {
        setError(issue.message);
        return false;
      }
    } else if (currentStep === 1) {
      const issue1 = getRegistrationValidationIssue(
        {
          name,
          category,
          address,
          coordinates,
          openingHours,
          contactPhone,
          hasPhoto: Boolean(photoFile || uploadedPhotoUrl || storedImageUrl),
        },
        false,
        1
      );
      if (issue1) {
        setError(issue1.message);
        return false;
      }
      const issue2 = getRegistrationValidationIssue(
        {
          name,
          category,
          address,
          coordinates,
          openingHours,
          contactPhone,
          hasPhoto: Boolean(photoFile || uploadedPhotoUrl || storedImageUrl),
        },
        false,
        2
      );
      if (issue2) {
        setError(issue2.message);
        return false;
      }
    } else if (requirePhoto) {
      const issue = getRegistrationValidationIssue(
        {
          name,
          category,
          address,
          coordinates,
          openingHours,
          contactPhone,
          hasPhoto: Boolean(photoFile || uploadedPhotoUrl || storedImageUrl),
        },
        true
      );
      if (issue) {
        const visualStep = issue.step === 0 ? 0 : issue.step === 1 || issue.step === 2 ? 1 : 2;
        setRegistrationStep(visualStep);
        setError(issue.message);
        return false;
      }
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

    // Build enriched description incorporating Figma details
    let fullDescription = description.trim();
    const extraParts: string[] = [];
    if (businessType === "KELILING") {
      extraParts.push("[Jenis Usaha: Keliling]");
    }
    if (featuredMenu.trim()) {
      extraParts.push(`[Menu Andalan: ${featuredMenu.trim()}]`);
    }
    if (facilities.length > 0) {
      extraParts.push(`[Fasilitas: ${facilities.join(", ")}]`);
    }
    if (instagram.trim()) {
      extraParts.push(`[Instagram: ${instagram.trim()}]`);
    }
    if (additionalNotes.trim()) {
      extraParts.push(`[Catatan: ${additionalNotes.trim()}]`);
    }
    if (extraParts.length > 0) {
      fullDescription = fullDescription
        ? `${fullDescription}\n\n${extraParts.join(" ")}`
        : extraParts.join(" ");
    }

    return {
      name: name.trim(),
      category: category.trim(),
      description: fullDescription || null,
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
      setError("Pencarian usaha belum berhasil. Coba lagi.");
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
      setError(err?.message || "Klaim usaha belum dapat dikirim. Coba lagi.");
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
            `Perhatian: terdapat merchant dengan nama serupa di sekitar lokasi: "${res.duplicate_warning.nearby_merchant_name}". Pengajuan tetap tersimpan sebagai draft.`
          );
        }
        router.push(`/umkm/submissions/${res.submission.id}`);
      }
    } catch (err: any) {
      console.error("[MerchantSubmissionForm] Save draft error:", err);
      setError("Draf belum dapat disimpan. Coba lagi.");
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
      setError("Pengajuan usaha belum dapat dikirim untuk diperiksa. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseMyLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolokasi tidak didukung oleh browser Anda.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates([pos.coords.longitude, pos.coords.latitude]);
      },
      (geoErr) => {
        console.warn("[MerchantSubmissionForm] Geolocation error:", geoErr);
        setError("Lokasi tidak dapat diperoleh. Silakan klik langsung pada peta.");
      },
      { timeout: 8000 }
    );
  };

  const toggleFacility = (item: string) => {
    setFacilities((prev) =>
      prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item]
    );
  };

  const togglePaymentMethod = (method: "CASH" | "QRIS" | "DEBIT" | "TRANSFER") => {
    setPaymentMethods((prev) => {
      const exists = prev.includes(method as any);
      if (exists) {
        if (prev.length <= 1) return prev; // keep at least one
        return prev.filter((m) => m !== method);
      }
      return [...prev, method as any];
    });
  };

  const isStep3Valid =
    name.trim().length >= 2 &&
    category.trim() !== "" &&
    address.trim() !== "" &&
    coordinates.every(Number.isFinite) &&
    Boolean(photoFile || uploadedPhotoUrl || storedImageUrl);

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 sm:py-8 space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/umkm"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Kembali ke Ruang Usaha</span>
        </Link>
      </div>

      {/* Main Container Card */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-sm text-slate-900">
        {/* Header */}
        <div className="border-b border-slate-100 pb-5 mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
            {mode === "CLAIM" ? "Klaim Usaha" : "Ruang Usaha"}
          </p>
          <h1
            ref={stepHeadingRef}
            tabIndex={-1}
            className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 focus:outline-none"
          >
            {initialData
              ? "Lanjutkan Pendaftaran"
              : mode === "CHOICE" || mode === "CLAIM"
              ? "Daftarkan / Klaim Usaha"
              : registrationStep === 2
              ? "Foto & Detail Usaha"
              : "Daftarkan Usaha"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {mode === "CHOICE" || mode === "CLAIM"
              ? "Cari usaha yang sudah tersedia di GETRA, MAPID, atau Menu Go terlebih dahulu. Jika belum ada, daftarkan usaha baru."
              : registrationStep === 2
              ? "Tambahkan foto dan informasi pendukung agar profil usaha kamu lebih lengkap."
              : "Lengkapi informasi usaha kamu agar bisa ditemukan di GETRA."}
          </p>
        </div>

        {/* Error Alert */}
        {error ? (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center gap-2.5"
          >
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Duplicate Warning */}
        {duplicateWarning ? (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
        ) : null}

        {/* Search First Choice Mode */}
        {mode === "CHOICE" || (mode === "CLAIM" && !selectedClaimMerchant) ? (
          <section className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <label
                htmlFor="claim-merchant-search"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
              >
                Cari nama usaha Anda
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  id="claim-merchant-search"
                  value={claimQuery}
                  onChange={(e) => setClaimQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSearchClaim();
                    }
                  }}
                  placeholder="Contoh: Kopi Tuku, Warung Bu Broto"
                  className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSearchClaim}
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
                >
                  <Search size={16} />
                  <span>Cari Usaha</span>
                </button>
              </div>
            </div>

            {/* Claim Search Results */}
            {claimSearched ? (
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Hasil Pencarian Usaha ({claimResults.length})
                </h3>

                {claimResults.length > 0 ? (
                  <div className="grid gap-3">
                    {claimResults.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{m.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {m.category} {m.address ? `• ${m.address}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedClaimMerchant(m)}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-sky-50 border border-sky-200 px-4 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition"
                        >
                          <BadgeCheck size={14} />
                          <span>Klaim Usaha Ini</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                    Tidak ditemukan usaha dengan nama &ldquo;{claimQuery}&rdquo;.
                  </div>
                )}

                {/* Direct Register Action - Available only after search */}
                <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">
                      Tidak menemukan usaha Anda?
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Daftarkan usaha baru agar lokasi dan informasi tempat usaha Anda tercatat resmi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startRegisterFromSearch}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.99]"
                  >
                    <span>Daftarkan Usaha Baru</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Claim Evidence Form Mode */}
        {mode === "CLAIM" && selectedClaimMerchant ? (
          <section className="space-y-5">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-bold text-sky-800 uppercase tracking-wider">
                Usaha yang Diklaim:
              </p>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {selectedClaimMerchant.name}
              </h3>
              <p className="text-xs text-slate-600">{selectedClaimMerchant.category}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Anda (Pemilik / Pengelola) *
                </label>
                <input
                  type="text"
                  value={claimContactName}
                  onChange={(e) => setClaimContactName(e.target.value)}
                  placeholder="Nama lengkap sesuai KTP"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor WhatsApp / Telepon *
                </label>
                <input
                  type="tel"
                  value={claimContactPhone}
                  onChange={(e) => setClaimContactPhone(e.target.value)}
                  placeholder="081234567890"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hubungan dengan Usaha *
                </label>
                <select
                  value={claimRelationship}
                  onChange={(e) => setClaimRelationship(e.target.value as any)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                >
                  <option value="OWNER">Pemilik Langsung</option>
                  <option value="MANAGER">Pengelola / Manajer</option>
                  <option value="AUTHORIZED_REPRESENTATIVE">Perwakilan Resmi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Keterangan Bukti Kepemilikan (min. 20 karakter) *
                </label>
                <textarea
                  rows={3}
                  value={claimStatement}
                  onChange={(e) => setClaimStatement(e.target.value)}
                  placeholder="Sebutkan bukti hubungan Anda, misalnya NIB, sertifikat, atau bukti izin usaha..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedClaimMerchant(null)}
                className="w-full sm:w-auto min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Pilih Usaha Lain
              </button>
              <button
                type="button"
                onClick={() => handleClaimMerchant(selectedClaimMerchant)}
                disabled={submitting || claimingId === selectedClaimMerchant.id}
                className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-50"
              >
                <BadgeCheck size={16} />
                <span>
                  {claimingId === selectedClaimMerchant.id ? "Memproses..." : "Ajukan Klaim"}
                </span>
              </button>
            </div>
          </section>
        ) : null}

        {/* 3-Step Registration Form Mode (Figma Screens 2, 3, 4) */}
        {mode === "REGISTER" ? (
          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-8"
            aria-label="Formulir pendaftaran usaha"
          >
            {/* Step Navigation Bar */}
            <MerchantRegistrationSteps
              currentStep={registrationStep}
              disabled={submitting}
              onStepChange={(step) => {
                if (validateRegistration(false, registrationStep)) {
                  setRegistrationStep(step);
                }
              }}
            />

            {/* ============================================================ */}
            {/* STEP 1: INFORMASI USAHA (FIGMA SCREEN 2)                      */}
            {/* ============================================================ */}
            {registrationStep === 0 ? (
              <section className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Informasi Usaha</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lengkapi identitas dasar dan karakteristik tempat usaha kamu.
                  </p>
                </div>

                {/* Nama Usaha * */}
                <div>
                  <label
                    htmlFor="merchant-name"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Nama Usaha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="merchant-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Kopi Kenangan Senja"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Kategori Usaha * */}
                <div>
                  <label
                    htmlFor="merchant-category"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Kategori Usaha <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="merchant-category"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jenis Usaha * (Menetap / Keliling) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Jenis Usaha <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBusinessType("MENETAP")}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                        businessType === "MENETAP"
                          ? "border-sky-600 bg-sky-50/80 text-sky-950 ring-1 ring-sky-600"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Building2
                        size={20}
                        className={businessType === "MENETAP" ? "text-sky-600" : "text-slate-400"}
                      />
                      <div>
                        <p className="text-xs font-bold">Menetap</p>
                        <p className="text-[11px] text-slate-500">Toko, warung, atau ruko</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBusinessType("KELILING")}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                        businessType === "KELILING"
                          ? "border-sky-600 bg-sky-50/80 text-sky-950 ring-1 ring-sky-600"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Truck
                        size={20}
                        className={businessType === "KELILING" ? "text-sky-600" : "text-slate-400"}
                      />
                      <div>
                        <p className="text-xs font-bold">Keliling</p>
                        <p className="text-[11px] text-slate-500">Gerobak atau food truck</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Deskripsi Usaha */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor={`merchant-description-${formResetVersion}`}
                      className="text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      Deskripsi Usaha
                    </label>
                    <span className="text-[11px] text-slate-400">Opsional</span>
                  </div>
                  <MerchantDescriptionAssistant
                    id={`merchant-description-${formResetVersion}`}
                    businessName={name}
                    category={category}
                    priceRange={priceRange ?? null}
                    value={description}
                    onChange={setDescription}
                    disabled={submitting}
                  />
                </div>

                {/* Menu Andalan */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="merchant-featured-menu"
                      className="text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      Menu Andalan
                    </label>
                    <span className="text-[11px] text-slate-400">Opsional</span>
                  </div>
                  <input
                    id="merchant-featured-menu"
                    type="text"
                    value={featuredMenu}
                    onChange={(e) => setFeaturedMenu(e.target.value)}
                    placeholder="Contoh: Es Kopi Susu Aren, Bakso Urat Jumbo"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Kisaran Harga (Card Selection) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Kisaran Harga
                    </label>
                    <span className="text-[11px] text-slate-400">Opsional</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "BUDGET" as const, label: "Terjangkau", range: "< Rp20.000" },
                      { id: "STANDARD" as const, label: "Menengah", range: "Rp20rb - Rp50rb" },
                      { id: "PREMIUM" as const, label: "Premium", range: "> Rp50.000" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setPriceRange((current) => (current === item.id ? null : item.id))
                        }
                        className={`rounded-xl border p-3 text-center transition ${
                          priceRange === item.id
                            ? "border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <p className="text-xs font-bold">{item.label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.range}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nav Step 1 */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100">
                  <div className="flex w-full sm:w-auto items-center gap-2">
                    <Link
                      href="/umkm"
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition w-full sm:w-auto"
                    >
                      Batal
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirmation(true)}
                      disabled={submitting || !hasRegistrationInput}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-40 w-full sm:w-auto"
                    >
                      <Trash2 size={14} />
                      <span>Bersihkan Form</span>
                    </button>
                  </div>

                  <div className="flex w-full sm:w-auto items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={submitting}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition w-full sm:w-auto disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>Simpan Draf</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateRegistration(false, 0)) {
                          setRegistrationStep(1);
                        }
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 active:scale-[0.99] w-full sm:w-auto"
                    >
                      <span>Lanjut</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {/* ============================================================ */}
            {/* STEP 2: LOKASI & OPERASIONAL (FIGMA SCREEN 3)                 */}
            {/* ============================================================ */}
            {registrationStep === 1 ? (
              <section className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Lokasi &amp; Operasional</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tentukan alamat, titik koordinat peta, jadwal buka, dan cara pembayaran.
                  </p>
                </div>

                {/* Alamat Usaha * */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="merchant-address"
                      className="text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      Alamat Usaha <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800"
                    >
                      <Locate size={13} />
                      <span>Gunakan Lokasi Saya</span>
                    </button>
                  </div>
                  <textarea
                    id="merchant-address"
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Alamat lengkap, nama jalan, patokan, RT/RW, kelurahan..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {/* Embedded MapLibre Map Picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Titik Pin Peta <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Klik pada peta untuk menaruh atau menggeser pin lokasi tempat usaha kamu.
                  </p>
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <MerchantMapPicker
                      key={`merchant-map-${formResetVersion}`}
                      initialCoordinates={coordinates}
                      onCoordinatesChange={setCoordinates}
                    />
                  </div>
                </div>

                {/* Jam Operasional * */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Jam Operasional <span className="text-rose-500">*</span>
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5">
                    {OPERATING_DAYS.map(([key, label]) => {
                      const daySchedule = openingHours[key];
                      const isClosed = Boolean(daySchedule?.is_closed);

                      return (
                        <div
                          key={key}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                        >
                          <span className="w-20 font-bold text-slate-800">{label}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              disabled={isClosed}
                              value={daySchedule?.opens_at || "08:00"}
                              onChange={(e) =>
                                setOpeningHours((prev) => ({
                                  ...prev,
                                  [key]: {
                                    is_closed: false,
                                    opens_at: e.target.value,
                                    closes_at: daySchedule?.closes_at || "21:00",
                                  },
                                }))
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-900 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                              type="time"
                              disabled={isClosed}
                              value={daySchedule?.closes_at || "21:00"}
                              onChange={(e) =>
                                setOpeningHours((prev) => ({
                                  ...prev,
                                  [key]: {
                                    is_closed: false,
                                    opens_at: daySchedule?.opens_at || "08:00",
                                    closes_at: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-900 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setOpeningHours((prev) => ({
                                  ...prev,
                                  [key]: {
                                    is_closed: !isClosed,
                                    opens_at: daySchedule?.opens_at || "08:00",
                                    closes_at: daySchedule?.closes_at || "21:00",
                                  },
                                }))
                              }
                              className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                                isClosed
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              }`}
                            >
                              {isClosed ? "Tutup" : "Buka"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Metode Pembayaran * */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Metode Pembayaran <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: "CASH" as const, label: "Tunai" },
                      { id: "QRIS" as const, label: "QRIS" },
                      { id: "DEBIT" as const, label: "Debit" },
                      { id: "TRANSFER" as const, label: "Transfer" },
                    ].map((item) => {
                      const isSelected = paymentMethods.includes(item.id as any);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => togglePaymentMethod(item.id)}
                          className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                            isSelected
                              ? "border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <CreditCard
                            size={15}
                            className={isSelected ? "text-sky-600" : "text-slate-400"}
                          />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fasilitas Usaha (Opsional) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Fasilitas Usaha
                    </label>
                    <span className="text-[11px] text-slate-400">Opsional</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: "Tempat Duduk", icon: Utensils },
                      { id: "Take Away", icon: Building2 },
                      { id: "Parkir", icon: Truck },
                      { id: "Wi-Fi", icon: Wifi },
                    ].map((item) => {
                      const isSelected = facilities.includes(item.id);
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleFacility(item.id)}
                          className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                            isSelected
                              ? "border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-600"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <Icon
                            size={15}
                            className={isSelected ? "text-sky-600" : "text-slate-400"}
                          />
                          <span>{item.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nav Step 2 */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRegistrationStep(0)}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition w-full sm:w-auto"
                  >
                    <ArrowLeft size={14} />
                    <span>Kembali</span>
                  </button>

                  <div className="flex w-full sm:w-auto items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={submitting}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition w-full sm:w-auto disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>Simpan Draf</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateRegistration(false, 1)) {
                          setRegistrationStep(2);
                        }
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 active:scale-[0.99] w-full sm:w-auto"
                    >
                      <span>Lanjut</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {/* ============================================================ */}
            {/* STEP 3: FOTO & DETAIL USAHA (FIGMA SCREEN 4)                  */}
            {/* ============================================================ */}
            {registrationStep === 2 ? (
              <section className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Foto &amp; Detail Usaha</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambahkan foto dan informasi pendukung agar profil usaha kamu lebih lengkap.
                  </p>
                </div>

                {/* Upload Foto Utama Usaha * */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Foto Utama Usaha <span className="text-rose-500">*</span>
                  </label>
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
                    {photoPreviewUrl ? (
                      <div className="space-y-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreviewUrl}
                          alt="Foto utama usaha"
                          className="mx-auto h-40 w-full max-w-sm rounded-lg object-cover shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setUploadedPhotoUrl("");
                            setStoredImageUrl("");
                            setPhotoPreviewUrl("");
                            if (photoInputRef.current) photoInputRef.current.value = "";
                          }}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Ganti Foto
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload size={24} className="text-slate-400 mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          Unggah foto tampak depan atau tempat usaha
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Format JPG, PNG, atau WEBP (Maks 5MB)
                        </p>
                        <label className="mt-3 cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-sky-700 shadow-sm hover:bg-slate-50">
                          <span>Pilih Berkas</span>
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setPhotoFile(file);
                                const url = URL.createObjectURL(file);
                                photoObjectUrlRef.current = url;
                                setPhotoPreviewUrl(url);
                              }
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Foto Menu & Poster Promosi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Foto Menu */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Foto Menu
                      </label>
                      <span className="text-[11px] text-slate-400">Opsional</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-center">
                      {menuPhotoPreviewUrl ? (
                        <div className="space-y-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={menuPhotoPreviewUrl}
                            alt="Foto menu"
                            className="mx-auto h-24 w-full rounded object-cover shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setMenuPhotoFile(null);
                              setMenuPhotoUrl("");
                              setMenuPhotoPreviewUrl("");
                              if (menuPhotoInputRef.current) menuPhotoInputRef.current.value = "";
                            }}
                            className="text-[11px] font-semibold text-rose-600"
                          >
                            Hapus Menu
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center py-2">
                          <Utensils size={18} className="text-slate-400 mb-1" />
                          <span className="text-xs font-semibold text-sky-700">
                            Unggah Foto Menu
                          </span>
                          <input
                            ref={menuPhotoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setMenuPhotoFile(file);
                                const url = URL.createObjectURL(file);
                                menuObjectUrlRef.current = url;
                                setMenuPhotoPreviewUrl(url);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Poster Promosi */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Poster Promosi
                      </label>
                      <span className="text-[11px] text-slate-400">Opsional</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-center">
                      {promoPhotoPreviewUrl ? (
                        <div className="space-y-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={promoPhotoPreviewUrl}
                            alt="Poster promosi"
                            className="mx-auto h-24 w-full rounded object-cover shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPromoPhotoPreviewUrl("");
                            }}
                            className="text-[11px] font-semibold text-rose-600"
                          >
                            Hapus Poster
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center py-2">
                          <Sparkles size={18} className="text-slate-400 mb-1" />
                          <span className="text-xs font-semibold text-sky-700">
                            Unggah Poster Promosi
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setPromoPhotoPreviewUrl(url);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kontak & Media Sosial */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Kontak &amp; Media Sosial
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="merchant-phone"
                        className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1"
                      >
                        <Phone size={13} className="text-emerald-600" />
                        <span>Nomor WhatsApp / Telepon</span>
                      </label>
                      <input
                        id="merchant-phone"
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="merchant-instagram"
                        className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1"
                      >
                        <InstagramIcon size={13} className="text-rose-500" />
                        <span>Akun Instagram</span>
                      </label>
                      <input
                        id="merchant-instagram"
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@nama_usaha"
                        className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Catatan Tambahan & Bukti Kepemilikan */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="merchant-notes"
                        className="text-xs font-bold uppercase tracking-wider text-slate-700"
                      >
                        Catatan Tambahan
                      </label>
                      <span className="text-[11px] text-slate-400">Opsional</span>
                    </div>
                    <textarea
                      id="merchant-notes"
                      rows={2}
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Informasi khusus untuk admin verifikasi GETRA..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Bukti Kepemilikan (NIB / KTP / Izin Usaha)
                      </label>
                      <span className="text-[11px] text-slate-400">Opsional</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck size={18} className="text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-600 truncate">
                          {ownershipProofFile ? ownershipProofFile.name : "Belum ada dokumen"}
                        </span>
                      </div>
                      <label className="cursor-pointer inline-flex shrink-0 items-center gap-1 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm hover:bg-slate-50">
                        <span>Pilih Dokumen</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setOwnershipProofFile(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Ringkasan Pendaftaran & Siap Diajukan Badge */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Ringkasan Pendaftaran
                    </h3>
                    {isStep3Valid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        <CheckCircle2 size={13} />
                        <span>Siap Diajukan</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        <HelpCircle size={13} />
                        <span>Lengkapi Data</span>
                      </span>
                    )}
                  </div>

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
                      <span key={key}>
                        {label}:{" "}
                        {openingHours[key]?.is_closed
                          ? "Tutup"
                          : `${openingHours[key]?.opens_at || "Belum diisi"} - ${
                              openingHours[key]?.closes_at || "Belum diisi"
                            }`}
                      </span>
                    ))}
                  />
                </div>

                {/* Nav Step 3 */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRegistrationStep(1)}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition w-full sm:w-auto"
                  >
                    <ArrowLeft size={14} />
                    <span>Kembali</span>
                  </button>

                  <div className="flex w-full sm:w-auto items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={submitting}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition w-full sm:w-auto disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>Simpan Draf</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitForReview}
                      disabled={submitting}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-7 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500 active:scale-[0.99] w-full sm:w-auto disabled:opacity-50"
                    >
                      <Send size={14} />
                      <span>{submitting ? "Memproses..." : "Ajukan Usaha →"}</span>
                      <span className="sr-only">Ajukan Verifikasi</span>
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </form>
        ) : null}
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirmation ? (
        <div
          aria-labelledby="clear-merchant-form-title"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-100">
                <Trash2 size={18} />
              </span>
              <div className="min-w-0">
                <h2
                  className="text-base font-bold text-slate-900"
                  id="clear-merchant-form-title"
                >
                  Bersihkan semua input?
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {initialData
                    ? "Semua isian di layar, lokasi, jadwal, dan foto akan dikosongkan. Draf tersimpan tidak berubah sampai Anda menyimpannya kembali."
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
                className="min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleClearRegistrationForm}
                disabled={submitting}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-500 transition disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>Ya, Bersihkan Form</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InstagramIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
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
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
