import type { Feature, Geometry } from "geojson";
import type { InternationalLayer, InternationalQuery, InternationalRecord, InternationalResult, InternationalSource } from "@/types/international";
import { csv, fetchJson, fetchText, list, num, obj, SourceFailure, timestamp } from "./http";

export interface AdapterResult {
  features: Feature<Geometry, InternationalRecord>[]; updated: string | null; ttl?: number;
  warnings?: string[]; truncated?: boolean; imagery?: InternationalResult["imagery"]; systems?: InternationalResult["systems"];
}
export function point(source: InternationalSource, id: string | number, lon: unknown, lat: unknown, properties: Record<string, unknown>, time: unknown = null, staticData = false): Feature<Geometry, InternationalRecord> | null {
  const x = num(lon), y = num(lat); if (x === null || y === null || Math.abs(x) > 180 || Math.abs(y) > 90) return null;
  const date = timestamp(time);
  return { type: "Feature", id, geometry: { type: "Point", coordinates: [x, y] }, properties: {
    ...properties, name: String(properties.name ?? source.name), source: source.provider, dataset: source.name,
    timestamp: date, license: source.license,
    freshness: staticData ? "STATIC" : !date ? "UNKNOWN" : Date.now() > Date.parse(date) + source.refresh_interval * 1000 ? "STALE" : "CURRENT",
  } };
}
const compact = (records: (Feature<Geometry, InternationalRecord> | null)[]) => records.filter((r): r is Feature<Geometry, InternationalRecord> => r !== null);
export function distanceMeters(lon: number, lat: number, q: InternationalQuery) {
  const rad = Math.PI / 180, a = Math.sin((lat - q.lat) * rad / 2) ** 2 + Math.cos(lat * rad) * Math.cos(q.lat * rad) * Math.sin((lon - q.lon) * rad / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
function url(base: string, params: Record<string, string | number>) { const u = new URL(base); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v)); return u.href; }

