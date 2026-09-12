import type { Merchant } from "@/types/getra";
import type { OriginalMerchantDTO } from "./types/fair-discovery.types";
import type { SponsoredPinDTO } from "@/src/features/umkm-advertising";

/** Adapts returned identities/coordinates without inventing missing merchant metadata. */
export function discoveryMerchant(item: OriginalMerchantDTO | SponsoredPinDTO): Merchant {
  const organic = "id" in item ? item : null;
  const sponsored = "merchant_id" in item ? item : null;
  return {
    id: organic?.id ?? sponsored!.merchant_id,
    name: organic?.name ?? sponsored!.merchant_name,
    category: organic?.category ?? sponsored!.merchant_category,
    brand: "",
    longitude: item.geometry.coordinates[0], latitude: item.geometry.coordinates[1],
    address: organic?.address ?? undefined,
    district: organic?.district ?? undefined, city: organic?.city ?? undefined,
    walkingMinutes: organic?.route_status === "ROUTABLE" ? organic.walking_minutes : null,
    distanceMeters: organic?.distance_meters ?? null,
    openNow: organic?.open_now === true,
    openStatusKnown: organic?.open_now !== null && organic?.open_now !== undefined,
    openingStatus: organic?.open_now === true ? "OPEN" : organic?.open_now === false ? "CLOSED" : "UNKNOWN",
    photo: sponsored?.image_url ?? undefined,
    source: "GETRA · Penelusuran Adil", priceStatusKnown: false,
    limitation: "Metadata ditampilkan sesuai data penelusuran yang tersedia.",
  };
}
