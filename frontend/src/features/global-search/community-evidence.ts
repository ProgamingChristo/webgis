import type { CommunityFeedItem } from "@/src/features/community/types/community.types";
import type { Merchant } from "@/types/getra";

export type PlaceCommunityEvidence = {
  id: string;
  content: string;
  createdAt: string;
  helpfulCount: number;
  mediaUrls: string[];
  relation: "NEARBY_EXACT";
};

function distanceMeters(left: { longitude: number; latitude: number }, right: { longitude: number; latitude: number }) {
  const radians = Math.PI / 180;
  const latitudeDelta = (right.latitude - left.latitude) * radians;
  const longitudeDelta = (right.longitude - left.longitude) * radians;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(left.latitude * radians) * Math.cos(right.latitude * radians)
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

/**
 * Community posts currently have no canonical merchant relation in their public
 * contract. Only visible posts with an exact location can therefore be shown,
 * and they are labelled as nearby context rather than as claims about a place.
 */
export function communityEvidenceNearMerchant(
  items: CommunityFeedItem[],
  merchant: Pick<Merchant, "longitude" | "latitude">,
  radiusMeters = 150,
): PlaceCommunityEvidence[] {
  return items
    .filter((item) => item.status === "VISIBLE" && item.content.trim().length > 0)
    .filter((item) => item.location?.visibility === "EXACT")
    .filter((item) => item.location !== null && distanceMeters(merchant, item.location) <= radiusMeters)
    .sort((left, right) => {
      const helpful = right.reactions.helpfulCount - left.reactions.helpfulCount;
      return helpful || Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.id.localeCompare(right.id);
    })
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      content: item.content.trim(),
      createdAt: item.createdAt,
      helpfulCount: item.reactions.helpfulCount,
      mediaUrls: item.media.map((media) => media.url).filter((url): url is string => Boolean(url)),
      relation: "NEARBY_EXACT" as const,
    }));
}
