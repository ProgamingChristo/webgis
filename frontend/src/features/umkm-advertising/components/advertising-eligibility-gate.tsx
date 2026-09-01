"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useAdvertisingEligibility } from "../hooks/use-advertising-eligibility";

export function AdvertisingEligibilityGate({
  merchantId,
  children,
  onClaimSuccess,
}: {
  merchantId: string;
  children?: React.ReactNode;
  onClaimSuccess?: () => void;
}) {
  const { eligibility, loading, error } = useAdvertisingEligibility(merchantId);
  void onClaimSuccess;

  const notice = (title: string, detail?: string, action?: React.ReactNode) => (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-950/80 p-5 text-slate-200">
      <h2 className="font-bold text-slate-100">{title}</h2>
      {detail && <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>}
      {action}
    </section>
  );

  if (loading) {
    return notice("Memeriksa akses Advertising & Promosi...", "GETRA sedang memvalidasi mode UMKM dan kepemilikan merchant.");
  }

  if (error) {
    return notice("Akses belum dapat diperiksa", error);
  }

  if (!eligibility) {
    return null;
  }

  if (eligibility.eligible) {
    return (
      <div className="rounded-2xl border border-emerald-400/20 bg-slate-950/80 p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-800 pb-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300" aria-hidden="true"><Check size={16} /></span>
          <div className="min-w-0">
            <p className="break-words font-bold text-slate-100">Merchant siap beriklan</p>
            <p className="text-xs text-slate-400">Akses dan kepemilikan sudah terverifikasi.</p>
          </div>
        </div>
        {children}
      </div>
    );
  }

  switch (eligibility.reason) {
    case "UNAUTHENTICATED":
      return notice("Login diperlukan", "Silakan login untuk mengakses Advertising & Promosi.");
    case "UMKM_MODE_REQUIRED":
      return notice("Mode UMKM diperlukan", "Aktifkan mode UMKM pada profil untuk menggunakan Advertising & Promosi.");
    case "OWNERSHIP_REQUIRED":
      return (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-400/20 text-amber-300">!</span>
            <div>
              <p className="font-bold text-amber-100">Klaim kepemilikan merchant diperlukan</p>
              <p className="mt-1 text-xs leading-5 text-amber-200/80">
                Akun Anda belum terdaftar sebagai pemilik merchant ini. Ajukan klaim terlebih dahulu agar promosi spasial hanya dikelola oleh owner yang sah.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/umkm/merchants/new"
              className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs font-black text-slate-950 transition hover:brightness-110 disabled:opacity-50"
            >
              Daftarkan / Klaim Usaha
            </Link>
          </div>
        </div>
      );
    case "OWNERSHIP_PENDING":
      return notice("Klaim sedang ditinjau", "Advertising & Promosi akan tersedia setelah kepemilikan diverifikasi.");
    case "MERCHANT_INACTIVE":
      return notice("Merchant sedang tidak aktif");
    case "MERCHANT_UNVERIFIED":
      return notice("Usaha belum terverifikasi", "Promosi tersedia setelah validitas merchant dan kepemilikan selesai diverifikasi.");
    case "GEOMETRY_INVALID":
      return notice("Lokasi merchant belum valid", "Lengkapi koordinat merchant sebelum membuat promosi spasial.");
    case "PROFILE_INCOMPLETE":
      return notice("Profil merchant belum lengkap");
    default:
      return notice("Merchant belum memenuhi syarat untuk promosi spasial");
  }
}
