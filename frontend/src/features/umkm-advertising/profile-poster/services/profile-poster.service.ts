import { apiClient } from "@/src/lib/api-client";
import { ProfilePosterDTO } from "../types/profile-poster.types";

export const ProfilePosterService = {
  /**
   * Fetches an eligible promotional poster for the given merchant ID.
   */
  async getProfilePoster(merchantId: string): Promise<ProfilePosterDTO | null> {
    if (!merchantId || merchantId.trim() === "") {
      return null;
    }

    return apiClient.get<ProfilePosterDTO | null>(
      `/api/merchants/${encodeURIComponent(merchantId)}/advertising/profile-poster`
    );
  },
};
