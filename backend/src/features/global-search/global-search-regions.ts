export const GLOBAL_SEARCH_REGIONS = [
  { id: "jakarta-barat", name: "Jakarta Barat", aliases: ["jakarta barat", "jakbar"] },
  { id: "jakarta-pusat", name: "Jakarta Pusat", aliases: ["jakarta pusat", "jakpus"] },
  { id: "jakarta-selatan", name: "Jakarta Selatan", aliases: ["jakarta selatan", "jaksel"] },
  { id: "jakarta-timur", name: "Jakarta Timur", aliases: ["jakarta timur", "jaktim"] },
  { id: "jakarta-utara", name: "Jakarta Utara", aliases: ["jakarta utara", "jakut"] },
] as const;

export const GLOBAL_SEARCH_REGION_IDS = GLOBAL_SEARCH_REGIONS.map((region) => region.id);
export const MAX_GLOBAL_SEARCH_REGIONS = GLOBAL_SEARCH_REGIONS.length;

export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("id").replace(/\s+/g, " ");
}

export function findRegionByText(value: string) {
  const normalized = normalizeSearchText(value);
  return GLOBAL_SEARCH_REGIONS.find((region) =>
    region.aliases.some((alias) => alias === normalized)
  ) ?? null;
}

export function extractRegionFromQuery(value: string) {
  const normalized = normalizeSearchText(value);
  const aliases = GLOBAL_SEARCH_REGIONS.flatMap((region) =>
    region.aliases.map((alias) => ({ alias, region })),
  ).sort((left, right) => right.alias.length - left.alias.length);

  for (const candidate of aliases) {
    if (normalized === candidate.alias) {
      return { keyword: null, locationText: candidate.alias, region: candidate.region };
    }
    if (normalized.endsWith(` ${candidate.alias}`)) {
      return {
        keyword: normalized.slice(0, -(candidate.alias.length + 1)).trim() || null,
        locationText: candidate.alias,
        region: candidate.region,
      };
    }
  }
  return null;
}
