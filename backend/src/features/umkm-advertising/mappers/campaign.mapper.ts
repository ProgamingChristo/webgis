import { Database } from "@/src/types/database.types";
import { Campaign, CampaignStatus } from "../types/campaign.types";

type CampaignRow = Database["public"]["Tables"]["ad_campaigns"]["Row"];

export function mapCampaignToDto(row: CampaignRow): Campaign {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    status: row.status as CampaignStatus,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
