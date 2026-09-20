import { z } from "zod";
import type { InternationalLayer, InternationalQuery, InternationalResult } from "@/types/international";
import { isInternationalLayer } from "@/types/international";
import { international_data_sources, layerSources } from "./registry";
import { runAdapter } from "./adapters";
import { SourceFailure } from "./http";

export const querySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90), lon: z.coerce.number().finite().min(-180).max(180),
  radius: z.coerce.number().finite().min(100).max(20000000).default(10000),
  q: z.string().trim().max(120).optional(), category: z.string().regex(/^[a-z_ -]{1,40}$/).optional(),
  magnitude: z.coerce.number().min(0).max(10).optional(), adm4: z.string().regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/).optional(),
  system: z.string().max(160).optional(), source: z.string().max(40).optional(), year: z.coerce.number().int().min(1900).max(2100).optional(),
  points: z.array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])).min(1).max(20).optional(),
  since: z.iso.datetime().optional(), until: z.iso.datetime().optional(),
}).strict().refine(q => !q.since || !q.until || q.since <= q.until, "Time range is reversed");

const cache = new Map<string, { expires: number; data: InternationalResult }>();
const pending = new Map<string, Promise<InternationalResult>>();
export function clearInternationalCache() { cache.clear(); pending.clear(); }
export function sourceRegistry() { return Object.values(international_data_sources).map(s => ({ ...s, status: s.env_key && !process.env[s.env_key] ? "AUTH_REQUIRED" : s.status === "LIVE" && s.last_success && Date.now() > Date.parse(s.last_success) + s.refresh_interval * 1000 ? "STALE" : s.status })); }

export async function queryInternational(layer: InternationalLayer, input: InternationalQuery): Promise<InternationalResult> {
  const q = querySchema.parse(input);
  if (layer === "open-data") {
    if (!q.source || q.source === "open-data" || !isInternationalLayer(q.source)) throw new SourceFailure("UNAVAILABLE", "Choose a dataset to map actual records.");
    return { ...await queryInternational(q.source, { ...q, source: undefined }), layer: "open-data" };
  }
  const sourceId = layer === "weather" && q.adm4 ? "bmkg" : layerSources[layer];
  const source = international_data_sources[sourceId];
  const key = JSON.stringify([layer, q]);
  const prior = cache.get(key);
  if (prior && prior.expires > Date.now()) return refreshFreshness(prior.data);
  if (pending.has(key)) return pending.get(key)!;
  const work = (async (): Promise<InternationalResult> => {
    const attempt = new Date().toISOString();
    try {
      if (source.env_key && !process.env[source.env_key]?.trim()) throw new SourceFailure("AUTH_REQUIRED", `PARTIAL — SOURCE CREDENTIAL REQUIRED: ${source.env_key}`);
      const result = await runAdapter(layer, source, q);
      if (q.since || q.until) result.features = result.features.filter(f => {
        const time = typeof f.properties.event_time === "string" ? f.properties.event_time : f.properties.timestamp;
        return time !== null && (!q.since || time >= q.since) && (!q.until || time <= q.until);
      });
      const ttl = result.ttl ?? source.refresh_interval;
      // Provider request success is separate from age of observations and static inventory.
      const staleFeed = result.updated !== null && Date.now() > Date.parse(result.updated) + ttl * 1000;
      source.last_success = attempt; source.last_verified = attempt; source.status = staleFeed ? "STALE" : "LIVE";
      const data: InternationalResult = { layer, source: { ...source }, status: source.status, message: staleFeed ? "Provider data is older than its refresh interval." : null, fetched_at: attempt, last_updated: result.updated, ttl, data: { type: "FeatureCollection", features: result.features }, warnings: result.warnings ?? [], truncated: result.truncated ?? false, imagery: result.imagery, systems: result.systems };
      if (cache.size >= 200) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + ttl * 1000, data });
      return refreshFreshness(data);
    } catch (error) {
      source.last_failure = attempt;
      source.status = error instanceof SourceFailure ? error.status : "ERROR";
      const message = error instanceof SourceFailure ? error.message : "Provider request failed or returned invalid data.";
      if (prior?.data.fetched_at && Date.now() - Date.parse(prior.data.fetched_at) < 86400000) {
        const stale = { ...refreshFreshness(prior.data), status: "STALE" as const, source: { ...source, status: "STALE" as const }, message: `Refresh failed. ${message}` };
        cache.set(key, { expires: Date.now() + 30000, data: stale }); return stale;
      }
      const data: InternationalResult = { layer, status: source.status, message, source: { ...source }, fetched_at: null, last_updated: null, ttl: source.refresh_interval, data: { type: "FeatureCollection", features: [] }, warnings: [], truncated: false };
      cache.set(key, { expires: Date.now() + 30000, data }); return data;
    }
  })();
  pending.set(key, work);
  try { return await work; } finally { pending.delete(key); }
}
function refreshFreshness(data: InternationalResult): InternationalResult {
  const expired = [data.fetched_at, data.last_updated].some(time => time !== null && Date.now() > Date.parse(time) + data.ttl * 1000);
  const status = expired && data.status === "LIVE" ? "STALE" : data.status;
  return { ...data, status, source: { ...data.source, status }, data: { ...data.data, features: data.data.features.map(feature => ({ ...feature, properties: { ...feature.properties, freshness: feature.properties.freshness === "STATIC" ? "STATIC" : !feature.properties.timestamp ? "UNKNOWN" : Date.now() > Date.parse(feature.properties.timestamp) + data.ttl * 1000 ? "STALE" : "CURRENT" } })) } };
}
