export const applicationErrorCodes = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "AUTH_EMAIL_ALREADY_EXISTS",
  "AUTH_EMAIL_CONFIRMATION_REQUIRED",
  "DATABASE_ERROR",
  "DATABASE_UNAVAILABLE",
  "INTERNAL_ERROR",
  "CORS_ORIGIN_DENIED",
  "CORS_PREFLIGHT_DENIED",
  "RATE_LIMIT_EXCEEDED",
  "CONTRIBUTION_RATE_LIMITED",
  "CONTRIBUTION_DUPLICATE",
  "INVALID_OBSERVATION_TIME",
  "INVALID_TARGET_LOCATION",
  "REQUEST_TOO_LARGE",
  "SPATIAL_INVALID_CONFIGURATION",
  "SPATIAL_INVALID_COORDINATE",
  "SPATIAL_INVALID_DISTANCE",
  "SPATIAL_INVALID_GEOMETRY",
  "SPATIAL_INVALID_BBOX",
  "SPATIAL_INVALID_RADIUS",
  "SPATIAL_ENTITY_NOT_FOUND",
  "SPATIAL_QUERY_FAILED",
  "SPATIAL_NETWORK_NOT_READY",
  "SPATIAL_REQUEST_TOO_LARGE",
  "ROUTING_GRAPH_NOT_AVAILABLE",
  "AI_PROVIDER_CONFIGURATION",
  "AI_PROVIDER_UPSTREAM",
  "AI_PROVIDER_UNAVAILABLE",
  "AI_PROVIDER_INVALID_RESPONSE",
  "AI_PROVIDER_TIMEOUT",
] as const;

export type ApplicationErrorCode = (typeof applicationErrorCodes)[number];

const publicMessages: Record<ApplicationErrorCode, string> = {
  CONFLICT: "Perubahan belum dapat disimpan karena data telah berubah. Muat ulang lalu coba lagi.",
  AUTH_EMAIL_ALREADY_EXISTS: "Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.",
  AUTH_EMAIL_CONFIRMATION_REQUIRED: "Periksa email Anda untuk menyelesaikan pendaftaran.",
  AI_PROVIDER_CONFIGURATION: "Asisten sedang tidak dapat digunakan. Coba lagi beberapa saat nanti.",
  AI_PROVIDER_INVALID_RESPONSE: "Jawaban belum dapat disiapkan. Coba lagi.",
  AI_PROVIDER_TIMEOUT: "Asisten membutuhkan waktu terlalu lama untuk menjawab. Coba lagi.",
  AI_PROVIDER_UNAVAILABLE: "Asisten sedang tidak dapat digunakan. Coba lagi beberapa saat nanti.",
  AI_PROVIDER_UPSTREAM: "Asisten belum dapat memproses pertanyaan ini. Coba lagi beberapa saat nanti.",
  CORS_ORIGIN_DENIED: "Permintaan dari halaman ini tidak diizinkan.",
  CORS_PREFLIGHT_DENIED: "Permintaan dari halaman ini tidak diizinkan.",
  CONTRIBUTION_DUPLICATE: "Laporan serupa baru saja dikirim. Periksa laporan Anda sebelum mencoba lagi.",
  CONTRIBUTION_RATE_LIMITED: "Batas pengiriman laporan telah tercapai. Coba lagi nanti.",
  DATABASE_ERROR: "Data belum dapat diproses. Coba lagi.",
  DATABASE_UNAVAILABLE: "Data sedang tidak dapat dimuat. Coba lagi beberapa saat nanti.",
  FORBIDDEN: "Anda tidak memiliki akses untuk melakukan tindakan ini.",
  INVALID_OBSERVATION_TIME: "Waktu pengamatan belum sesuai. Periksa kembali lalu coba lagi.",
  INVALID_TARGET_LOCATION: "Lokasi yang dipilih belum dapat digunakan. Pilih titik lain.",
  INTERNAL_ERROR: "Terjadi kendala saat memuat informasi. Coba lagi.",
  NOT_FOUND: "Informasi yang Anda cari belum ditemukan.",
  RATE_LIMIT_EXCEEDED: "Terlalu banyak permintaan dalam waktu singkat. Coba lagi nanti.",
  REQUEST_TOO_LARGE: "Data yang dikirim terlalu besar. Kurangi ukurannya lalu coba lagi.",
  ROUTING_GRAPH_NOT_AVAILABLE: "Rute belum dapat dihitung saat ini. Coba lagi beberapa saat nanti.",
  SPATIAL_ENTITY_NOT_FOUND: "Tempat yang Anda cari belum ditemukan.",
  SPATIAL_INVALID_BBOX: "Area pencarian belum dapat dikenali. Pilih area lain.",
  SPATIAL_INVALID_CONFIGURATION: "Layanan lokasi sedang tidak dapat digunakan. Coba lagi nanti.",
  SPATIAL_INVALID_COORDINATE: "Lokasi belum dapat dikenali. Pilih titik di peta.",
  SPATIAL_INVALID_DISTANCE: "Jarak yang dipilih belum sesuai. Periksa kembali nilainya.",
  SPATIAL_INVALID_GEOMETRY: "Bentuk area belum dapat dikenali. Pilih area lain.",
  SPATIAL_INVALID_RADIUS: "Jangkauan area belum sesuai. Periksa kembali nilainya.",
  SPATIAL_NETWORK_NOT_READY: "Informasi jaringan belum dapat digunakan. Coba lagi nanti.",
  SPATIAL_QUERY_FAILED: "Informasi lokasi belum dapat dimuat. Coba lagi.",
  SPATIAL_REQUEST_TOO_LARGE: "Area atau data lokasi terlalu besar. Perkecil pilihan lalu coba lagi.",
  UNAUTHORIZED: "Sesi Anda telah berakhir. Silakan masuk kembali.",
  VALIDATION_ERROR: "Informasi yang dimasukkan belum sesuai. Periksa kembali lalu coba lagi.",
};

