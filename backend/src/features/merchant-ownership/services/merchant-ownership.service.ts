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
}
