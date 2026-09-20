import type { InternationalLayer, InternationalQuery, InternationalSource } from "@/types/international";
import { fetchJson, list, obj, SourceFailure, timestamp } from "./http";
import { point, type AdapterResult } from "./adapters";

/** Contract for authorized official GeoJSON exports. Configuration must point to
 * the named government domain, with original timestamps/statuses retained. */
export async function official(layer: InternationalLayer, source: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  if (layer === "weather-radar") {
    const metadata = await fetchJson(`${source.endpoint}?f=json`);
    if (metadata.error) throw new SourceFailure("UNAVAILABLE", "BMKG radar service unavailable.");
    const legend = await fetchJson(`${source.endpoint}/legend?f=json`);
    const extent = obj(metadata.fullExtent), sr = obj(extent.spatialReference);
    // Never guess image bounds or projection from a screenshot.
    if (sr.wkid !== 4326 && sr.latestWkid !== 4326) throw new SourceFailure("UNAVAILABLE", "BMKG radar requires a verified georeferenced export in EPSG:4326.");
    const west = Number(extent.xmin), south = Number(extent.ymin), east = Number(extent.xmax), north = Number(extent.ymax);
    if (![west, south, east, north].every(Number.isFinite)) throw new SourceFailure("ERROR", "Radar extent is missing.");
    const imageUrl = new URL(`${source.endpoint}/export`);
    imageUrl.search = new URLSearchParams({ bbox: [west, south, east, north].join(","), bboxSR: "4326", imageSR: "4326", size: "1600,800", format: "png32", transparent: "true", f: "image" }).toString();
    const timeExtent = obj(metadata.timeInfo).timeExtent;
    const updated = Array.isArray(timeExtent) ? timestamp(timeExtent[1]) : null;
    return { features: [], updated, imagery: { url: imageUrl.href, coordinates: [[west, north], [east, north], [east, south], [west, south]], timestamp: updated, legend: list(legend.layers).flatMap(l => list(l.legend).map(item => ({ label: String(item.label ?? ""), image: `data:image/png;base64,${item.imageData}` }))) }, warnings: updated ? [] : ["Provider does not publish a verified acquisition timestamp; image freshness is unknown."] };
  }
  const config = layer === "flood" ? { env: "DKI_FLOOD_GEOJSON_URL", domain: ".jakarta.go.id" } : layer === "disaster" ? { env: "DKI_DISASTER_GEOJSON_URL", domain: ".jakarta.go.id" } : { env: "BMKG_SATELLITE_MANIFEST_URL", domain: ".bmkg.go.id" };
  const endpoint = process.env[config.env];
  if (!endpoint) throw new SourceFailure("UNAVAILABLE", `DATA SOURCE NOT CONNECTED — verified official feed required (${config.env}).`);
  const u = new URL(endpoint);
  if (!u.hostname.endsWith(config.domain)) throw new SourceFailure("UNAVAILABLE", "Official feed must use the government provider domain.");
  const data = await fetchJson(endpoint);
  if (layer === "weather-satellite") {
    const image = obj(data.image);
    const coordinates = image.coordinates;
    if (typeof image.url !== "string" || !new URL(image.url).hostname.endsWith(".bmkg.go.id") || !Array.isArray(coordinates) || coordinates.length !== 4 || !coordinates.every(c => Array.isArray(c) && c.length === 2 && c.every(v => typeof v === "number" && Number.isFinite(v))) || !timestamp(image.timestamp)) throw new SourceFailure("ERROR", "Official satellite manifest lacks verified bounds, timestamp or image URL.");
    return { features: [], updated: timestamp(image.timestamp), imagery: { url: image.url, coordinates: coordinates as [[number, number], [number, number], [number, number], [number, number]], timestamp: timestamp(image.timestamp), legend: list(image.legend).filter(l => typeof l.image === "string" && String(l.image).startsWith("https://")).map(l => ({ label: String(l.label), image: String(l.image) })) } };
  }
  if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new SourceFailure("ERROR", "Official feed must supply a WGS84 GeoJSON FeatureCollection.");
  const features = list(data.features).flatMap((f, index) => {
    const properties = obj(f.properties), geometry = obj(f.geometry), coordinates = geometry.coordinates;
    if (q.year && Number(properties.year) !== q.year || q.category && properties.incident_type !== q.category) return [];
    if (geometry.type !== "Point" || !Array.isArray(coordinates)) return [];
    const record = point(source, String(f.id ?? index), coordinates[0], coordinates[1], { ...properties, name: properties.name ?? properties.location, official_status: properties.status ?? null, thresholds: properties.thresholds ?? null }, properties.timestamp, layer === "disaster");
    return record ? [record] : [];
  });
  return { features: features.slice(0, 3000), updated: timestamp(data.updated_at), truncated: features.length > 3000, warnings: ["Status and thresholds are reported only when supplied by the official dataset; GETRA does not infer flood severity."] };
}
