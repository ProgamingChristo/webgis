export async function GET() {
  return Response.json({
    "mapid-default": process.env.MAPID_BASEMAP_KEY || process.env.NEXT_PUBLIC_MAPID_BASEMAP_KEY ? "CONFIGURED" : "AUTH_REQUIRED",
    "carto-light": process.env.CARTO_BASEMAP_API_KEY ? "CONFIGURED" : "AUTH_REQUIRED",
    "carto-dark": process.env.CARTO_BASEMAP_API_KEY ? "CONFIGURED" : "AUTH_REQUIRED",
    osm: "PUBLIC", "esri-satellite": "PUBLIC",
  }, { headers: { "Cache-Control": "no-store" } });
}
