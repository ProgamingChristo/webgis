import { SupabaseClient } from "@supabase/supabase-js";
import {
  CreateMerchantSubmissionInput,
  UpdateMerchantSubmissionInput,
  MerchantSubmissionRecord,
} from "../types/merchant-submission.types";
import { parseSubmissionPoint } from "./submission-point";

function mapRowToRecord(row: any): MerchantSubmissionRecord {
  return {
    id: row.id,
    submitted_by: row.submitted_by,
    name: row.name,
    category: row.category,
    description: row.description || null,
    address: row.address || null,
    location: parseSubmissionPoint(row.location),
    opening_hours: row.opening_hours || {},
    public_media: row.public_media || { menu_urls: [], product_urls: [] },
    business_info: row.business_info || { payment_methods: [] },
    image_url: row.image_url || null,
    status: row.status,
    canonical_merchant_id: row.canonical_merchant_id || null,
    reviewed_by: row.reviewed_by || null,
    reviewed_at: row.reviewed_at || null,
    review_note: row.review_note || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class MerchantSubmissionRepository {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async createDraft(
    userId: string,
    input: CreateMerchantSubmissionInput
  ): Promise<MerchantSubmissionRecord> {
    const [lng, lat] = input.location.coordinates;
    const geomStr = `SRID=4326;POINT(${lng} ${lat})`;

    const { data, error } = await this.supabase
      .from("merchant_submissions")
      .insert({
        submitted_by: userId,
        name: input.name,
        category: input.category,
        description: input.description || null,
        address: input.address || null,
        location: geomStr,
        opening_hours: input.opening_hours || {},
        public_media: input.public_media || { menu_urls: [], product_urls: [] },
        business_info: input.business_info || { payment_methods: [] },
        image_url: input.image_url || null,
        status: "DRAFT",
      })
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Gagal membuat draft pengajuan merchant.");
    }

    return mapRowToRecord(data);
  }

  async findById(id: string): Promise<MerchantSubmissionRecord | null> {
    const { data, error } = await this.supabase
      .from("merchant_submissions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapRowToRecord(data);
  }

  async findByUserId(userId: string): Promise<MerchantSubmissionRecord[]> {
    const { data, error } = await this.supabase
      .from("merchant_submissions")
      .select("*")
      .eq("submitted_by", userId)
      .order("updated_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(mapRowToRecord);
  }

  async findPending(limit = 50, offset = 0): Promise<MerchantSubmissionRecord[]> {
    const { data, error } = await this.supabase
      .from("merchant_submissions")
      .select("*")
      .eq("status", "PENDING_REVIEW")
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return [];
    }

    return data.map(mapRowToRecord);
  }

  async updateDraft(
    id: string,
    userId: string,
    input: UpdateMerchantSubmissionInput
  ): Promise<MerchantSubmissionRecord> {
    const payload: any = { ...input };
    if (input.location) {
      const [lng, lat] = input.location.coordinates;
      payload.location = `SRID=4326;POINT(${lng} ${lat})`;
    }

    const { data, error } = await this.supabase
      .from("merchant_submissions")
      .update(payload)
      .eq("id", id)
      .eq("submitted_by", userId)
      .eq("status", "DRAFT")
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Gagal memperbarui draft pengajuan.");
    }

    return mapRowToRecord(data);
  }

  async transitionStatus(
    id: string,
    userId: string,
    targetStatus: "PENDING_REVIEW" | "CANCELLED"
  ): Promise<MerchantSubmissionRecord> {
    const expectedCurrentStatus =
      targetStatus === "PENDING_REVIEW" ? "DRAFT" : "PENDING_REVIEW";

    const { data, error } = await this.supabase
      .from("merchant_submissions")
      .update({ status: targetStatus })
      .eq("id", id)
      .eq("submitted_by", userId)
      .eq("status", expectedCurrentStatus)
      .select()
      .single();

    if (error || !data) {
      throw error || new Error(`Gagal mengubah status pengajuan menjadi ${targetStatus}.`);
    }

    return mapRowToRecord(data);
  }

  async approveSubmission(
    id: string,
    adminId: string,
    note?: string
  ): Promise<{ submission: MerchantSubmissionRecord; merchant_id: string }> {
    const { data: merchantId, error } = await this.supabase.rpc("approve_merchant_submission", {
      p_submission_id: id,
      p_review_note: note || undefined,
    });
    if (error || !merchantId) throw error || new Error("Gagal menyetujui pengajuan merchant.");
    const updatedSub = await this.findById(id);
    if (!updatedSub || updatedSub.reviewed_by !== adminId) {
      throw new Error("Identitas reviewer pengajuan tidak konsisten.");
    }

    return {
      submission: updatedSub,
      merchant_id: merchantId,
    };
  }

  async rejectSubmission(
    id: string,
    adminId: string,
    note: string
  ): Promise<MerchantSubmissionRecord> {
    const { error } = await this.supabase.rpc("reject_merchant_submission", {
      p_submission_id: id,
      p_review_note: note,
    });
    if (error) throw error;
    const updated = await this.findById(id);
    if (!updated || updated.reviewed_by !== adminId) throw new Error("Identitas reviewer pengajuan tidak konsisten.");
    return updated;
  }
}
