"use client";

import { AtSign, Building2, Lock, Phone } from "lucide-react";

export interface ProfileIdentityCardProps {
  name: string;
  category: string;
  description: string;
  onDescriptionChange: (val: string) => void;
  phone: string;
  onPhoneChange: (val: string) => void;
  instagram: string;
  onInstagramChange: (val: string) => void;
  disabled?: boolean;
}

export function ProfileIdentityCard({
  name,
  category,
  description,
  onDescriptionChange,
  phone,
  onPhoneChange,
  instagram,
  onInstagramChange,
  disabled = false,
}: ProfileIdentityCardProps) {
  const maxChar = 200;
  const currentLength = description.length;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-all sm:p-7">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 text-sky-600">
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Identitas Gerai
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Informasi Usaha &amp; Kontak
            </h2>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
          Ditinjau Reguler
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {/* Nama Usaha Resmi */}
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="identity-merchant-name"
              className="text-xs font-bold text-slate-700 uppercase tracking-wider"
            >
              Nama Usaha Resmi
            </label>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Lock size={11} /> Terkunci (Sesuai Izin Admin)
            </span>
          </div>
          <div className="relative mt-1.5">
            <input
              id="identity-merchant-name"
              type="text"
              value={name}
              readOnly
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-2.5 text-sm font-semibold text-slate-800 cursor-not-allowed opacity-90 shadow-inner"
            />
          </div>
        </div>

        {/* Kategori Usaha */}
        <div>
          <label
            htmlFor="identity-merchant-category"
            className="text-xs font-bold text-slate-700 uppercase tracking-wider"
          >
            Kategori Usaha
          </label>
          <div className="mt-1.5">
            <input
              id="identity-merchant-category"
              type="text"
              value={category}
              readOnly
              disabled
              className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-4 py-2.5 text-sm font-semibold text-slate-800 cursor-not-allowed opacity-90 shadow-inner"
            />
          </div>
        </div>

        {/* Deskripsi Singkat / Bio Tampilan Peta */}
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="identity-merchant-description"
              className="text-xs font-bold text-slate-700 uppercase tracking-wider"
            >
              Deskripsi Singkat / Bio Tampilan Peta
            </label>
            <span
              className={`text-[11px] font-medium ${
                currentLength > maxChar ? "text-rose-600 font-bold" : "text-slate-400"
              }`}
            >
              {currentLength} / {maxChar} Karakter
            </span>
          </div>
          <div className="mt-1.5">
            <textarea
              id="identity-merchant-description"
              rows={3}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              disabled={disabled}
              placeholder="Jelaskan keunikan usaha Anda, menu favorit, dan suasana gerai untuk calon pelanggan..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm leading-6 text-slate-800 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none disabled:bg-slate-50"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Deskripsi ini akan tampil di panel detail tempat pada peta publik GETRA saat komuter memilih usaha Anda.
          </p>
        </div>

        {/* Kontak & Media Sosial */}
        <div className="border-t border-slate-100 pt-4">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Tautan &amp; Layanan Kontak Pelanggan
          </span>
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* WhatsApp / Telepon */}
            <div className="relative">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                WhatsApp / Kontak Resmi
              </span>
              <div className="relative mt-1 flex items-center">
                <div className="absolute left-3 text-slate-400">
                  <Phone size={14} />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => onPhoneChange(e.target.value)}
                  disabled={disabled}
                  placeholder="+62 812-xxxx-xxxx"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Instagram */}
            <div className="relative">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Instagram Resmi
              </span>
              <div className="relative mt-1 flex items-center">
                <div className="absolute left-3 text-slate-400">
                  <AtSign size={14} />
                </div>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => onInstagramChange(e.target.value)}
                  disabled={disabled}
                  placeholder="@namausaha"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 shadow-sm transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
