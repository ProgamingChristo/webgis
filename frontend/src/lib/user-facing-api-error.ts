type UserFacingApiErrorInput = {
  code?: string | null;
  status?: number;
  fallback?: string;
};

const EXACT_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Silakan masuk untuk melanjutkan.",
  UNAUTHORIZED: "Silakan masuk untuk melanjutkan.",
  FORBIDDEN: "Anda tidak memiliki akses untuk tindakan ini.",
  NOT_FOUND: "Informasi yang Anda cari tidak ditemukan.",
  VALIDATION_ERROR: "Periksa kembali informasi yang Anda masukkan.",
  INVALID_RESPONSE: "Informasi belum dapat dimuat. Coba lagi.",
  RATE_LIMITED: "Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.",
  AI_RATE_LIMITED: "Terlalu banyak pertanyaan. Tunggu sebentar, lalu coba lagi.",
  INSUFFICIENT_CONTEXT: "Pilih lokasi atau area terlebih dahulu, lalu coba lagi.",
  GROUNDING_DATA_UNAVAILABLE: "Data untuk menjawab pertanyaan ini belum cukup. Coba pilih area lain.",
};

export function getUserFacingApiError({
  code,
  status,
  fallback = "Informasi belum dapat dimuat. Coba lagi.",
}: UserFacingApiErrorInput): string {
  const normalizedCode = code?.trim().toUpperCase();

  if (normalizedCode && EXACT_MESSAGES[normalizedCode]) {
    return EXACT_MESSAGES[normalizedCode];
  }

  if (normalizedCode?.startsWith("AI_PROVIDER")) {
    return "Asisten belum dapat menjawab. Coba lagi sebentar lagi.";
  }

  if (
    normalizedCode?.startsWith("ROUTING") ||
    normalizedCode?.startsWith("SPATIAL")
  ) {
    return "Informasi lokasi atau rute belum dapat dimuat. Coba lagi.";
  }

  if (status === 401) return EXACT_MESSAGES.UNAUTHORIZED;
  if (status === 403) return EXACT_MESSAGES.FORBIDDEN;
  if (status === 404) return EXACT_MESSAGES.NOT_FOUND;
  if (status === 400 || status === 422) return EXACT_MESSAGES.VALIDATION_ERROR;
  if (status === 429) return EXACT_MESSAGES.RATE_LIMITED;
  if (status && status >= 500) return "Layanan sedang bermasalah. Coba lagi sebentar lagi.";

  return fallback;
}