const httpStatuses: Record<ApplicationErrorCode, number> = {
  CONFLICT: 409,
  AUTH_EMAIL_ALREADY_EXISTS: 409,
  AUTH_EMAIL_CONFIRMATION_REQUIRED: 409,
  AI_PROVIDER_CONFIGURATION: 503,
  AI_PROVIDER_INVALID_RESPONSE: 502,
  AI_PROVIDER_TIMEOUT: 504,
  AI_PROVIDER_UNAVAILABLE: 503,
  AI_PROVIDER_UPSTREAM: 502,
  CORS_ORIGIN_DENIED: 403,
  CORS_PREFLIGHT_DENIED: 403,
  CONTRIBUTION_DUPLICATE: 409,
  CONTRIBUTION_RATE_LIMITED: 429,
  DATABASE_ERROR: 500,
  DATABASE_UNAVAILABLE: 503,
  FORBIDDEN: 403,
  INVALID_OBSERVATION_TIME: 400,
  INVALID_TARGET_LOCATION: 400,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  RATE_LIMIT_EXCEEDED: 429,
  REQUEST_TOO_LARGE: 413,
  ROUTING_GRAPH_NOT_AVAILABLE: 503,
  SPATIAL_ENTITY_NOT_FOUND: 404,
  SPATIAL_INVALID_BBOX: 400,
  SPATIAL_INVALID_CONFIGURATION: 500,
  SPATIAL_INVALID_COORDINATE: 400,
  SPATIAL_INVALID_DISTANCE: 400,
  SPATIAL_INVALID_GEOMETRY: 400,
  SPATIAL_INVALID_RADIUS: 400,
  SPATIAL_NETWORK_NOT_READY: 503,
  SPATIAL_QUERY_FAILED: 500,
  SPATIAL_REQUEST_TOO_LARGE: 413,
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 400,
};

export class ApplicationError extends Error {
  constructor(
    readonly code: ApplicationErrorCode,
    message = publicMessages[code],
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}

export type AiProviderErrorCategory =
  | "configuration"
  | "invalid_response"
  | "timeout"
  | "unavailable"
  | "upstream";

export interface AiProviderErrorOptions {
  category: AiProviderErrorCategory;
  provider: "sub2api" | "openai";
  upstreamCode?: string;
  upstreamMessage?: string;
  upstreamStatus?: number;
}

const providerErrorCodes: Record<AiProviderErrorCategory, ApplicationErrorCode> = {
  configuration: "AI_PROVIDER_CONFIGURATION",
  invalid_response: "AI_PROVIDER_INVALID_RESPONSE",
  timeout: "AI_PROVIDER_TIMEOUT",
  unavailable: "AI_PROVIDER_UNAVAILABLE",
  upstream: "AI_PROVIDER_UPSTREAM",
};

export class AiProviderError extends ApplicationError {
  readonly category: AiProviderErrorCategory;
  readonly provider: "sub2api" | "openai";
  readonly upstreamCode?: string;
  readonly upstreamMessage?: string;
  readonly upstreamStatus?: number;

  constructor(options: AiProviderErrorOptions) {
    const code = providerErrorCodes[options.category];
    super(
      code,
      publicMessages[code],
      options.category === "timeout" || options.category === "unavailable",
    );
    this.name = "AiProviderError";
    this.category = options.category;
    this.provider = options.provider;
    this.upstreamCode = options.upstreamCode;
    this.upstreamMessage = options.upstreamMessage;
    this.upstreamStatus = options.upstreamStatus;
  }
}

export class DatabaseUnavailableError extends ApplicationError {
  constructor() {
    super("DATABASE_UNAVAILABLE", publicMessages.DATABASE_UNAVAILABLE, true);
    this.name = "DatabaseUnavailableError";
  }
}

export type RateLimitSource = "GETRA_RATE_LIMIT" | "SUPABASE_AUTH";

export class RateLimitExceededError extends ApplicationError {
  constructor(
    readonly retryAfterSeconds: number,
    readonly source: RateLimitSource = "GETRA_RATE_LIMIT"
  ) {
    super("RATE_LIMIT_EXCEEDED", publicMessages.RATE_LIMIT_EXCEEDED, true);
    this.name = "RateLimitExceededError";
  }
}

export function getHttpStatusForError(code: ApplicationErrorCode): number {
  return httpStatuses[code];
}

export function getPublicErrorMessage(code: ApplicationErrorCode): string {
  return publicMessages[code];
}

export function toApplicationError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  return new ApplicationError("INTERNAL_ERROR");
}