async function weather(s: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  if (q.adm4) {
    const data = await fetchJson(url(s.endpoint, { adm4: q.adm4 }));
    const features = compact(list(data.data).flatMap((entry, index) => {
      const location = obj(entry.lokasi);
      const forecasts = (Array.isArray(entry.cuaca) ? entry.cuaca.flat() : []).map(obj);
      const upcoming = forecasts.filter(f => Date.parse(String(f.utc_datetime).replace(" ", "T") + "Z") >= Date.now() - 3 * 3600000);
      const current = upcoming[0]; if (!current) return [];
      return [point(s, index, location.lon, location.lat, { name: location.desa, kind: "forecast", temperature_c: current.t, humidity_percent: current.hu, wind_kmh: current.ws, wind_direction: current.wd, precipitation_mm: current.tp ?? null, weather_code: current.weather, description: current.weather_desc, visibility: current.vs_text, valid_time: current.utc_datetime, forecast: forecasts }, typeof current.analysis_date === "string" && !/(Z|[+-]\d\d:\d\d)$/.test(current.analysis_date) ? `${current.analysis_date}Z` : current.analysis_date)];
    }));
    return { features, updated: features[0]?.properties.timestamp ?? null, warnings: ["BMKG provides forecasts, not an in-situ current observation."] };
  }
  const data = await fetchJson(url(s.endpoint, { latitude: q.lat, longitude: q.lon, current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m", hourly: "temperature_2m,relative_humidity_2m,precipitation,weather_code,visibility,wind_speed_10m", forecast_days: 3, timezone: "GMT" }));
  const current = obj(data.current), hourly = obj(data.hourly);
  if (!Object.keys(current).length) throw new SourceFailure("ERROR", "Weather response has no current data.");
  const time = timestamp(`${current.time}Z`);
  return { features: compact([point(s, "weather", data.longitude, data.latitude, { name: "Weather at selected coordinate", kind: "modelled weather", ...current, visibility_m: Array.isArray(hourly.visibility) && Array.isArray(hourly.time) ? hourly.visibility[hourly.time.findIndex(t => String(t).slice(0,13) === String(current.time).slice(0,13))] ?? null : null, units: data.current_units, forecast: hourly, forecast_units: data.hourly_units }, time)]), updated: time, warnings: ["Open-Meteo model output; free endpoint for non-commercial use."] };
}

async function earthquakes(s: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  const data = await fetchJson(s.endpoint);
  if (!Array.isArray(data.features)) throw new SourceFailure("ERROR", "Invalid USGS GeoJSON.");
  const features = compact(list(data.features).map(f => {
    const p = obj(f.properties), c = obj(f.geometry).coordinates;
    if (!Array.isArray(c) || (num(p.mag) ?? -1) < (q.magnitude ?? 2)) return null;
    if (distanceMeters(Number(c[0]), Number(c[1]), q) > q.radius) return null;
    return point(s, String(f.id), c[0], c[1], { name: p.place, magnitude: p.mag, depth_km: c[2], tsunami: p.tsunami, alert: p.alert, event_time: timestamp(p.time), provider_updated: timestamp(p.updated), url: p.url }, p.updated);
  }));
  return { features, updated: timestamp(obj(data.metadata).generated) };
}

async function firms(s: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  const dy = q.radius / 111320, dx = dy / Math.max(0.05, Math.cos(q.lat * Math.PI / 180));
  const bounds = [Math.max(-180, q.lon - dx), Math.max(-90, q.lat - dy), Math.min(180, q.lon + dx), Math.min(90, q.lat + dy)].join(",");
  const text = await fetchText(`${s.endpoint}/${encodeURIComponent(process.env.NASA_FIRMS_MAP_KEY!)}/VIIRS_SNPP_NRT/${bounds}/1`);
  if (!text.startsWith("latitude,")) throw new SourceFailure("ERROR", "Invalid FIRMS CSV response.");
  const records = csv(text);
  const features = compact(records.slice(0, 3000).filter(r => distanceMeters(Number(r.longitude), Number(r.latitude), q) <= q.radius).map((r, i) => point(s, i, r.longitude, r.latitude, { name: `Hotspot ${r.satellite}`, confidence: r.confidence, satellite: r.satellite, instrument: r.instrument, frp_mw: num(r.frp) }, `${r.acq_date}T${r.acq_time.padStart(4, "0").slice(0, 2)}:${r.acq_time.padStart(4, "0").slice(2)}:00Z`)));
  return { features, updated: null, truncated: records.length > 3000, warnings: ["Satellite detections are not confirmation of ground fire. Acquisition time shown per detection."] };
}

async function air(s: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  const init = { headers: { "X-API-Key": process.env.OPENAQ_API_KEY! } };
  const data = await fetchJson(url(s.endpoint, { coordinates: `${q.lat},${q.lon}`, radius: Math.min(q.radius, 25000), limit: 10 }), init);
  if (!Array.isArray(data.results)) throw new SourceFailure("ERROR", "Invalid OpenAQ response.");
  const features = (await Promise.all(list(data.results).map(async station => {
    const latest = await fetchJson(`${s.endpoint}/${station.id}/latest?limit=100`, init);
    return compact(list(latest.results).map(measurement => {
      const sensor = list(station.sensors).find(sensor => sensor.id === measurement.sensorsId);
      const parameter = obj(sensor?.parameter), coords = obj(measurement.coordinates ?? station.coordinates);
      return point(s, `${station.id}-${measurement.sensorsId}`, coords.longitude, coords.latitude, { name: station.name, sensor: measurement.sensorsId, provider: obj(station.provider).name, parameter: parameter.name, unit: parameter.units, value: measurement.value, station_id: station.id, provider_licenses: station.licenses }, obj(measurement.datetime).utc);
    }));
  }))).flat();
  return { features, updated: null, truncated: (num(obj(data.meta).found) ?? 0) > 10, warnings: ["Each sensor has its own timestamp and provider terms; unreported parameters remain absent."] };
}

async function geonames(layer: InternationalLayer, s: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  const common = { lat: q.lat, lng: q.lon, username: process.env.GEONAMES_USERNAME! };
  const call = async (path: string, params: Record<string, string | number>) => { const data = await fetchJson(url(`${s.endpoint}/${path}`, params)); if (data.status) throw new SourceFailure("ERROR", `GeoNames: ${String(obj(data.status).message)}`); return data; };
  if (layer === "places") {
    const data = await call(q.q ? "searchJSON" : "findNearbyPlaceNameJSON", q.q ? { q: q.q, username: common.username, maxRows: 20, style: "FULL" } : { ...common, radius: Math.min(30, q.radius / 1000), maxRows: 20, style: "FULL" });
    return { features: compact(list(data.geonames).map(p => point(s, String(p.geonameId), p.lng, p.lat, { name: p.name, country: p.countryName, country_code: p.countryCode, admin_region: p.adminName1, city: p.name, timezone: obj(p.timezone).timeZoneId, elevation_m: p.elevation ?? p.srtm3 ?? null, geoname_id: p.geonameId }, null, true))), updated: null };
  }
  if (layer === "timezone") {
    const data = await call("timezoneJSON", common);
    return { features: compact([point(s, "timezone", data.lng, data.lat, { name: data.timezoneId, timezone: data.timezoneId, local_time: data.time, sunrise: data.sunrise, sunset: data.sunset, gmt_offset: data.gmtOffset, dst_offset: data.dstOffset }, null, true)]), updated: null, ttl: 3600 };
  }
  const coordinates = q.points ?? [[q.lon, q.lat]];
  const features: Feature<Geometry, InternationalRecord>[] = [];
  let distance = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const [lon, lat] = coordinates[i];
    const data = await call("srtm3JSON", { ...common, lat, lng: lon });
    if (i) distance += distanceMeters(lon, lat, { ...q, lon: coordinates[i-1][0], lat: coordinates[i-1][1] });
    const elevation = num(data.srtm3);
    const feature = point(s, i, lon, lat, { name: `Elevation sample ${i + 1}`, elevation_m: elevation !== null && elevation > -32000 ? elevation : null, resolution: "SRTM3 ~90 m", distance_m: Math.round(distance) }, null, true);
    if (feature) features.push(feature);
  }
  return { features, updated: null, warnings: ["SRTM3 terrain samples (~90 m). No-data values are null. Profile distances are geodesic between submitted route samples."] };
}

export const POI_CATEGORIES: Record<string, string> = {
  restaurant: '["amenity"="restaurant"]', cafe: '["amenity"="cafe"]', hospital: '["amenity"="hospital"]', pharmacy: '["amenity"="pharmacy"]', school: '["amenity"="school"]', library: '["amenity"="library"]', park: '["leisure"="park"]', toilet: '["amenity"="toilets"]', drinking_water: '["amenity"="drinking_water"]', charging_station: '["amenity"="charging_station"]', fuel: '["amenity"="fuel"]', police: '["amenity"="police"]', fire_station: '["amenity"="fire_station"]', bus_stop: '["highway"="bus_stop"]', railway_station: '["railway"="station"]', entrance: '["entrance"]', parking: '["amenity"="parking"]', station: '["railway"="station"]',
};
async function osm(layer: InternationalLayer, s: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  const around = `(around:${Math.min(10000, q.radius)},${q.lat},${q.lon})`;
  const tags = layer === "water-refill" ? ['["amenity"="drinking_water"]'] : layer === "ev-charging" ? ['["amenity"="charging_station"]'] : layer === "accessibility" ? [`${POI_CATEGORIES[q.category ?? "toilet"] ?? POI_CATEGORIES.toilet}["wheelchair"~"^(yes|limited|no)$"]`] : layer === "transit-stops" ? ['["highway"="bus_stop"]','["railway"~"^(station|tram_stop|halt)$"]','["amenity"="ferry_terminal"]','["aeroway"="aerodrome"]'] : [POI_CATEGORIES[q.category ?? "restaurant"] ?? POI_CATEGORIES.restaurant];
  const query = `[out:json][timeout:20];(${tags.map(tag => `nwr${tag}${around};`).join("")});out meta center 1001;`;
  const request = () => ({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ data: query }).toString(), signal: AbortSignal.timeout(18000) });
  let endpoint = s.endpoint;
  let data: Record<string, unknown>;
  try { data = await fetchJson(endpoint, request()); }
  catch {
    // Public mirror listed by the OpenStreetMap project; one bounded retry only.
    endpoint = "https://overpass.private.coffee/api/interpreter";
    data = await fetchJson(endpoint, request());
  }
  if (!Array.isArray(data.elements) || data.remark) throw new SourceFailure("ERROR", "Overpass could not complete the query.");
  const rows = list(data.elements);
  const features = compact(rows.slice(0, 1000).map(element => {
    const tags = obj(element.tags), center = obj(element.center);
    return point(s, `${element.type}/${element.id}`, element.lon ?? center.lon, element.lat ?? center.lat, { ...tags, name: tags.name ?? tags.amenity ?? tags.railway ?? tags.highway ?? "OSM facility", wheelchair: tags.wheelchair ?? null, availability: layer === "ev-charging" ? "LOCATION KNOWN — real-time availability not supplied" : undefined, bottle_refill: tags.bottle ?? tags["drinking_water:refill"] ?? null, indoor: tags.indoor ?? null, osm_type: element.type, osm_id: element.id, source_url: `https://www.openstreetmap.org/${element.type}/${element.id}` }, element.timestamp, true);
  }));
  return { features, updated: timestamp(obj(data.osm3s).timestamp_osm_base), truncated: rows.length > 1000, warnings: [`Overpass endpoint: ${endpoint}`, "OSM tagged facilities; unknown tags do not establish accessibility, safety or availability. Radius capped at 10 km. Ways/relations use provider center points."] };
}

