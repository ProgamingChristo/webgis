import { apiClient } from "@/src/lib/api-client";
import type { UmkmCopilotResult, UmkmIntelligenceResult } from "../types/umkm-intelligence.types";

export const umkmIntelligenceService = {
  get(merchantId: string, days: 7 | 30, signal?: AbortSignal) {
    const params = new URLSearchParams({ merchant_id: merchantId, days: String(days) });
    return apiClient.get<UmkmIntelligenceResult>(`/api/umkm/intelligence?${params}`, { signal });
  },
  ask(merchantId: string, days: 7 | 30, question: string, signal?: AbortSignal) {
    return apiClient.post<UmkmCopilotResult>(
      "/api/umkm/intelligence/copilot",
      { merchant_id: merchantId, days, question },
      { signal },
    );
  },
};
