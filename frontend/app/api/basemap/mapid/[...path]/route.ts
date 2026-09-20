import { NextRequest } from "next/server";

export const runtime = "nodejs";
const origin = "https://basemap.mapid.io";
const styles = new Set(["basic", "street-2d-building", "satellite", "dark", "light"]);

/** Same verified MAPID endpoint, with credentials confined to this server hop. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (path.some(part => !part || /[\\/]|\.\./.test(part)) || !["styles", "data", "fonts", "tiles"].includes(path[0])) return Response.json({ error: "Invalid map resource" }, { status: 400 });
  const key = process.env.MAPID_BASEMAP_KEY?.trim() || process.env.NEXT_PUBLIC_MAPID_BASEMAP_KEY?.trim();
  if (!key) return Response.json({ error: "MAPID credential required", status: "AUTH_REQUIRED" }, { status: 503 });
  if (path[0] === "styles" && path[1] === "default") {
    const configured = process.env.MAPID_STYLE_NAME || process.env.NEXT_PUBLIC_MAPID_STYLE_NAME || "basic";
    path[1] = styles.has(configured) ? configured : "basic";
  }
  const target = new URL(path.map(encodeURIComponent).join("/"), `${origin}/`);
  target.searchParams.set("key", key);
  try {
    const upstream = await fetch(target, { signal: AbortSignal.timeout(15000), redirect: "error", next: { revalidate: 3600 } });
    if (!upstream.ok) return Response.json({ error: "MAPID resource unavailable" }, { status: upstream.status === 401 || upstream.status === 403 ? 503 : 502 });
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    if (contentType.includes("json")) {
      const rewrite = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(rewrite);
        if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v)]));
        if (typeof value !== "string") return value;
        if (/^(https?:\/\/|\.\.?\/)/.test(value)) {
          const url = new URL(value, target);
          // Root-relative resources preserve the browser's public origin behind
          // reverse proxies; Next's internal origin can be 0.0.0.0:3000.
          if (url.origin === origin) return `/api/basemap/mapid${decodeURI(url.pathname)}`;
        }
        return value.replaceAll(key, "");
      };
      return Response.json(rewrite(await upstream.json()), { headers: { "Cache-Control": "public, max-age=3600" } });
    }
    return new Response(await upstream.arrayBuffer(), { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" } });
  } catch { return Response.json({ error: "MAPID gagal dimuat" }, { status: 502 }); }
}
