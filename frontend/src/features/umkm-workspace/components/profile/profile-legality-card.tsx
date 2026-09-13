"use client";

import { Award, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";

export interface ProfileLegalityCardProps {
  merchantId: string;
  isVerified: boolean;
  submissionId?: string;
}

export function ProfileLegalityCard({
  merchantId,
  isVerified,
  submissionId,
}: ProfileLegalityCardProps) {
  // Format masked reference code
  const rawId = submissionId || merchantId;
  const hexClean = rawId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const prefix = hexClean.slice(0, 4) || "1289";
  const suffix = hexClean.slice(-2) || "44";

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all sm:p-7">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
          <FileCheck2 size={20} />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Kepatuhan UMKM
          </span>
          <h2 className="text-base font-bold text-slate-900">
            Legalitas &amp; Kemitraan
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* Verification Identifier */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Nomor Registrasi / ID Usaha
            </span>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                <CheckCircle2 size={11} /> Terdaftar Resmi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/70 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Verifikasi Berjalan
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-base font-bold tracking-wider text-slate-900">
              {prefix} •••• •••• {suffix}
            </span>
            <span className="text-[10px] font-medium text-slate-500">GETRA UMKM</span>
          </div>
        </div>

        {/* Partnership Status */}
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/70 to-indigo-50/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
              <Award size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                Status Kemitraan
              </span>
              <p className="text-xs font-bold text-slate-900">
                {isVerified
                  ? "Mitra Resmi Koridor Transit"
                  : "Mitra Terdaftar GETRA"}
              </p>
            </div>
          </div>
        </div>

        {/* Safety Note */}
        <div className="flex items-start gap-2 text-[11px] leading-5 text-slate-500 pt-1">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Data legalitas dan kepemilikan usaha terproteksi dan diawasi oleh standar verifikasi GETRA UMKM.
          </span>
        </div>
      </div>
    </div>
  );
}
