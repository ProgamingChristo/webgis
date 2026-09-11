import { SupabaseClient } from "@supabase/supabase-js";
import { MerchantOwnershipState } from "../types/merchant-ownership.types";
import { Database } from "@/src/types/database.types";

export class MerchantOwnershipService {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getOwnershipState(
    userId: string,
    merchantId: string
  ): Promise<MerchantOwnershipState> {
    const { data: merchant, error: merchantError } = await this.supabase
      .from("merchants")
      .select("owner_id")
      .eq("id", merchantId)
      .single();

    if (merchantError || !merchant) {
      throw new Error("Merchant not found");
    }

    const isOwned = merchant.owner_id === userId;

    let claimStatus: MerchantOwnershipState["claimStatus"] = null;

    if (!isOwned) {
      const { data: claims } = await this.supabase
        .from("merchant_claims")
        .select("status")
        .eq("merchant_id", merchantId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (claims && claims.length > 0) {
        claimStatus = claims[0].status;
      }
    }

    return {
      merchantId,
      isOwned,
      ownerId: merchant.owner_id,
      claimStatus,
    };
  }

  async claimMerchant(
    userId: string,
    merchantId: string,
    evidence: any,
    note?: string
  ): Promise<{
    merchantId: string;
    isOwned: boolean;
    claimStatus: "PENDING" | "APPROVED";
    claimId?: string;
  }> {
    const { data: merchant, error: merchantError } = await this.supabase
      .from("merchants")
      .select("id, owner_id")
      .eq("id", merchantId)
      .single();

    if (merchantError || !merchant) {
      const error: any = new Error("Merchant not found");
      error.status = 404;
      throw error;
    }

    if (merchant.owner_id && merchant.owner_id !== userId) {
      const error: any = new Error("Usaha ini sudah memiliki pengelola terverifikasi.");
      error.code = "MERCHANT_ALREADY_VERIFIED";
      error.status = 409;
      throw error;
    }

    if (merchant.owner_id === userId) {
      return {
        merchantId,
        isOwned: true,
        claimStatus: "APPROVED",
      };
    }

    const { data: claimId, error: claimError } = await this.supabase.rpc("submit_merchant_claim", {
      p_merchant_id: merchantId,
      p_evidence: evidence,
      p_note: note,
    });

    if (claimError) {
      throw claimError;
    }

    return {
      merchantId,
      isOwned: false,
      claimStatus: "PENDING",
      claimId: claimId as string,
    };
  }
}
