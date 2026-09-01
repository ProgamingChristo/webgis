import { Database } from "@/src/types/database.types";

export type MerchantClaimStatus = Database["public"]["Enums"]["merchant_claim_status"];

export type MerchantOwnershipState = {
  merchantId: string;
  isOwned: boolean;
  ownerId: string | null;
  claimStatus: MerchantClaimStatus | null;
};

export type AdminMerchantClaimRecord = {
  id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_category: string;
  merchant_address: string | null;
  merchant_publish_status: string | null;
  merchant_verification_status: string | null;
  has_ownership_conflict: boolean;
  submitted_by: string;
  submitted_by_name: string;
  submitted_by_username: string | null;
  status: MerchantClaimStatus;
  note: string | null;
  evidence: {
    contact_name: string | null;
    contact_phone: string | null;
    relationship: string | null;
    statement: string | null;
  };
  created_at: string;
  reviewed_at: string | null;
};
