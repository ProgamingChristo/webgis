import type { ReactNode } from "react";

export const MERCHANT_REGISTRATION_STEPS = [
  "Identitas Usaha",
  "Lokasi",
  "Operasional",
  "Menu & Harga",
  "Foto & Preview",
  "Verifikasi",
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
    <nav aria-label="Langkah pendaftaran usaha">
      <p className="mb-3 text-xs text-slate-400">
        Langkah {currentStep + 1} dari {MERCHANT_REGISTRATION_STEPS.length}. Data tetap tersimpan di form saat berpindah langkah.
      </p>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {MERCHANT_REGISTRATION_STEPS.map((label, index) => (
          <li key={label}>
            <button
              aria-current={currentStep === index ? "step" : undefined}
              className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors disabled:opacity-50 ${currentStep === index ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-100" : "border-slate-700 bg-slate-950/40 text-slate-400 hover:text-slate-200"}`}
              disabled={disabled}
              onClick={() => onStepChange(index)}
              type="button"
            >
              <span className="text-emerald-300">{index + 1}</span>
              {label}
            </button>
          </li>
        ))}
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
    <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-4">
      <h3 className="break-words text-base font-semibold text-white">{name || "Nama usaha belum diisi"}</h3>
      <p className="mt-1 text-xs text-emerald-300">{category || "Kategori belum dipilih"}</p>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">{description || "Deskripsi belum ditambahkan."}</p>
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
            <dd className="mt-1 break-words text-slate-200">{value}</dd>
          </div>
        ))}
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Jam operasional</dt>
          <dd className="mt-1 grid gap-1 text-slate-200 sm:grid-cols-2">{operatingHours}</dd>
        </div>
      </dl>
    </div>
  );
}
