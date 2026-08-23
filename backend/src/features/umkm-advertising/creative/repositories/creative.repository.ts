import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/src/types/database.types";
import { AdCreativeInsert, AdCreativeRow, AdCreativeUpdate } from "../types/creative.types";

export class CreativeRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async createCreative(input: AdCreativeInsert): Promise<AdCreativeRow> {
    const { data, error } = await this.supabase
      .from("ad_creatives")
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
         throw new Error("Creative dengan tipe ini sudah ada untuk campaign tersebut.");
      }
      throw error;
    }
    return data;
  }

  async findByCampaignId(campaignId: string): Promise<AdCreativeRow[]> {
    const { data, error } = await this.supabase
      .from("ad_creatives")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  async findById(creativeId: string): Promise<AdCreativeRow | null> {
    const { data, error } = await this.supabase
      .from("ad_creatives")
      .select("*")
      .eq("id", creativeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async updateCreative(creativeId: string, input: AdCreativeUpdate): Promise<AdCreativeRow> {
    const { data, error } = await this.supabase
      .from("ad_creatives")
      .update(input)
      .eq("id", creativeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCreative(creativeId: string): Promise<void> {
    const { error } = await this.supabase
      .from("ad_creatives")
      .delete()
      .eq("id", creativeId);

    if (error) throw error;
  }
}
