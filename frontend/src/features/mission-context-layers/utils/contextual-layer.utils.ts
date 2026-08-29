import type {
  ActivityCategory,
  ContextualLayerKey,
  ContextualLayerVisibility,
  ContextualObservationProperties,
} from "@/src/features/mission-context-layers/types/contextual-layer.types";

export const DEFAULT_CONTEXTUAL_LAYER_VISIBILITY: ContextualLayerVisibility = {
  merchant: true,
  property: false,
  transaction: false,
  activities: false,
  boundary: true,
};

export function setContextualLayerVisibility(
  state: ContextualLayerVisibility,
  layer: ContextualLayerKey,
  visible: boolean,
): ContextualLayerVisibility {
  return { ...state, [layer]: visible };
}

export function formatObservationFreshness(
  properties: Pick<ContextualObservationProperties, "freshness_status" | "observed_at">,
): string {
  if (properties.observed_at) {
    const date = new Date(properties.observed_at);
    if (!Number.isNaN(date.getTime())) {
      return `Diamati ${new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date)}`;
    }
  }
  if (properties.freshness_status === "STALE") return "Perlu konfirmasi ulang";
  return "Waktu observasi belum tersedia";
}

export function activityCategoryLabel(category: ActivityCategory): string {
  return {
    TRANSIT_OBSERVATION: "Observasi transit",
    ACCESSIBILITY_OBSERVATION: "Observasi aksesibilitas",
    PEDESTRIAN_OBSERVATION: "Observasi pedestrian",
    ECONOMIC_UMKM_OBSERVATION: "Observasi ekonomi/UMKM",
    AREA_OBSERVATION: "Observasi area",
    UNCLASSIFIED: "Observasi lapangan",
  }[category];
}

export function verificationLabel(value: string): string {
  return {
    SOURCE_OBSERVED: "Observasi sumber",
    VERIFIED: "Terverifikasi",
    NEEDS_REVIEW: "Perlu ditinjau",
    UNVERIFIED: "Belum diverifikasi",
    IMPORTED: "Diimpor",
  }[value] ?? "Status sumber";
}
