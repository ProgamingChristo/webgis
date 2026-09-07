import { apiClient } from "@/src/lib/api-client";
import {
  ArchiveOwnedMerchantResult,
  UmkmWorkspaceSummary,
} from "../types/umkm-workspace.types";

export class UmkmWorkspaceService {
  static async getWorkspaceSummary(signal?: AbortSignal): Promise<UmkmWorkspaceSummary> {
    return apiClient.get<UmkmWorkspaceSummary>("/api/umkm/workspace", { signal, cache: "no-store" });
  }

  static async archiveOwnedMerchant(merchantId: string): Promise<ArchiveOwnedMerchantResult> {
    return apiClient.delete<ArchiveOwnedMerchantResult>(
      `/api/umkm/merchants/${encodeURIComponent(merchantId)}`,
    );
  }
}
