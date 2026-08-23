import { apiClient } from "@/src/lib/api-client";
import type { Merchant } from "@/types/getra";

export interface MapidFoodBeverageLayer {
  layer_id: string;
  layer_name: string;
  source: string;
  city: string;
  collected_at: string;
  total_features: number;
  merchants: Merchant[];
}

export const mapidLayerService = {
  async getFoodBeverageLayer(): Promise<MapidFoodBeverageLayer> {
    return apiClient.get<MapidFoodBeverageLayer>(
      "/api/mapid/food-beverage",
    );
  },
};
