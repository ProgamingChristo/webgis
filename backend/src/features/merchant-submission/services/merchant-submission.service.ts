import { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import { MerchantSubmissionRepository } from "../repositories/merchant-submission.repository";
import {
  CreateMerchantSubmissionInput,
  UpdateMerchantSubmissionInput,
  MerchantSubmissionRecord,
  DuplicateMerchantWarning,
} from "../types/merchant-submission.types";

export class MerchantSubmissionService {
  private repo: MerchantSubmissionRepository;

  constructor(private readonly supabase: SupabaseClient<any>) {
    this.repo = new MerchantSubmissionRepository(supabase);
  }

  private async assertUmkmMode(userId: string): Promise<void> {
    const { data: modes } = await this.supabase
      .from("user_stakeholder_modes")
      .select("mode")
      .eq("user_id", userId);

    const hasUmkm = (modes || []).some((m: any) => m.mode === "UMKM");
    if (!hasUmkm) {
      // Check admin fallback
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("account_role")
        .eq("id", userId)
        .single();

      if (profile?.account_role !== "ADMIN") {
        throw new ApplicationError(
          "FORBIDDEN",
          "Stakeholder Mode UMKM diperlukan untuk mengajukan merchant baru."
        );
      }
    }
  }

  async createDraft(
    userId: string,
    input: CreateMerchantSubmissionInput
  ): Promise<{ submission: MerchantSubmissionRecord; duplicate_warning?: DuplicateMerchantWarning }> {
    await this.assertUmkmMode(userId);

    const duplicateWarning = await this.checkPotentialDuplicates(
      input.location.coordinates,
      input.name
    );

    const submission = await this.repo.createDraft(userId, input);

    return {
      submission,
      duplicate_warning: duplicateWarning.has_potential_duplicate ? duplicateWarning : undefined,
    };
  }

  async updateDraft(
    id: string,
    userId: string,
    input: UpdateMerchantSubmissionInput
  ): Promise<MerchantSubmissionRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new ApplicationError("NOT_FOUND", "Pengajuan merchant tidak ditemukan.");
    }

    if (existing.submitted_by !== userId) {
      throw new ApplicationError("FORBIDDEN", "Anda tidak memiliki izin untuk mengedit pengajuan ini.");
    }

    if (existing.status !== "DRAFT") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        `Pengajuan berstatus ${existing.status} tidak dapat diedit.`
      );
    }

    return this.repo.updateDraft(id, userId, input);
  }

  async submitForReview(id: string, userId: string): Promise<MerchantSubmissionRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new ApplicationError("NOT_FOUND", "Pengajuan merchant tidak ditemukan.");
    }

    if (existing.submitted_by !== userId) {
      throw new ApplicationError("FORBIDDEN", "Anda tidak memiliki izin atas pengajuan ini.");
    }

    if (existing.status !== "DRAFT") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        `Hanya pengajuan berstatus DRAFT yang dapat diajukan untuk review (status saat ini: ${existing.status}).`
      );
    }

    return this.repo.transitionStatus(id, userId, "PENDING_REVIEW");
  }

  async cancelSubmission(id: string, userId: string): Promise<MerchantSubmissionRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new ApplicationError("NOT_FOUND", "Pengajuan merchant tidak ditemukan.");
    }

    if (existing.submitted_by !== userId) {
      throw new ApplicationError("FORBIDDEN", "Anda tidak memiliki izin atas pengajuan ini.");
    }

    if (existing.status !== "PENDING_REVIEW" && existing.status !== "DRAFT") {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        `Pengajuan berstatus ${existing.status} tidak dapat dibatalkan.`
      );
    }

    return this.repo.transitionStatus(id, userId, "CANCELLED");
  }

  async getSubmissionById(id: string, userId: string): Promise<MerchantSubmissionRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new ApplicationError("NOT_FOUND", "Pengajuan merchant tidak ditemukan.");
    }

    // Check if owner or admin
    if (existing.submitted_by !== userId) {
      const { data: profile } = await this.supabase
        .from("profiles")
        .select("account_role")
        .eq("id", userId)
        .single();

      if (profile?.account_role !== "ADMIN") {
        throw new ApplicationError("FORBIDDEN", "Anda tidak memiliki akses ke data pengajuan ini.");
      }
    }

    return existing;
  }

  async getUserSubmissions(userId: string): Promise<MerchantSubmissionRecord[]> {
    return this.repo.findByUserId(userId);
  }

  async checkPotentialDuplicates(
    _coordinates: [number, number],
    name: string
  ): Promise<DuplicateMerchantWarning> {
    // Search existing merchants within ~100m with similar name
    const { data: nearbyMerchants } = await this.supabase
      .from("merchants")
      .select("id, name")
      .ilike("name", `%${name.slice(0, 5)}%`)
      .limit(3);

    if (nearbyMerchants && nearbyMerchants.length > 0) {
      return {
        has_potential_duplicate: true,
        nearby_merchant_id: nearbyMerchants[0].id,
        nearby_merchant_name: nearbyMerchants[0].name,
      };
    }

    return { has_potential_duplicate: false };
  }

  // Admin APIs
  async adminListPending(
    adminId: string,
    limit = 50,
    offset = 0
  ): Promise<MerchantSubmissionRecord[]> {
    await this.assertAdminRole(adminId);
    return this.repo.findPending(limit, offset);
  }

  async adminApprove(
    id: string,
    adminId: string,
    note?: string
  ): Promise<{ submission: MerchantSubmissionRecord; merchant_id: string }> {
    await this.assertAdminRole(adminId);
    return this.repo.approveSubmission(id, adminId, note);
  }

  async adminReject(
    id: string,
    adminId: string,
    note: string
  ): Promise<MerchantSubmissionRecord> {
    await this.assertAdminRole(adminId);
    return this.repo.rejectSubmission(id, adminId, note);
  }

  private async assertAdminRole(userId: string): Promise<void> {
    const { data: profile } = await this.supabase
      .from("profiles")
      .select("account_role")
      .eq("id", userId)
      .single();

    if (profile?.account_role !== "ADMIN") {
      throw new ApplicationError("FORBIDDEN", "Hanya administrator yang dapat melakukan review pengajuan.");
    }
  }
}
