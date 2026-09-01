import { apiClient } from "@/src/lib/api-client";
import { authenticatedFetch } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";
import {
  CreateMerchantSubmissionInput,
  UpdateMerchantSubmissionInput,
  MerchantSubmissionRecord,
  CreateSubmissionResult,
  ClaimableMerchantSearchResult,
} from "../types/merchant-submission.types";

const DKI_SEARCH_BOUNDS = {
  west: "106.68",
  south: "-6.4",
  east: "107.03",
  north: "-6.02",
};

export class MerchantSubmissionService {
  static async searchClaimableMerchants(query: string): Promise<ClaimableMerchantSearchResult> {
    const params = new URLSearchParams({
      ...DKI_SEARCH_BOUNDS,
      q: query,
      scope: "CURRENT_VIEWPORT",
      limit: "8",
      offset: "0",
    });

    return apiClient.get<ClaimableMerchantSearchResult>(
      `/api/merchants/canonical?${params.toString()}`,
    );
  }

  static async claimMerchant(
    merchantId: string,
    input: {
      evidence: {
        contactName: string;
        contactPhone: string;
        relationship: "OWNER" | "MANAGER" | "AUTHORIZED_REPRESENTATIVE";
        statement: string;
      };
      note?: string;
    },
  ): Promise<{
    isOwned: boolean;
    merchantId: string;
    claimStatus: "PENDING" | "APPROVED" | "REJECTED";
  }> {
    return apiClient.post<{
      isOwned: boolean;
      merchantId: string;
      claimStatus: "PENDING" | "APPROVED" | "REJECTED";
    }>(
      `/api/merchants/${merchantId}/ownership`,
      input,
    );
  }

  static async uploadPhoto(file: File): Promise<{ image_url: string; path: string }> {
    if (!file.type.startsWith("image/")) {
      throw new Error("File foto usaha harus berupa gambar.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Ukuran foto usaha maksimal 5 MB.");
    }

    const formData = new FormData();
    formData.append("photo", file);

    const response = await authenticatedFetch(
      getGetraApiUrl("/api/umkm/merchant-submissions/photo"),
      {
        method: "POST",
        body: formData,
      },
    );

    const result = await response.json() as {
      success: boolean;
      data?: { image_url: string; path: string };
      error?: { message?: string; code?: string };
    };

    if (!response.ok || !result.success || !result.data) {
      throw new Error(
        result.error?.message ||
        result.error?.code ||
        "Upload foto usaha gagal.",
      );
    }

    return result.data;
  }

  static async createDraft(input: CreateMerchantSubmissionInput): Promise<CreateSubmissionResult> {
    return apiClient.post<CreateSubmissionResult>("/api/umkm/merchant-submissions", input);
  }

  static async updateDraft(
    id: string,
    input: UpdateMerchantSubmissionInput
  ): Promise<MerchantSubmissionRecord> {
    return apiClient.patch<MerchantSubmissionRecord>(
      `/api/umkm/merchant-submissions/${id}`,
      input
    );
  }

  static async submitForReview(id: string): Promise<MerchantSubmissionRecord> {
    return apiClient.post<MerchantSubmissionRecord>(
      `/api/umkm/merchant-submissions/${id}/submit`,
      {}
    );
  }

  static async cancelSubmission(id: string): Promise<MerchantSubmissionRecord> {
    return apiClient.post<MerchantSubmissionRecord>(
      `/api/umkm/merchant-submissions/${id}/cancel`,
      {}
    );
  }

  static async getSubmission(id: string): Promise<MerchantSubmissionRecord> {
    return apiClient.get<MerchantSubmissionRecord>(
      `/api/umkm/merchant-submissions/${id}`
    );
  }

  static async getUserSubmissions(): Promise<MerchantSubmissionRecord[]> {
    return apiClient.get<MerchantSubmissionRecord[]>(
      "/api/umkm/merchant-submissions"
    );
  }
}
