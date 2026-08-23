import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { CreateCampaignInput, UpdateCampaignInput } from "../types/campaign.types";

export class CampaignRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async createCampaign(createdBy: string, input: CreateCampaignInput) {
    const { data, error } = await this.supabase
      .from("ad_campaigns")
      .insert({
        merchant_id: input.merchantId,
        created_by: createdBy,
        name: input.name,
        description: input.description,
        status: "DRAFT",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCampaigns(merchantId: string) {
    const { data, error } = await this.supabase
      .from("ad_campaigns")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async getCampaignById(id: string) {
    const { data, error } = await this.supabase
      .from("ad_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  async updateCampaign(id: string, input: UpdateCampaignInput) {
    const { data, error } = await this.supabase
      .from("ad_campaigns")
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async cancelCampaign(id: string) {
    const { data, error } = await this.supabase
      .from("ad_campaigns")
      .update({ status: "CANCELLED" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
