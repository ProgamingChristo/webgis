export type CreativeType = "SPONSORED_PIN" | "CONTEXTUAL_BANNER" | "PROFILE_POSTER";
export type CreativeStatus = "DRAFT" | "READY";
export type CtaType = "VIEW_PROFILE" | "REQUEST_ROUTE";

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
