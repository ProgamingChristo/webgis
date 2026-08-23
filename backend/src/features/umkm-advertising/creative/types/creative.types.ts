import { Database } from "@/src/types/database.types";

export type AdCreativeRow = Database["public"]["Tables"]["ad_creatives"]["Row"];
export type AdCreativeInsert = Database["public"]["Tables"]["ad_creatives"]["Insert"];
export type AdCreativeUpdate = Database["public"]["Tables"]["ad_creatives"]["Update"];

export type CreativeType = "SPONSORED_PIN" | "CONTEXTUAL_BANNER" | "PROFILE_POSTER";
export type CreativeStatus = "DRAFT" | "READY";
export type CtaType = "VIEW_PROFILE" | "REQUEST_ROUTE";
