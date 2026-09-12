import React, { type ReactNode } from "react";
import { Check } from "lucide-react";

export const MERCHANT_REGISTRATION_STEPS = [
  "Informasi Usaha",
  "Lokasi & Operasional",
  "Foto & Detail",
] as const;

export function MerchantRegistrationSteps({
  currentStep,
  disabled,
  onStepChange,
}: {
  currentStep: number;
  disabled: boolean;
  onStepChange: (step: number) => void;
}) {
  return (
    <nav aria-label="Langkah pendaftaran usaha" className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">
          Langkah {currentStep + 1} dari {MERCHANT_REGISTRATION_STEPS.length}:{" "}
          <span className="font-bold text-slate-900">{MERCHANT_REGISTRATION_STEPS[currentStep] || ""}</span>
        </p>
        <span className="text-[11px] text-slate-400">Data tersimpan otomatis</span>
      </div>
      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {MERCHANT_REGISTRATION_STEPS.map((label, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li key={label} className="min-w-0">
              <button
                aria-current={isCurrent ? "step" : undefined}
                className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition-all disabled:opacity-50 ${
                  isCurrent
                    ? "border-sky-600 bg-sky-50/90 text-sky-950 font-bold ring-1 ring-sky-600 shadow-sm"
                    : isCompleted
                    ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 font-medium hover:bg-emerald-50"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
                disabled={disabled}
                onClick={() => onStepChange(index)}
                type="button"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    isCurrent
                      ? "bg-sky-600 text-white"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : index + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function MerchantRegistrationPreview({
  name,
  category,
  description,
  address,
  coordinates,
  contactPhone,
  priceRange,
  paymentMethods,
  hasPhoto,
  hasMenu,
  operatingHours,
}: {
  name: string;
  category: string;
  description: string;
  address: string;
  coordinates: [number, number];
  contactPhone: string;
  priceRange?: "BUDGET" | "STANDARD" | "PREMIUM" | null;
  paymentMethods: string[];
  hasPhoto: boolean;
  hasMenu: boolean;
  operatingHours: ReactNode;
}) {
  const prices = { BUDGET: "Terjangkau", STANDARD: "Menengah", PREMIUM: "Premium" };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="break-words text-base font-semibold text-slate-900">{name || "Nama usaha belum diisi"}</h3>
      <p className="mt-1 text-xs text-sky-700 font-medium">{category || "Kategori belum dipilih"}</p>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{description || "Deskripsi belum ditambahkan."}</p>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        {[
          ["Alamat", address || "Belum diisi"],
          ["Koordinat", coordinates.join(", ")],
          ["Kontak", contactPhone || "Belum ditambahkan"],
          ["Kisaran harga", priceRange ? prices[priceRange] : "Belum ditentukan"],
          ["Pembayaran", paymentMethods.map((method) => method === "CASH" ? "Tunai" : method).join(", ") || "Belum dipilih"],
          ["Foto", `Foto utama: ${hasPhoto ? "tersedia" : "belum ada"}. Foto menu: ${hasMenu ? "tersedia" : "belum ada"}.`],
        ].map(([label, value]) => (
          <div className="min-w-0" key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-slate-800 font-medium">{value}</dd>
          </div>
        ))}
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Jam operasional</dt>
          <dd className="mt-1 grid gap-1 text-slate-800 font-medium sm:grid-cols-2">{operatingHours}</dd>
        </div>
      </dl>
    </div>
  );
}
