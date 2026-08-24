import { apiClient } from "@/src/lib/api-client";
import {
  CreateMerchantSubmissionInput,
  UpdateMerchantSubmissionInput,
  MerchantSubmissionRecord,
  CreateSubmissionResult,
} from "../types/merchant-submission.types";

export class MerchantSubmissionService {
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
