"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import type { OwnedMerchantBrief } from "../../types/umkm-workspace.types";
import type {
  AuthoritativeMerchantProfile,
  MenuItem,
  UpdateMerchantProfilePayload,
} from "../../types/merchant-profile.types";
import { OwnerMerchantProfileService } from "../../services/merchant-profile.service";
import { useUmkmIntelligence } from "@/src/features/umkm-intelligence/hooks/use-umkm-intelligence";
import { ProfileHeroSection } from "./profile-hero-section";
import { ProfileIdentityCard } from "./profile-identity-card";
import { ProfileOperatingHoursCard } from "./profile-operating-hours-card";
import { ProfileMenuCatalogCard } from "./profile-menu-catalog-card";
import { ProfileLocationCard } from "./profile-location-card";
import { ProfileFacilitiesCard } from "./profile-facilities-card";
import { ProfileLegalityCard } from "./profile-legality-card";
import {
  getDefaultOperatingHours,
  type WeekSchedule,
} from "../../utils/profile-hours-helper";

export interface OwnerBusinessProfileViewProps {
  merchantBrief: OwnedMerchantBrief;
  onBackToList?: () => void;
  onProfileUpdated?: () => void;
  refreshToken?: unknown;
}

export function OwnerBusinessProfileView({
  merchantBrief,
  onBackToList,
  onProfileUpdated,
  refreshToken,
}: OwnerBusinessProfileViewProps) {
  const [profile, setProfile] = useState<AuthoritativeMerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [operatingHours, setOperatingHours] = useState<WeekSchedule>({});
  const [facilities, setFacilities] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [logoPhotoUrl, setLogoPhotoUrl] = useState<string | null>(null);

  // Status & Feedback
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Intelligence data for transit & readiness
  const intelligence = useUmkmIntelligence(merchantBrief.id, 30, refreshToken);

  const applyProfileData = useCallback((data: AuthoritativeMerchantProfile) => {
    setProfile(data);
    setDescription(data.description || "");
    setPhone(
      data.metadata.phone ||
        (data.metadata.business_info as any)?.contact_phone ||
        ""
    );
    setInstagram(data.metadata.social_media?.instagram || "");
    setOperatingHours(
      (data.opening_hours as WeekSchedule) || getDefaultOperatingHours()
    );
    setFacilities(data.metadata.facilities || ["Tempat Duduk", "Take Away"]);
    setMenuItems(data.metadata.menu_items || []);
    setCoverPhotoUrl(
      data.metadata.public_media?.storefront_url || null
    );
    setLogoPhotoUrl(
      (data.metadata.public_media as any)?.logo_url || null
    );
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function fetchMerchantProfile() {
      try {
        const data = await OwnerMerchantProfileService.getProfile(merchantBrief.id, controller.signal);
        if (ignore) return;
        applyProfileData(data);
        setLoading(false);
      } catch (err: any) {
        if (ignore || controller.signal.aborted) return;
        setFetchError(err.message || "Gagal memuat profil usaha.");
        setLoading(false);
      }
    }

    fetchMerchantProfile();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [merchantBrief.id, applyProfileData]);

  const handleRetry = () => {
    setLoading(true);
    setFetchError(null);
    OwnerMerchantProfileService.getProfile(merchantBrief.id)
      .then((data) => {
        applyProfileData(data);
      })
      .catch((err: any) => {
        setFetchError(err.message || "Gagal memuat profil usaha.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Dirty State Detection
  const isDirty = profile
    ? description !== (profile.description || "") ||
      phone !==
        (profile.metadata.phone ||
          (profile.metadata.business_info as any)?.contact_phone ||
          "") ||
      instagram !== (profile.metadata.social_media?.instagram || "") ||
      JSON.stringify(operatingHours) !==
        JSON.stringify(profile.opening_hours || getDefaultOperatingHours()) ||
      JSON.stringify(facilities) !==
        JSON.stringify(profile.metadata.facilities || ["Tempat Duduk", "Take Away"]) ||
      JSON.stringify(menuItems) !==
        JSON.stringify(profile.metadata.menu_items || []) ||
      coverPhotoUrl !== (profile.metadata.public_media?.storefront_url || null) ||
      logoPhotoUrl !== ((profile.metadata.public_media as any)?.logo_url || null)
    : false;

  const handleResetChanges = () => {
    if (!profile) return;
    setDescription(profile.description || "");
    setPhone(
      profile.metadata.phone ||
        (profile.metadata.business_info as any)?.contact_phone ||
        ""
    );
    setInstagram(profile.metadata.social_media?.instagram || "");
    setOperatingHours(
      (profile.opening_hours as WeekSchedule) || getDefaultOperatingHours()
    );
    setFacilities(profile.metadata.facilities || ["Tempat Duduk", "Take Away"]);
    setMenuItems(profile.metadata.menu_items || []);
    setCoverPhotoUrl(profile.metadata.public_media?.storefront_url || null);
    setLogoPhotoUrl((profile.metadata.public_media as any)?.logo_url || null);
    setSaveError(null);
  };

  const handleUploadCoverPhoto = async (file: File) => {
    setUploadingCover(true);
    setSaveError(null);
    try {
      const res = await OwnerMerchantProfileService.uploadPhoto(file);
      setCoverPhotoUrl(res.image_url);
    } catch (err: any) {
      setSaveError(err.message || "Gagal mengunggah foto sampul.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadLogoPhoto = async (file: File) => {
    setUploadingLogo(true);
    setSaveError(null);
    try {
      const res = await OwnerMerchantProfileService.uploadPhoto(file);
      setLogoPhotoUrl(res.image_url);
    } catch (err: any) {
      setSaveError(err.message || "Gagal mengunggah foto profil usaha.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload: UpdateMerchantProfilePayload = {
        description: description.trim() || undefined,
        opening_hours: operatingHours,
        metadata: {
          phone: phone.trim() || undefined,
          facilities,
          social_media: instagram.trim() ? { instagram: instagram.trim() } : undefined,
          public_media: {
            ...(profile.metadata.public_media || {}),
            storefront_url: coverPhotoUrl,
            logo_url: logoPhotoUrl,
          },
          menu_items: menuItems,
        },
      };

      const updated = await OwnerMerchantProfileService.updateProfile(
        profile.id,
        payload
      );

      setProfile(updated);
      setSaveSuccess(true);
      onProfileUpdated?.();

      setTimeout(() => {
        setSaveSuccess(false);
      }, 5000);
    } catch (err: any) {
      setSaveError(err.message || "Gagal menyimpan perubahan profil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl py-16 px-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 mb-4 animate-pulse">
          <Loader2 size={26} className="animate-spin text-sky-600" />
        </div>
        <h3 className="text-base font-bold text-slate-800">
          Memuat Profil &amp; Operasional Usaha...
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Menghubungkan ke sistem otorisasi pemilik {merchantBrief.name}
        </p>
      </div>
    );
  }

  if (fetchError || !profile) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-rose-50/90 p-6 text-center shadow-sm my-8">
        <AlertCircle size={32} className="mx-auto text-rose-600" />
        <h3 className="mt-3 text-base font-bold text-rose-900">
          Profil Usaha Belum Dapat Dimuat
        </h3>
        <p className="mt-1 text-xs text-rose-700">
          {fetchError || "Data usaha tidak ditemukan atau Anda tidak memiliki akses."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          {onBackToList ? (
            <button
              type="button"
              onClick={onBackToList}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              Kembali ke Daftar Usaha
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-500"
          >
            <RefreshCw size={13} />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Profile Header & Breadcrumb */}
      <div>
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider"
        >
          <Link href="/umkm" className="hover:text-slate-600 transition">
            Beranda
          </Link>
          <span>/</span>
          {onBackToList ? (
            <button
              type="button"
              onClick={onBackToList}
              className="hover:text-slate-600 transition"
            >
              Usaha Saya
            </button>
          ) : (
            <span>Usaha Saya</span>
          )}
          <span>/</span>
          <span className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-none">
            {profile.name}
          </span>
        </nav>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Profil &amp; Operasional Usaha
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Kelola data usaha, jam buka, titik lokasi peta, dan katalog menu yang tampil pada peta publik GETRA.
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={`/app?merchantId=${encodeURIComponent(profile.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
            >
              <span>Pratinjau Publik</span>
              <ExternalLink size={13} />
            </Link>

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving || !isDirty}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition ${
                isDirty
                  ? "bg-sky-600 hover:bg-sky-500 cursor-pointer"
                  : "bg-slate-300 opacity-70 cursor-not-allowed"
              }`}
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : (
                <Save size={13} />
              )}
              <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notifications / Toast */}
      {saveSuccess ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-xs animate-in fade-in slide-in-from-top-2"
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Perubahan profil usaha berhasil disimpan dan disinkronkan ke peta GETRA!</span>
        </div>
      ) : null}

      {saveError ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-xs"
        >
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      ) : null}

      {/* 2. Business Hero Section */}
      <div id="profile-hero">
        <ProfileHeroSection
          profile={profile}
          coverPhotoUrl={coverPhotoUrl}
          onUploadCoverPhoto={handleUploadCoverPhoto}
          uploadingCover={uploadingCover}
          logoPhotoUrl={logoPhotoUrl}
          onUploadLogoPhoto={handleUploadLogoPhoto}
          uploadingLogo={uploadingLogo}
          intelligence={intelligence}
          campaignsCount={merchantBrief.campaigns_count || 0}
        />
      </div>

      {/* 3. Two-Column Operational Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Identitas, Jadwal, Menu (approx 65-70% / 7-8 cols) */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          <div id="profile-identity">
            <ProfileIdentityCard
              name={profile.name}
              category={
                profile.metadata.category_label ||
                (typeof profile.description === "string" && profile.description.includes("·")
                  ? profile.description.split("·")[0]?.trim()
                  : "Makanan & Minuman")
              }
              description={description}
              onDescriptionChange={setDescription}
              phone={phone}
              onPhoneChange={setPhone}
              instagram={instagram}
              onInstagramChange={setInstagram}
              disabled={saving}
            />
          </div>

          <div id="profile-hours">
            <ProfileOperatingHoursCard
              schedule={operatingHours}
              onChange={setOperatingHours}
              disabled={saving}
            />
          </div>

          <div id="profile-menu">
            <ProfileMenuCatalogCard
              items={menuItems}
              onChange={setMenuItems}
              disabled={saving}
            />
          </div>
        </div>

        {/* Right Column: Lokasi, Fasilitas, Legalitas (approx 30-35% / 4-5 cols) */}
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          <div id="profile-location">
            <ProfileLocationCard
              address={profile.address}
              coordinates={profile.location ? profile.location.coordinates : null}
              intelligence={intelligence}
              merchantName={profile.name}
            />
          </div>

          <div id="profile-facilities">
            <ProfileFacilitiesCard
              facilities={facilities}
              onChange={setFacilities}
              disabled={saving}
            />
          </div>

          <div id="profile-legality">
            <ProfileLegalityCard
              merchantId={profile.id}
              isVerified={profile.verification_status === "VERIFIED"}
              submissionId={profile.metadata.submitted_from_id}
            />
          </div>
        </div>
      </div>

      {/* 4. Bottom Sticky Action Bar when Dirty */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            <span>
              Perubahan jam operasional, menu, dan informasi profil akan langsung diperbarui di peta publik GETRA.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleResetChanges}
              disabled={!isDirty || saving}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
            >
              Batalkan
            </button>

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={!isDirty || saving}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition ${
                isDirty
                  ? "bg-sky-600 hover:bg-sky-500"
                  : "bg-slate-300 opacity-60 cursor-not-allowed"
              }`}
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin text-white" />
              ) : (
                <Save size={13} />
              )}
              <span>{saving ? "Menyimpan..." : "Simpan & Terapkan"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
