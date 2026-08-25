import type {
  CommunityContributionRejectionReason,
  CommunityContributionReportType,
} from "./types/community-contributions.types";

export const CONTRIBUTION_DETAILS_MAX_LENGTH = 500;
export const CONTRIBUTION_PRICE_LEVEL_MAX_LENGTH = 64;
export const CONTRIBUTION_HOURS_KEY_MAX_LENGTH = 32;
export const CONTRIBUTION_HOURS_VALUE_MAX_LENGTH = 128;
export const CONTRIBUTION_HOURS_MAX_ENTRIES = 14;

export const CONTRIBUTION_REPORT_OPTIONS: readonly {
  type: CommunityContributionReportType;
  label: string;
  group: "Aksesibilitas & Infrastruktur" | "Perubahan Data Usaha";
  summary: string;
}[] = [
  {
    type: "SIDEWALK_OBSTRUCTION",
    label: "Trotoar terhalang",
    group: "Aksesibilitas & Infrastruktur",
    summary: "Kendaraan, material, barang dagangan, atau hambatan fisik lain.",
  },
  {
    type: "RAMP_OR_GUIDING_BLOCK",
    label: "Ramp atau guiding block",
    group: "Aksesibilitas & Infrastruktur",
    summary: "Pilih fasilitas ramp atau guiding block, lalu jelaskan kondisi.",
  },
  {
    type: "CROSSING",
    label: "Penyeberangan",
    group: "Aksesibilitas & Infrastruktur",
    summary: "Laporkan kondisi penyeberangan yang perlu diperiksa.",
  },
  {
    type: "MERCHANT_LOCATION_CHANGED",
    label: "Lokasi usaha berpindah",
    group: "Perubahan Data Usaha",
    summary: "Pilih usaha canonical dan laporkan titik lokasi barunya.",
  },
  {
    type: "MERCHANT_PRICE_CHANGED",
    label: "Perubahan harga",
    group: "Perubahan Data Usaha",
    summary: "Pilih usaha canonical dan tulis harga yang diamati.",
  },
  {
    type: "MERCHANT_HOURS_CHANGED",
    label: "Perubahan jam buka",
    group: "Perubahan Data Usaha",
    summary: "Pilih usaha canonical dan isi jam buka yang dilaporkan.",
  },
] as const;

export const CONTRIBUTION_REPORT_LABELS: Record<
  CommunityContributionReportType,
  string
> = Object.fromEntries(
  CONTRIBUTION_REPORT_OPTIONS.map((option) => [option.type, option.label]),
) as Record<CommunityContributionReportType, string>;

export const CONTRIBUTION_REJECTION_REASON_LABELS: Record<
  CommunityContributionRejectionReason,
  string
> = {
  DUPLICATE: "Laporan duplikat",
  INSUFFICIENT_INFORMATION: "Informasi belum cukup",
  INVALID_LOCATION: "Lokasi tidak valid",
  INVALID_TARGET: "Target tidak sesuai",
  OUTDATED_INFORMATION: "Informasi sudah tidak mutakhir",
  OTHER: "Alasan lain",
};

export const CONTRIBUTION_REJECTION_REASON_OPTIONS = Object.entries(
  CONTRIBUTION_REJECTION_REASON_LABELS,
).map(([value, label]) => ({
  value: value as CommunityContributionRejectionReason,
  label,
}));

export const DEFAULT_CONTRIBUTION_LOCATION = {
  longitude: 106.8272,
  latitude: -6.1754,
} as const;

export const OPENING_HOUR_DAY_OPTIONS = [
  { key: "monday", label: "Senin" },
  { key: "tuesday", label: "Selasa" },
  { key: "wednesday", label: "Rabu" },
  { key: "thursday", label: "Kamis" },
  { key: "friday", label: "Jumat" },
  { key: "saturday", label: "Sabtu" },
  { key: "sunday", label: "Minggu" },
] as const;
