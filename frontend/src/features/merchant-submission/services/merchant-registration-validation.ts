import type { MerchantOperatingHours } from "../types/merchant-submission.types";

export const OPERATING_DAYS = [
  ["monday", "Senin"], ["tuesday", "Selasa"], ["wednesday", "Rabu"],
  ["thursday", "Kamis"], ["friday", "Jumat"], ["saturday", "Sabtu"], ["sunday", "Minggu"],
] as const;

interface RegistrationValidationInput {
  name: string;
  category: string;
  address: string;
  coordinates: [number, number];
  openingHours: MerchantOperatingHours;
  hasPhoto: boolean;
  contactPhone: string;
}

/** Keep draft/review rules shared with step navigation; the API remains authoritative. */
export function getRegistrationValidationIssue(
  input: RegistrationValidationInput,
  requirePhoto: boolean,
  currentStep?: number,
): { step: number; message: string } | null {
  const appliesTo = (step: number) => currentStep === undefined || currentStep === step;
  if (appliesTo(0)) {
    if (input.name.trim().length < 2) return { step: 0, message: "Nama usaha minimal 2 karakter." };
    if (!input.category.trim()) return { step: 0, message: "Kategori usaha wajib dipilih." };
  }
  if (appliesTo(1)) {
    if (!input.address.trim()) return { step: 1, message: "Alamat atau patokan lokasi wajib diisi." };
    if (!input.coordinates.every(Number.isFinite)) {
      return { step: 1, message: "Titik lokasi usaha belum valid. Klik peta atau gunakan lokasi Anda." };
    }
  }
  if (appliesTo(2)) {
    const invalidDay = OPERATING_DAYS.find(([key]) => {
      const hours = input.openingHours[key];
      return !hours?.is_closed && (!hours?.opens_at || !hours?.closes_at || hours.opens_at >= hours.closes_at);
    });
    if (invalidDay) return { step: 2, message: `Jam buka ${invalidDay[1]} harus lebih awal dari jam tutup.` };
    if (input.contactPhone.trim() && input.contactPhone.trim().length < 8) {
      return { step: 2, message: "Nomor kontak usaha minimal 8 karakter." };
    }
  }
  if (appliesTo(4) && requirePhoto && !input.hasPhoto) {
    return { step: 4, message: "Foto utama tempat usaha wajib diupload sebelum ajukan verifikasi." };
  }
  return null;
}
