/** CARTO now requires a basemap key even when anonymous tiles return HTTP 200
 * with an API KEY REQUIRED watermark. Never expose that as a successful basemap. */
export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const [style, z, x, y] = path;
  if (path.length !== 4 || !["light_all", "dark_all"].includes(style) || !/^\d{1,2}$/.test(z) || !/^\d{1,8}$/.test(x) || !/^\d{1,8}\.png$/.test(y) || Number(z) > 20 || Number(x) >= 2 ** Number(z) || Number(y.split(".")[0]) >= 2 ** Number(z)) return Response.json({ error: "Invalid tile" }, { status: 400 });
  const key = process.env.CARTO_BASEMAP_API_KEY?.trim();
  if (!key) return Response.json({ status: "AUTH_REQUIRED", error: "CARTO basemap credential required" }, { status: 503 });
  const target = new URL(`https://a.basemaps.cartocdn.com/${path.join("/")}`);
  target.searchParams.set("key", key);
  try {
    const upstream = await fetch(target, { redirect: "error", signal: AbortSignal.timeout(15000), next: { revalidate: 86400 } });
    if (!upstream.ok) return Response.json({ error: "CARTO tile unavailable" }, { status: 502 });
    return new Response(await upstream.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
  } catch { return Response.json({ error: "CARTO tile unavailable" }, { status: 502 }); }
}
