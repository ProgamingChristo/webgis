"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  Camera,
  Clock3,
  Loader2,
  MapPin,
  Megaphone,
  Radio,
  ShieldAlert,
  Sparkles,
  Store,
} from "lucide-react";
import type { AuthoritativeMerchantProfile } from "../../types/merchant-profile.types";
import type { useUmkmIntelligence } from "@/src/features/umkm-intelligence/hooks/use-umkm-intelligence";
import { evaluateStoreStatus } from "../../utils/profile-hours-helper";

export interface ProfileHeroSectionProps {
  profile: AuthoritativeMerchantProfile;
  coverPhotoUrl: string | null;
  onUploadCoverPhoto: (file: File) => Promise<void>;
  uploadingCover: boolean;
  intelligence: ReturnType<typeof useUmkmIntelligence>;
  campaignsCount: number;
  logoPhotoUrl?: string | null;
  onUploadLogoPhoto?: (file: File) => Promise<void>;
  uploadingLogo?: boolean;
}

export function ProfileHeroSection({
  profile,
  coverPhotoUrl,
  onUploadCoverPhoto,
  uploadingCover,
  intelligence,
  campaignsCount,
  logoPhotoUrl,
  onUploadLogoPhoto,
  uploadingLogo = false,
}: ProfileHeroSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [imgError, setImgError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [coverPhotoUrl]);

  useEffect(() => {
    setLogoError(false);
  }, [logoPhotoUrl]);

  const intelData = intelligence.data;
  const storeStatus = evaluateStoreStatus(profile.opening_hours);

  const isVerified = profile.verification_status === "VERIFIED";
  const isPublished = profile.publish_status === "PUBLISHED";

  const registeredYear = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("id-ID", {
        month: "short",
        year: "numeric",
      })
    : null;

  const categoryLabel =
    profile.metadata.category_label ||
    (typeof profile.description === "string" && profile.description.includes("·")
      ? profile.description.split("·")[0]?.trim()
      : "Usaha Kuliner & Retail");

  const nearestTransit = intelData?.location_context?.nearest_transit;
  const transitLabel = nearestTransit
    ? `${nearestTransit.network_distance_meters}m (${Math.ceil(nearestTransit.network_walking_seconds / 60)} mnt) ke ${nearestTransit.name}`
    : "Data transit sekitar memadai";

  const readinessStatus = intelData?.data_readiness?.status;
  const readinessLabel =
    readinessStatus === "READY"
      ? "Profil Siap"
      : readinessStatus === "DEVELOPING"
      ? "Perlu Dilengkapi"
      : readinessStatus === "INCOMPLETE"
      ? "Belum Lengkap"
      : "Profil Terdaftar";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadCoverPhoto(file);
      setImgError(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition-all">
      {/* Cover / Storefront Banner */}
      <div className="relative h-48 w-full bg-gradient-to-r from-slate-800 via-slate-900 to-sky-950 sm:h-64 md:h-72">
        {coverPhotoUrl && !imgError ? (
          <Image
            src={coverPhotoUrl}
            alt={`Foto gerai ${profile.name}`}
            fill
            unoptimized
            className="object-cover"
            priority
            onError={() => setImgError(true)}
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Store size={44} strokeWidth={1.5} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">
                Foto sampul belum diunggah
              </span>
            </div>
          </div>
        )}

        {/* Subtle Dark Gradient Overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

        {/* Change Cover Button */}
        <div className="absolute top-4 right-4 z-10">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploadingCover}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingCover}
            aria-label="Ganti sampul usaha"
            className="inline-flex items-center gap-2 rounded-xl bg-black/60 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-black/80 hover:shadow disabled:opacity-50"
          >
            {uploadingCover ? (
              <Loader2 size={14} className="animate-spin text-sky-400" />
            ) : (
              <Camera size={14} />
            )}
            <span>{uploadingCover ? "Mengunggah..." : "Ganti Sampul"}</span>
          </button>
        </div>
      </div>

      {/* Hero Body */}
      <div className="relative px-5 pt-4 pb-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {/* Avatar + Main Title Info */}
          <div className="flex items-start gap-4">
            {/* Avatar Pill */}
            <div className="-mt-14 group relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-sky-600 text-white shadow-md sm:h-24 sm:w-24 overflow-hidden">
              {logoPhotoUrl && !logoError ? (
                <Image
                  src={logoPhotoUrl}
                  alt={`Logo ${profile.name}`}
                  fill
                  unoptimized
                  className="object-cover"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Store size={36} />
              )}

              {onUploadLogoPhoto ? (
                <>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await onUploadLogoPhoto(file);
                        setLogoError(false);
                        if (logoInputRef.current) logoInputRef.current.value = "";
                      }
                    }}
                    disabled={uploadingLogo}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    title="Ganti logo / foto profil usaha"
                    aria-label="Ganti logo / foto profil usaha"
                    className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition group-hover:opacity-100 disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingLogo ? (
                      <Loader2 size={16} className="animate-spin text-white" />
                    ) : (
                      <Camera size={16} className="text-white" />
                    )}
                  </button>
                </>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {profile.name}
                </h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <BadgeCheck size={14} className="text-emerald-600" />
                    TERVERIFIKASI GETRA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <ShieldAlert size={14} className="text-amber-600" />
                    Verifikasi perlu diperiksa
                  </span>
                )}
              </div>

              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">{categoryLabel}</span>
                {registeredYear ? <span>• Terdaftar sejak {registeredYear}</span> : null}
                {profile.address ? (
                  <span className="hidden items-center gap-1 sm:inline-flex text-slate-500">
                    • <MapPin size={11} /> {profile.address}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {/* Real-time Store Status Indicator */}
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800">
              <span
                className={`h-2 w-2 rounded-full ${
                  storeStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>Status Toko: {storeStatus.isOpen ? "Buka" : "Tutup"}</span>
            </div>
            <p className="text-[11px] text-slate-500">{storeStatus.todayLabel}</p>
          </div>
        </div>

        {/* Truthful High-Level Status Metric Bar */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Sparkles size={12} className="text-sky-600" />
              <span>Kesiapan Usaha</span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-900">{readinessLabel}</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Radio size={12} className="text-emerald-600" />
              <span>Visibilitas Peta</span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-emerald-700">
              {isPublished ? "Tayang di GETRA" : "Belum Publik"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Clock3 size={12} className="text-indigo-600" />
              <span>Akses Transit</span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-900 truncate" title={transitLabel}>
              {nearestTransit ? `${nearestTransit.network_distance_meters}m transit` : "Tersedia di peta"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <Megaphone size={12} className="text-sky-600" />
              <span>Promosi Aktif</span>
            </div>
            <p className="mt-1.5 text-sm font-bold text-slate-900">
              {campaignsCount > 0 ? `${campaignsCount} Kampanye` : "0 Kampanye"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
