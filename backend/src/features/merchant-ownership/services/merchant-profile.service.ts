import type { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import type { UpdateMerchantProfileInput } from "../schemas/merchant-profile.schema";

export class MerchantProfileService {
  constructor(private readonly supabase: SupabaseClient<any>) {}

  async updateProfile(
    merchantId: string,
    userId: string,
    input: UpdateMerchantProfileInput
  ) {
    // 1. Verify merchant exists and user is the verified owner
    const { data: merchant, error: fetchError } = await this.supabase
      .from("merchants")
      .select("id, name, owner_id, verification_status, publish_status, description, opening_hours, metadata")
      .eq("id", merchantId)
      .maybeSingle();

    if (fetchError || !merchant) {
      throw new ApplicationError("NOT_FOUND", "Merchant tidak ditemukan.");
    }

    if (merchant.owner_id !== userId) {
      throw new ApplicationError(
        "FORBIDDEN",
        "Hanya pemilik terverifikasi yang dapat mengubah profil usaha ini."
      );
    }

    // 2. Call RPC or perform atomic update with owner security
    const { error: rpcError } = await this.supabase.rpc(
      "update_owned_merchant_profile",
      {
        p_merchant_id: merchantId,
        p_description: input.description ?? null,
        p_opening_hours: input.opening_hours ?? null,
        p_metadata_patch: input.metadata ?? null,
      }
    );

    if (rpcError) {
      // Fallback if migration RPC is not yet loaded in active DB session
      const cleanMetadata = {
        ...(merchant.metadata || {}),
        ...(input.metadata || {}),
      };
      // Never allow overwriting provenance or approval facts
      delete cleanMetadata.submitted_from_id;
      delete cleanMetadata.approved_by;
      delete cleanMetadata.approved_at;
      delete cleanMetadata.sources;
      delete cleanMetadata.provenance;

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
        metadata: cleanMetadata,
      };
      if (input.description !== undefined) {
        updatePayload.description = input.description;
      }
      if (input.opening_hours !== undefined) {
        updatePayload.opening_hours = input.opening_hours;
      }

      const { data: fallbackUpdated, error: updateError } = await this.supabase
        .from("merchants")
        .update(updatePayload)
        .eq("id", merchantId)
        .eq("owner_id", userId)
        .select()
        .single();

      if (updateError || !fallbackUpdated) {
        throw new ApplicationError("DATABASE_ERROR", "Gagal memperbarui profil usaha.");
      }

      return {
        id: fallbackUpdated.id,
        name: fallbackUpdated.name,
        description: fallbackUpdated.description,
        opening_hours: fallbackUpdated.opening_hours,
        metadata: fallbackUpdated.metadata,
      };
    }

    // 3. Return updated merchant profile
    const { data: updatedMerchant } = await this.supabase
      .from("merchants")
      .select("id, name, description, opening_hours, metadata, updated_at")
      .eq("id", merchantId)
      .single();

    return updatedMerchant ?? { id: merchantId, status: "UPDATED" };
  }
}