async function jakarta(s: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  const data = await fetchJson(url(`${s.endpoint}/query`, { where: "1=1", outFields: "*", outSR: 4326, f: "geojson", returnGeometry: "true", geometry: `${q.lon},${q.lat}`, geometryType: "esriGeometryPoint", inSR: 4326, distance: q.radius, units: "esriSRUnit_Meter", resultRecordCount: 1000 }));
  if (!Array.isArray(data.features)) throw new SourceFailure("ERROR", "DKI transport GIS did not return GeoJSON.");
  return { features: compact(list(data.features).map((f, i) => { const p = obj(f.properties), c = obj(f.geometry).coordinates; return Array.isArray(c) ? point(s, String(f.id ?? i), c[0], c[1], { ...p, name: p.NAMA ?? p.NAMOBJ ?? p.nama_halte ?? p.Nama ?? "Halte Transjakarta", type: "HALTE TRANSJAKARTA", availability: "Stop location; no live vehicle positions" }, null, true) : null; })), updated: null, truncated: Boolean(data.exceededTransferLimit), warnings: ["Official stop inventory. Vehicle positions and departure predictions are not published by this layer."] };
}

export async function runAdapter(layer: InternationalLayer, s: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  if (layer === "weather") return weather(s, q);
  if (layer === "earthquakes") return earthquakes(s, q);
  if (layer === "active-fire") return firms(s, q);
  if (layer === "air-quality") return air(s, q);
  if (["places", "elevation", "timezone"].includes(layer)) return geonames(layer, s, q);
  if (["poi", "water-refill", "accessibility", "ev-charging", "transit-stops"].includes(layer)) return osm(layer, s, q);
  if (layer === "jakarta-transit") return jakarta(s, q);
  if (layer === "bikeshare" || layer === "micromobility") return (await import("./gbfs")).gbfs(layer, s, q);
  return (await import("./official")).official(layer, s, q);
}
