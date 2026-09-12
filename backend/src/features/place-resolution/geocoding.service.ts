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

const cache = new Map<string, { expiresAt: number; places: GeocodedPlace[] }>();
let requestQueue: Promise<void> = Promise.resolve();
let nextRequestAt = 0;

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
