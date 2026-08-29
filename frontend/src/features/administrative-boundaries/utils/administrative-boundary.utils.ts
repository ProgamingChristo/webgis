import type { MapViewportBounds } from "@/src/services/mapid-layer.service";
import type {
  AdministrativeBoundaryCollection,
  RegionCatalogItem,
  RegionMerchantLike,
  RegionResultGroup,
} from "@/src/features/administrative-boundaries/types/administrative-boundary.types";

export function calculateCombinedBoundaryBounds(
  collection: AdministrativeBoundaryCollection,
): MapViewportBounds | null {
  if (collection.features.length === 0) return null;
  return collection.features.reduce<MapViewportBounds>((combined, feature) => {
    const bounds = feature.properties.bounds;
    return {
      west: Math.min(combined.west, bounds.west),
      south: Math.min(combined.south, bounds.south),
      east: Math.max(combined.east, bounds.east),
      north: Math.max(combined.north, bounds.north),
    };
  }, {
    west: Number.POSITIVE_INFINITY,
    south: Number.POSITIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
  });
}

export function groupMerchantsByRegion<T extends RegionMerchantLike>(
  merchants: T[],
  selectedRegionIds: string[],
  regions: RegionCatalogItem[],
): RegionResultGroup<T>[] {
  const names = new Map(regions.map((region) => [region.id, region.name]));
  const order = new Map(selectedRegionIds.map((id, index) => [id, index]));
  const groups = new Map<string, RegionResultGroup<T>>();
  const seenMerchantIds = new Set<string>();

  for (const regionId of selectedRegionIds) {
    groups.set(regionId, {
      id: regionId,
      name: names.get(regionId) ?? regionId,
      merchants: [],
    });
  }

  for (const merchant of merchants) {
    if (seenMerchantIds.has(merchant.id)) continue;
    seenMerchantIds.add(merchant.id);
    const matchingId = selectedRegionIds.find((id) => merchant.regionIds?.includes(id)) ??
      merchant.regionIds?.[0] ??
      "unidentified";
    const name = names.get(matchingId) ?? merchant.regions?.[0] ?? merchant.city ??
      "Wilayah belum teridentifikasi";
    const group = groups.get(matchingId) ?? { id: matchingId, name, merchants: [] };
    group.merchants.push(merchant);
    groups.set(matchingId, group);
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftOrder = order.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.name.localeCompare(right.name, "id");
  });
}
