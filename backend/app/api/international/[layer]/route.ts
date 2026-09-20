import { NextRequest } from "next/server";
import { isInternationalLayer } from "@/types/international";
import { queryInternational, querySchema, sourceRegistry } from "@/src/features/international/service";
export const runtime = "nodejs";
export const maxDuration = 60;
const clients = new Map<string, { count: number; until: number }>();

export async function GET(req: NextRequest, ctx: { params: Promise<{ layer: string }> }) {
  const { layer } = await ctx.params;
  if (layer === "sources") return Response.json({ sources: sourceRegistry() }, { headers: { "Cache-Control": "no-store" } });
  if (!isInternationalLayer(layer)) return Response.json({ error: "Unknown layer" }, { status: 404 });
  const client = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "anonymous";
  const existing = clients.get(client);
  const bucket = existing && existing.until > Date.now() ? existing : { count: 0, until: Date.now() + 60000 };
  if (++bucket.count > 60) return Response.json({ error: "Please retry in one minute." }, { status: 429, headers: { "Retry-After": "60" } });
  if (clients.size >= 10000) clients.clear(); clients.set(client, bucket);
  try {
    const params: Record<string, unknown> = Object.fromEntries(req.nextUrl.searchParams);
    if (!req.nextUrl.searchParams.has("lat") || !req.nextUrl.searchParams.has("lon")) return Response.json({ error: "Latitude and longitude are required." }, { status: 400 });
    if (typeof params.points === "string") params.points = JSON.parse(params.points);
    const parsed = querySchema.safeParse(params);
    if (!parsed.success) return Response.json({ error: "Invalid geographic query", details: parsed.error.flatten() }, { status: 400 });
    return Response.json(await queryInternational(layer, parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Data request could not be completed." }, { status: 400 }); }
}
