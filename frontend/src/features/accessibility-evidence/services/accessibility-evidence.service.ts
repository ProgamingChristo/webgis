import { apiClient } from "@/src/lib/api-client";
import type {
  AccessibilityEvidenceDetail,
  AccessibilityEvidenceQuery,
  AccessibilityEvidenceResult,
  AccessibilityNeedSummary,
} from "@/src/features/accessibility-evidence/types/accessibility-evidence.types";

const evidenceCache = new Map<string, AccessibilityEvidenceResult>();
const needCache = new Map<string, AccessibilityNeedSummary>();
const MAX_CACHE_ENTRIES = 30;

function buildParams(
  query: AccessibilityEvidenceQuery,
  options: { includePagination?: boolean } = { includePagination: true },
): URLSearchParams {
  const params = new URLSearchParams({
    east: String(query.bbox.east),
    north: String(query.bbox.north),
    south: String(query.bbox.south),
    west: String(query.bbox.west),
  });
  if (options.includePagination !== false) {
    params.set("limit", String(query.limit ?? 100));
    params.set("offset", String(query.offset ?? 0));
  }
  if (query.source_type) params.set("source_type", query.source_type);
  if (query.category) params.set("category", query.category);
  if (query.validation_status) params.set("validation_status", query.validation_status);
  if (query.days) params.set("days", String(query.days));
  return params;
}

function cacheKey(query: AccessibilityEvidenceQuery): string {
  return buildParams(query).toString();
}

function setLimitedCache<T>(cache: Map<string, T>, key: string, value: T): T {
  cache.set(key, value);
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return value;
}

export const accessibilityEvidenceService = {
  list(
    query: AccessibilityEvidenceQuery,
    signal?: AbortSignal,
  ): Promise<AccessibilityEvidenceResult> {
    const key = cacheKey(query);
    const cached = evidenceCache.get(key);
    if (cached) return Promise.resolve(cached);
    return apiClient.get<AccessibilityEvidenceResult>(
      `/api/accessibility/evidence?${buildParams(query).toString()}`,
      { signal },
    ).then((result) => setLimitedCache(evidenceCache, key, result));
  },

  need(
    query: AccessibilityEvidenceQuery,
    signal?: AbortSignal,
  ): Promise<AccessibilityNeedSummary> {
    const key = cacheKey({ ...query, limit: undefined, offset: undefined });
    const cached = needCache.get(key);
    if (cached) return Promise.resolve(cached);
    return apiClient.get<AccessibilityNeedSummary>(
      `/api/accessibility/need?${buildParams(query, { includePagination: false }).toString()}`,
      { signal },
    ).then((result) => setLimitedCache(needCache, key, result));
  },

  detail(id: string, signal?: AbortSignal): Promise<AccessibilityEvidenceDetail> {
    return apiClient.get<AccessibilityEvidenceDetail>(
      `/api/accessibility/evidence/${encodeURIComponent(id)}`,
      { signal },
    );
  },
};

export function clearAccessibilityEvidenceCacheForTests(): void {
  evidenceCache.clear();
  needCache.clear();
}
