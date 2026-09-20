import { NextRequest } from "next/server";
import { isInternationalLayer } from "@/types/international";
import { queryInternational, querySchema, sourceRegistry } from "@/src/features/international/service";
import { internationalRequest } from "@/src/features/international/request";
import { createOptionsHandler } from "@/src/lib/api-security";
import { logger } from "@/src/lib/logger";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest, ctx: { params: Promise<{ layer: string }> }) {
  return internationalRequest(req, async requestId => {
  const started = Date.now();
  const { layer } = await ctx.params;
  if (layer === "sources") return Response.json({ sources: sourceRegistry() }, { headers: { "Cache-Control": "no-store" } });
  if (!isInternationalLayer(layer)) return Response.json({ error: "Unknown layer" }, { status: 404 });
  try {
    const params: Record<string, unknown> = Object.fromEntries(req.nextUrl.searchParams);
    if (!req.nextUrl.searchParams.has("lat") || !req.nextUrl.searchParams.has("lon")) return Response.json({ error: "Latitude and longitude are required." }, { status: 400 });
    if (typeof params.points === "string") params.points = JSON.parse(params.points);
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) return Response.json({ error: "Invalid geographic query", details: parsed.error.flatten() }, { status: 400 });
    const result = await queryInternational(layer, parsed.data);
    logger.info("international_provider", { request_id: requestId, provider: result.source.id, endpoint: layer, latency_ms: Date.now()-started, status: result.status, error_code: result.status === "ERROR" ? "SOURCE_ERROR" : "NONE", cache: result.cache_status ?? "MISS", quality: result.quality?.status ?? "UNAVAILABLE", records: result.data.features.length });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Data request could not be completed." }, { status: 400 }); }
  });
}
export const OPTIONS = createOptionsHandler("/api/international/[layer]");
