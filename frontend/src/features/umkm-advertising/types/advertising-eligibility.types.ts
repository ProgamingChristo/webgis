export type AdvertisingEligibilityResult =
  | {
      eligible: true;
      merchantId: string;
    }
  | {
      eligible: false;
      reason:
        | "UNAUTHENTICATED"
        | "MERCHANT_NOT_FOUND"
        | "UMKM_MODE_REQUIRED"
        | "OWNERSHIP_REQUIRED"
        | "OWNERSHIP_PENDING"
        | "MERCHANT_INACTIVE"
        | "MERCHANT_UNVERIFIED"
        | "GEOMETRY_INVALID"
        | "PROFILE_INCOMPLETE";
    };
