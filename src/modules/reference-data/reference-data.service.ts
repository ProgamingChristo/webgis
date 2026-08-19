import "server-only";

export const TRANSPORT_MODES = [
  "KRL",
  "MRT",
  "TRANSJAKARTA",
  "BUS",
  "WALK",
  "OTHER",
] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number];

export const UMKM_CATEGORIES = ["FOOD", "RETAIL", "SERVICE", "OTHER"] as const;

export type UmkmCategory = (typeof UMKM_CATEGORIES)[number];

export class ReferenceDataService {
  getTransportModes(): readonly TransportMode[] {
    return TRANSPORT_MODES;
  }

  getUmkmCategories(): readonly UmkmCategory[] {
    return UMKM_CATEGORIES;
  }

  isValidTransportMode(mode: string): mode is TransportMode {
    return TRANSPORT_MODES.includes(mode as TransportMode);
  }

  isValidUmkmCategory(category: string): category is UmkmCategory {
    return UMKM_CATEGORIES.includes(category as UmkmCategory);
  }
}
