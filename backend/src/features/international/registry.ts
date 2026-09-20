import type { InternationalSource } from "@/types/international";
function source(id: string, name: string, provider: string, endpoint: string, source_type: string, coverage: string, license: string, refresh_interval: number, env_key: string | null = null): InternationalSource {
  return { id, name, provider, endpoint, source_type, coverage, license, attribution: provider, refresh_interval, env_key,
    requires_key: Boolean(env_key), last_success: null, last_failure: null, last_verified: null, status: env_key ? "AUTH_REQUIRED" : "UNAVAILABLE" };
}
export const international_data_sources: Record<string, InternationalSource> = {
  "open-meteo": source("open-meteo", "Global forecast", "Open-Meteo", "https://api.open-meteo.com/v1/forecast", "JSON", "Global", "CC BY 4.0; free API non-commercial use", 900),
  bmkg: source("bmkg", "Prakiraan cuaca desa", "BMKG", "https://api.bmkg.go.id/publik/prakiraan-cuaca", "JSON", "Indonesia; adm4 required", "BMKG attribution required", 21600),
  usgs: source("usgs", "Earthquakes, past day", "USGS", "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson", "GeoJSON", "Global", "US public domain", 60),
  firms: source("firms", "VIIRS SNPP active fire", "NASA FIRMS", "https://firms.modaps.eosdis.nasa.gov/api/area/csv", "CSV", "Global", "NASA Earthdata open data; cite FIRMS", 900, "NASA_FIRMS_MAP_KEY"),
  openaq: source("openaq", "Air quality observations", "OpenAQ", "https://api.openaq.org/v3/locations", "JSON", "Published stations globally", "Per upstream provider license; OpenAQ attribution", 3600, "OPENAQ_API_KEY"),
  geonames: source("geonames", "Places, SRTM3 and timezone", "GeoNames", "https://secure.geonames.org", "JSON", "Global", "CC BY 4.0", 86400, "GEONAMES_USERNAME"),
  osm: source("osm", "OpenStreetMap facilities", "OpenStreetMap contributors", "https://overpass-api.de/api/interpreter", "Overpass JSON", "Global", "ODbL 1.0", 3600),
  gbfs: source("gbfs", "Public mobility systems catalog", "MobilityData / GBFS operators", "https://raw.githubusercontent.com/MobilityData/gbfs/master/systems.csv", "GBFS", "Published operator coverage", "Per operator license_url / license_id", 60),
  "dki-transit": source("dki-transit", "Halte Transjakarta", "Jakarta Satu / DKI Jakarta", "https://jakartasatu.jakarta.go.id/server/rest/services/JakartaSatu/Transjakarta/MapServer/0", "ArcGIS", "DKI Jakarta", "Provider terms; license not specified in service metadata", 86400),
  "dki-flood": source("dki-flood", "Pantau Banjir / DSDA", "Pemprov DKI Jakarta / DSDA", "https://pantaubanjir.jakarta.go.id/", "Official observations", "DKI Jakarta", "Provider terms; redistribution permission unverified", 300),
  "dki-disaster": source("dki-disaster", "BPBD disaster records", "BPBD DKI Jakarta", "https://bpbd.jakarta.go.id/", "Official incidents", "DKI Jakarta", "Provider dataset license", 86400),
  "bmkg-radar": source("bmkg-radar", "Indonesia radar mosaic", "BMKG", "https://dashboard-signature.bmkg.go.id/server/rest/services/Indonesia_radar_latest_v2_tif/MapServer", "ArcGIS imagery", "Indonesia", "BMKG attribution required; provider terms", 600),
  "bmkg-satellite": source("bmkg-satellite", "Satellite weather imagery", "BMKG", "https://satelit.bmkg.go.id/", "Official imagery", "Indonesia", "BMKG attribution required; provider terms", 600),
};

export const layerSources: Record<string, string> = {
  weather: "open-meteo", earthquakes: "usgs", "active-fire": "firms", "air-quality": "openaq",
  places: "geonames", elevation: "geonames", timezone: "geonames", poi: "osm", accessibility: "osm",
  "water-refill": "osm", bikeshare: "gbfs", micromobility: "gbfs", "ev-charging": "osm", "transit-stops": "osm",
  "jakarta-transit": "dki-transit", flood: "dki-flood", disaster: "dki-disaster", "weather-radar": "bmkg-radar", "weather-satellite": "bmkg-satellite", "open-data": "usgs",
};
