import { SupabaseClient } from "@supabase/supabase-js";
import {
  CreateMerchantSubmissionInput,
  UpdateMerchantSubmissionInput,
  MerchantSubmissionRecord,
} from "../types/merchant-submission.types";

function parsePoint(val: any): { type: "Point"; coordinates: [number, number] } {
  if (!val) {
    return { type: "Point", coordinates: [106.827153, -6.175392] };
  }
  if (typeof val === "object" && val.type === "Point" && Array.isArray(val.coordinates)) {
    return { type: "Point", coordinates: [val.coordinates[0], val.coordinates[1]] };
  }
  if (typeof val === "string") {
    // E.g. "POINT(106.78 -6.18)" or "SRID=4326;POINT(106.78 -6.18)"
    const match = val.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      return {
        type: "Point",
        coordinates: [parseFloat(match[1]), parseFloat(match[2])],
      };
    }
  }
  return { type: "Point", coordinates: [106.827153, -6.175392] };
}

function mapRowToRecord(row: any): MerchantSubmissionRecord {
  return {
    id: row.id,
    submitted_by: row.submitted_by,
    name: row.name,
    category: row.category,
    description: row.description || null,
    address: row.address || null,
    location: parsePoint(row.location),
    opening_hours: row.opening_hours || {},
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
    // 1. Fetch submission
    const { data: sub, error: subError } = await this.supabase
      .from("merchant_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (subError || !sub) {
      throw new Error("Pengajuan tidak ditemukan.");
    }

    if (sub.status !== "PENDING_REVIEW") {
      throw new Error(`Pengajuan tidak dapat disetujui karena berstatus ${sub.status}.`);
    }

    // 2. Create canonical merchant
    const parsedLoc = parsePoint(sub.location);
    const [lng, lat] = parsedLoc.coordinates;
    const geomStr = `SRID=4326;POINT(${lng} ${lat})`;

    const { data: merchant, error: mError } = await this.supabase
      .from("merchants")
      .insert({
        name: sub.name,
        description: sub.description,
        address: sub.address,
        location: geomStr,
        opening_hours: sub.opening_hours || {},
        owner_id: sub.submitted_by,
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        metadata: {
          submitted_from_id: sub.id,
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          category_label: sub.category,
        },
      })
      .select("id")
      .single();

    if (mError || !merchant) {
      throw mError || new Error("Gagal membuat data merchant terverifikasi.");
    }

    // 3. Mark submission as APPROVED
    const { data: updatedSub, error: updateError } = await this.supabase
      .from("merchant_submissions")
      .update({
        status: "APPROVED",
        canonical_merchant_id: merchant.id,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_note: note || "Disetujui oleh admin.",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedSub) {
      throw updateError || new Error("Gagal memperbarui status pengajuan menjadi APPROVED.");
    }

    return {
      submission: mapRowToRecord(updatedSub),
      merchant_id: merchant.id,
    };
  }

  async rejectSubmission(
    id: string,
    adminId: string,
    note: string
  ): Promise<MerchantSubmissionRecord> {
    const { data, error } = await this.supabase
      .from("merchant_submissions")
      .update({
        status: "REJECTED",
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_note: note,
      })
      .eq("id", id)
      .eq("status", "PENDING_REVIEW")
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Gagal menolak pengajuan merchant.");
    }

    return mapRowToRecord(data);
  }
}
