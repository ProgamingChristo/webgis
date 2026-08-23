import { CreativeType, CreativeStatus, CtaType } from "../types/creative.types";

export interface CreativeDTO {
  id: string;
  campaignId: string;
  creativeType: CreativeType;
  headline: string;
  description: string | null;
  imagePath: string | null;
  ctaType: CtaType;
  status: CreativeStatus;
  createdAt: string;
  updatedAt: string;
}
