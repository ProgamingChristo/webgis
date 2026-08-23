import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { AdvertisingEligibilityResult } from "../types/advertising-eligibility.types";

export class AdvertisingEligibilityService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly merchantOwnershipService: MerchantOwnershipService
  ) {}

  async verifyEligibility(
    merchantId: string,
  ): Promise<boolean> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      return false;
    }

    const result = await this.checkEligibility(
      user.id,
      merchantId,
    );

    return result.eligible;
  }

  async checkEligibility(
    userId: string,
    merchantId: string
  ): Promise<AdvertisingEligibilityResult> {
    if (!userId) {
      return { eligible: false, reason: "UNAUTHENTICATED" };
    }

    // UMKM is an optional stakeholder mode, never an authorization role.
    const { data: stakeholderMode, error: stakeholderModeError } =
      await this.supabase
        .from("user_stakeholder_modes")
        .select("mode")
        .eq("user_id", userId)
        .eq("mode", "UMKM")
        .maybeSingle();

    if (stakeholderModeError || !stakeholderMode) {
      return { eligible: false, reason: "UMKM_MODE_REQUIRED" };
    }

    // 2. Fetch Merchant Details
    const { data: merchant, error: merchantError } = await this.supabase
      .from("merchants")
      .select("publish_status, verification_status, location")
      .eq("id", merchantId)
      .single();

    if (merchantError || !merchant) {
      return { eligible: false, reason: "MERCHANT_NOT_FOUND" };
    }

    // 3. Verified Merchant Ownership Exists
    const ownershipState = await this.merchantOwnershipService.getOwnershipState(
      userId,
      merchantId
    );

    if (!ownershipState.isOwned) {
      if (ownershipState.claimStatus === "PENDING") {
        return { eligible: false, reason: "OWNERSHIP_PENDING" };
      }
      return { eligible: false, reason: "OWNERSHIP_REQUIRED" };
    }

    // 4. Merchant Active/Eligible
    if (
      merchant.publish_status === "HIDDEN" ||
      merchant.publish_status === "ARCHIVED" ||
      merchant.verification_status === "REJECTED"
    ) {
      return { eligible: false, reason: "MERCHANT_INACTIVE" };
    }

    // 5. Merchant Geometry Valid
    if (!merchant.location) {
      return { eligible: false, reason: "GEOMETRY_INVALID" };
    }

    // 6. Profile Incomplete (Example rule: must have a category)
    // Could check other fields like name, but we assume merchants table enforces name NOT NULL.

    return {
      eligible: true,
      merchantId,
    };
  }
}
