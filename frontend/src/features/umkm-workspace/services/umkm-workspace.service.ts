import { apiClient } from "@/src/lib/api-client";
import { UmkmWorkspaceSummary } from "../types/umkm-workspace.types";

export class UmkmWorkspaceService {
  static async getWorkspaceSummary(signal?: AbortSignal): Promise<UmkmWorkspaceSummary> {
    return apiClient.get<UmkmWorkspaceSummary>("/api/umkm/workspace", { signal, cache: "no-store" });
  }
}
