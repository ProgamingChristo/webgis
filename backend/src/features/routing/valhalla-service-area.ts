import { z } from "zod";
import type { Coordinate } from "@/src/modules/spatial/spatial.types";
const position = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const line = z.array(position).min(2).max(20000);
const geometry = z.discriminatedUnion("type", [z.object({ type: z.literal("LineString"), coordinates: line }), z.object({ type: z.literal("MultiLineString"), coordinates: z.array(line).min(1).max(100) })]);
const responseSchema = z.object({ type: z.literal("FeatureCollection"), features: z.array(z.object({ geometry })).min(1).max(10) });
const cache = new Map<string, { expires: number; data: Record<string, unknown> }>();
const pending = new Map<string, Promise<Record<string, unknown>>>();

/** Network contour, never a radius circle and never a count of reachable edges. */
export async function valhallaServiceArea(origin: Coordinate, minutes: number, endpoint = process.env.ROUTING_BASE_URL, request: typeof fetch = fetch): Promise<Record<string, unknown>> {
  if (!endpoint || !Number.isFinite(minutes) || minutes < 5 || minutes > 30) throw new Error("Isochrone provider not configured or query invalid");
  position.parse([origin.longitude, origin.latitude]);
  const base = new URL(endpoint);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error("Invalid routing origin");
  const key = JSON.stringify([base.origin, origin, minutes]);
  const prior = cache.get(key); if (prior && prior.expires > Date.now()) return structuredClone(prior.data);
  if (pending.has(key)) return structuredClone(await pending.get(key)!);
  const work = (async () => {
    const response = await request(`${base.href.replace(/\/$/, "")}/isochrone`, { method: "POST", headers: { "Content-Type": "application/json" }, redirect: "error", signal: AbortSignal.timeout(15000), body: JSON.stringify({ locations: [{ lat: origin.latitude, lon: origin.longitude }], costing: "pedestrian", contours: [{ time: minutes }], polygons: false, denoise: 1 }) });
    if (!response.ok) throw new Error("Isochrone provider unavailable");
    const text = await response.text(); if (text.length > 2_000_000) throw new Error("Isochrone exceeds size limit");
    const body = responseSchema.parse(JSON.parse(text));
    const data = { status: "READY", service_area_type: "NETWORK_ISOCHRONE", threshold_minutes: minutes,
      geometry: { type: "MultiLineString", coordinates: body.features.flatMap(f => f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates) },
      source: "VALHALLA_OSM", analysis_method: "valhalla_pedestrian_isochrone", retrieved_at: new Date().toISOString(),
      reachable_node_count: null, reachable_edge_count: null, limitation_flags: ["DERIVED_NETWORK_CONTOUR", "NOT_A_REACHABLE_EDGE_INVENTORY"] };
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now()+60000, data }); return data;
  })();
  pending.set(key, work);
  try { return structuredClone(await work); } finally { pending.delete(key); }
}
