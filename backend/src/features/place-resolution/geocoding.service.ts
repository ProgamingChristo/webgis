import "server-only";

import { z } from "zod";

const GeocodingResultSchema = z.array(z.object({
  display_name: z.string().min(1),
  lat: z.string(),
  lon: z.string(),
  name: z.string().optional(),
  osm_id: z.number().optional(),
  osm_type: z.string().optional(),
})).max(5);

export interface GeocodedPlace {
  id: string;
  label: string;
  display_name: string;
  latitude: number;
  longitude: number;
  source: "OPENSTREETMAP_NOMINATIM";
}

const ReverseGeocodingResultSchema = z.object({
  display_name: z.string().min(1),
  lat: z.string().optional(),
  lon: z.string().optional(),
  name: z.string().optional(),
  osm_id: z.number().optional(),
  osm_type: z.string().optional(),
  address: z.record(z.string(), z.string()).optional(),
});

export interface ReverseGeocodedPlace {
  address: string;
  display_name: string;
  latitude: number;
  longitude: number;
  source: "OPENSTREETMAP_NOMINATIM";
}

const cache = new Map<string, { expiresAt: number; places: GeocodedPlace[] }>();
const reverseCache = new Map<string, { expiresAt: number; place: ReverseGeocodedPlace }>();
let requestQueue: Promise<void> = Promise.resolve();
let nextRequestAt = 0;

function formatIndonesianAddress(parsed: z.infer<typeof ReverseGeocodingResultSchema>): string {
  const addr = parsed.address;
  if (addr) {
    const parts: string[] = [];
    const road = addr["road"] || addr["pedestrian"] || addr["footway"] || addr["path"] || addr["street"];
    const houseNumber = addr["house_number"];
    if (road) {
      parts.push(houseNumber ? `${road} No. ${houseNumber}` : road);
    }
    const neighbourhood = addr["neighbourhood"] || addr["residential"];
    if (neighbourhood && !parts.includes(neighbourhood)) parts.push(neighbourhood);
    const suburb = addr["suburb"] || addr["village"];
    if (suburb && !parts.includes(suburb)) parts.push(suburb);
    const district = addr["city_district"] || addr["county"];
    if (district && !parts.includes(district)) parts.push(district);
    const city = addr["city"] || addr["town"] || addr["municipality"];
    if (city && !parts.includes(city)) parts.push(city);

    if (parts.length >= 2) {
      return parts.join(", ");
    }
  }

  // Fallback to display_name segments (drop country if redundant)
  const segments = parsed.display_name.split(",").map((s) => s.trim()).filter(Boolean);
  if (segments.length > 3) {
    // Keep most descriptive local segments
    return segments.slice(0, Math.min(segments.length, 5)).join(", ");
  }
  return parsed.display_name;
}

export async function reverseGeocodePlace(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodedPlace | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = reverseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.place;

  let releaseQueue!: () => void;
  const previous = requestQueue;
  requestQueue = new Promise<void>((resolve) => { releaseQueue = resolve; });
  await previous;

  try {
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextRequestAt = Date.now() + 1_050;

    const baseConfig = process.env.PLACE_RESOLVER_BASE_URL?.trim();
    const url = new URL(
      baseConfig
        ? baseConfig.replace(/\/search\/?$/u, "/reverse")
        : "https://nominatim.openstreetmap.org/reverse",
    );
    url.searchParams.set("lat", latitude.toString());
    url.searchParams.set("lon", longitude.toString());
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url, {
      headers: {
        "Accept-Language": "id,en;q=0.8",
        "User-Agent": process.env.PLACE_RESOLVER_USER_AGENT?.trim()
          || "GETRA/0.1 (Geo-Enabled Transit and Retail Analytics)",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const parsed = ReverseGeocodingResultSchema.safeParse(await response.json());
    if (!parsed.success) return null;

    const formattedAddress = formatIndonesianAddress(parsed.data);
    const place: ReverseGeocodedPlace = {
      address: formattedAddress,
      display_name: parsed.data.display_name,
      latitude,
      longitude,
      source: "OPENSTREETMAP_NOMINATIM",
    };

    reverseCache.set(cacheKey, { expiresAt: Date.now() + 60 * 60 * 1_000, place });
    return place;
  } catch {
    return null;
  } finally {
    releaseQueue();
  }
}

export async function searchGeocodedPlaces(query: string): Promise<GeocodedPlace[]> {
  const normalized = query.trim().replace(/\s+/g, " ");
  if (normalized.length < 2) return [];
  const cacheKey = normalized.toLocaleLowerCase("id-ID");
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.places;

  let releaseQueue!: () => void;
  const previous = requestQueue;
  requestQueue = new Promise<void>((resolve) => { releaseQueue = resolve; });
  await previous;

  try {
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextRequestAt = Date.now() + 1_050;

    const url = new URL(
      process.env.PLACE_RESOLVER_BASE_URL?.trim()
        || "https://nominatim.openstreetmap.org/search",
    );
    url.searchParams.set("q", normalized);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "id");
    url.searchParams.set("limit", "3");

    const response = await fetch(url, {
      headers: {
        "Accept-Language": "id,en;q=0.8",
        "User-Agent": process.env.PLACE_RESOLVER_USER_AGENT?.trim()
          || "GETRA/0.1 (Geo-Enabled Transit and Retail Analytics)",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    const parsed = GeocodingResultSchema.safeParse(await response.json());
    if (!parsed.success) return [];

    const places = parsed.data.flatMap((item, index) => {
      const latitude = Number(item.lat);
      const longitude = Number(item.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
        || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];
      return [{
        id: `osm-${item.osm_type ?? "place"}-${item.osm_id ?? index}`,
        label: item.name?.trim() || item.display_name.split(",")[0]?.trim() || normalized,
        display_name: item.display_name,
        latitude,
        longitude,
        source: "OPENSTREETMAP_NOMINATIM" as const,
      }];
    });
    cache.set(cacheKey, { expiresAt: Date.now() + 60 * 60 * 1_000, places });
    return places;
  } catch {
    return [];
  } finally {
    releaseQueue();
  }
}
