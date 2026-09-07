import type { AdvertisingEligibilityResult } from "../types/advertising-eligibility.types";

type IneligibilityReason = Extract<AdvertisingEligibilityResult, { eligible: false }>["reason"];

// Presentation of API decisions only; eligibility rules remain on the backend.
export function getPromotionRequirement(reason: IneligibilityReason) {
  const messages: Record<IneligibilityReason, { detail: string; action: string; destination: "workspace" | "visibility" | "registration" | "profile" | "login" }> = {
    UNAUTHENTICATED: { detail: "Masuk ke akun Anda untuk memeriksa kesiapan promosi.", action: "Masuk", destination: "login" },
    UMKM_MODE_REQUIRED: { detail: "Aktifkan mode UMKM di profil untuk mengelola promosi.", action: "Buka profil", destination: "profile" },
    MERCHANT_NOT_FOUND: { detail: "Usaha ini tidak ditemukan. Pilih usaha yang tersedia di Usaha Saya.", action: "Kembali ke Usaha Saya", destination: "workspace" },
    OWNERSHIP_REQUIRED: { detail: "Kepemilikan usaha belum terhubung ke akun Anda. Ajukan klaim untuk diperiksa admin.", action: "Daftarkan / Klaim Usaha", destination: "registration" },
    OWNERSHIP_PENDING: { detail: "Klaim kepemilikan sedang diperiksa. Promosi tersedia setelah kepemilikan diverifikasi.", action: "Lihat status pengajuan", destination: "workspace" },
    MERCHANT_INACTIVE: { detail: "Usaha belum aktif atau belum dipublikasikan. Periksa status usaha dan tindak lanjuti melalui admin.", action: "Periksa status usaha", destination: "visibility" },
    MERCHANT_UNVERIFIED: { detail: "Usaha belum terverifikasi. Tunggu hasil pemeriksaan admin sebelum membuat promosi.", action: "Lihat status usaha", destination: "visibility" },
    GEOMETRY_INVALID: { detail: "Koordinat usaha belum valid. Periksa lokasi usaha sebelum membuat promosi.", action: "Periksa lokasi usaha", destination: "visibility" },
    PROFILE_INCOMPLETE: { detail: "Data profil usaha belum memenuhi persyaratan promosi. Periksa bagian yang perlu dilengkapi.", action: "Periksa profil usaha", destination: "visibility" },
  };
  return messages[reason];
}

export function promotionRequirementHref(destination: ReturnType<typeof getPromotionRequirement>["destination"], merchantId: string) {
  if (destination === "login") return "/login";
  if (destination === "profile") return "/settings/profile";
  if (destination === "registration") return "/umkm/merchants/new";
  return `/umkm?merchantId=${encodeURIComponent(merchantId)}#${destination === "visibility" ? "visibilitas" : "usaha-saya"}`;
}
