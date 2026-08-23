import { Database } from "@/src/types/database.types";

export type MerchantClaimStatus = Database["public"]["Enums"]["merchant_claim_status"];

export type MerchantOwnershipState = {
  merchantId: string;
  isOwned: boolean;
  ownerId: string | null;
  claimStatus: MerchantClaimStatus | null;
};
