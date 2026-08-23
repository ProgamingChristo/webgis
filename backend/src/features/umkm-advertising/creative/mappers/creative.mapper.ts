import { AdCreativeRow, CreativeType, CreativeStatus, CtaType } from "../types/creative.types";
import { CreativeDTO } from "../dto/creative.dto";

export function toCreativeDTO(row: AdCreativeRow): CreativeDTO {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    creativeType: row.creative_type as CreativeType,
    headline: row.headline,
    description: row.description,
    imagePath: row.image_path,
    ctaType: row.cta_type as CtaType,
    status: row.status as CreativeStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
