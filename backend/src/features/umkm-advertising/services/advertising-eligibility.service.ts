import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { MerchantOwnershipService } from "@/src/features/merchant-ownership";
import { AdvertisingEligibilityResult } from "../types/advertising-eligibility.types";

function isValidPointGeometry(location: any): boolean {
  if (!location) return false;
  let loc = location;
  if (typeof loc === "string") {
    try {
      loc = JSON.parse(loc);
    } catch {
      return false;
    }
  }
  if (typeof loc === "object" && loc !== null) {
    if (loc.type === "Point") {
      if (Array.isArray(loc.coordinates)) {
        if (loc.coordinates.length < 2) return false;
        const [lng, lat] = loc.coordinates;
        if (
          typeof lng === "number" &&
          typeof lat === "number" &&
          !isNaN(lng) &&
          !isNaN(lat) &&
          !(lng === 0 && lat === 0) &&
          lng >= -180 &&
          lng <= 180 &&
          lat >= -90 &&
          lat <= 90
        ) {
          return true;
        }
        return false;
      }
      return true;
    }
  }
  return false;
}

function extractCategory(metadata: unknown, description: unknown, primaryCategoryId?: unknown, directCategory?: unknown): string | null {
  if (primaryCategoryId && typeof primaryCategoryId === "string" && primaryCategoryId.trim()) {
    return primaryCategoryId.trim();
  }
  if (directCategory && typeof directCategory === "string" && directCategory.trim()) {
    return directCategory.trim();
  }
  if (typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)) {
    const fields = metadata as Record<string, unknown>;
    for (const category of [fields.category, fields.category_label]) {
      if (typeof category === "string" && category.trim()) return category.trim();
    }
  }
  if (typeof description === "string" && description.trim()) {
    const firstPart = description.split("·")[0]?.trim();
    if (firstPart && firstPart !== "Kategori belum tersedia") return firstPart;
  }
  return null;
}

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

  /**
   * Server-authoritative check for ad serving candidate evaluation.
   * Does not depend on the caller's auth context (e.g. commuter).
   * Strictly enforces that the merchant has an existing verified owner,
   * is PUBLISHED, VERIFIED, has valid geometry, and complete profile.
   */
  async isMerchantEligibleForServing(merchantId: string): Promise<boolean> {
    if (!merchantId) return false;

    const { data: merchant, error } = await this.supabase
      .from("merchants")
      .select("id, name, owner_id, publish_status, verification_status, location, metadata, description, primary_category_id")
      .eq("id", merchantId)
      .maybeSingle();

    if (error || !merchant) return false;

    // Strict verified owner requirement: unclaimed or unowned merchants cannot be served as sponsored
    if (!merchant.owner_id) {
      return false;
    }

    // Must be PUBLISHED and VERIFIED
    if (merchant.publish_status !== "PUBLISHED" || merchant.verification_status !== "VERIFIED") {
      return false;
    }

    // Must have valid point geometry
    if (!isValidPointGeometry(merchant.location)) {
      return false;
    }

    // Must have valid name
    if (merchant.name !== undefined && (!merchant.name || !merchant.name.trim())) {
      return false;
    }

    // Must have valid category
    const cat = extractCategory(merchant.metadata, merchant.description, merchant.primary_category_id, (merchant as any).category);
    if ((merchant as any).name !== undefined && !cat) {
      return false;
    }

    return true;
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
      .select("id, name, publish_status, verification_status, location, metadata, description, primary_category_id")
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
    if (merchant.publish_status !== "PUBLISHED") {
      return { eligible: false, reason: "MERCHANT_INACTIVE" };
    }

    if (merchant.verification_status !== "VERIFIED") {
      return { eligible: false, reason: "MERCHANT_UNVERIFIED" };
    }

    // 5. Merchant Geometry Valid
    if (!isValidPointGeometry(merchant.location)) {
      return { eligible: false, reason: "GEOMETRY_INVALID" };
    }

    // 6. Profile Completeness (name & category required)
    if (merchant.name !== undefined && (!merchant.name || !merchant.name.trim())) {
      return { eligible: false, reason: "PROFILE_INCOMPLETE" };
    }

    const category = extractCategory(
      merchant.metadata,
      merchant.description,
      merchant.primary_category_id,
      (merchant as any).category
    );
    if ((merchant as any).name !== undefined && !category) {
      return { eligible: false, reason: "PROFILE_INCOMPLETE" };
    }

    return {
      eligible: true,
      merchantId,
    };
  }
}
