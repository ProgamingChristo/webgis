export type GetraAppRole =
  | "user"
  | "contributor"
  | "umkm_owner"
  | "moderator"
  | "admin";

export type StakeholderMode =
  | "commuter"
  | "umkm"
  | "investor"
  | "government";

export type VerificationStatus =
  | "unverified"
  | "surveyed"
  | "verified"
  | "stale"
  | "rejected"
  | "synthetic";

export type PublishStatus = "draft" | "published" | "archived";

export type FoundationHealth = {
  ok: boolean;
  configured: boolean;
  databaseReachable: boolean;
  publicReferenceData: {
    categories: number;
    dataSources: number;
    transitNodes: number;
    merchants: number;
  };
  expectedFoundationState: {
    transitNodesEmpty: boolean;
    merchantsEmpty: boolean;
  };
  message: string;
};
