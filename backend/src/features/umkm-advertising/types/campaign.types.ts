export type CampaignStatus =
  | "DRAFT"
  | "READY"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "ENDED"
  | "CANCELLED";

export interface Campaign {
  id: string;
  merchantId: string;
  createdBy: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignInput {
  merchantId: string;
  name: string;
  description?: string;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
}
