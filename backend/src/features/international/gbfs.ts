import type { InternationalLayer, InternationalQuery, InternationalSource } from "@/types/international";
import type { Feature, Geometry } from "geojson";
import type { InternationalRecord } from "@/types/international";
import { csv, fetchJson, fetchText, list, num, obj, SourceFailure, timestamp } from "./http";
import { point, distanceMeters, type AdapterResult } from "./adapters";

let catalog: { time: number; rows: Record<string, string>[] } | undefined;
export async function gbfs(layer: InternationalLayer, source: InternationalSource, q: InternationalQuery): Promise<AdapterResult> {
  if (!catalog || Date.now() - catalog.time > 86400000) catalog = { time: Date.now(), rows: csv(await fetchText(source.endpoint)) };
  const systems = catalog.rows.filter(r => !q.q || `${r.Name} ${r.Location} ${r['Country Code']}`.toLowerCase().includes(q.q.toLowerCase())).map(r => ({ id: r['System ID'], name: r.Name, country: r['Country Code'], location: r.Location }));
  if (!q.system) return { features: [], updated: null, systems, warnings: ["Select a published GBFS system. Catalog presence does not guarantee an operational feed."], ttl: 3600 };
  const selected = catalog.rows.find(r => r['System ID'] === q.system);
  if (!selected) throw new SourceFailure("UNAVAILABLE", "System not found in MobilityData catalog.");
  if (selected['Authentication Type']) throw new SourceFailure("AUTH_REQUIRED", "Operator requires GBFS credentials.");
  const discovery = await fetchJson(selected['Auto-Discovery URL']);
  const discoveryData = obj(discovery.data);
  const feeds = list(discoveryData.feeds ?? obj(discoveryData.en ?? Object.values(discoveryData)[0]).feeds);
  const feed = async (name: string, required = false) => {
    const definition = feeds.find(f => f.name === name);
    if (!definition || typeof definition.url !== "string") { if (required) throw new SourceFailure("UNAVAILABLE", `Operator does not publish ${name}.`); return {}; }
    return fetchJson(definition.url);
  };
  const info = await feed("system_information", true);
  const infoData = obj(info.data);
  const s = { ...source, provider: String(infoData.name ?? selected.Name), name: `${selected.Name} GBFS`, license: String(infoData.license_url ?? infoData.license_id ?? "Operator license not supplied") };
  const warnings: string[] = [];
  const features: Feature<Geometry, InternationalRecord>[] = [];
  if (layer === "bikeshare") {
    const [stations, status] = await Promise.all([feed("station_information", true), feed("station_status", true)]);
    const statuses = new Map(list(obj(status.data).stations).map(r => [r.station_id, r]));
    const ttl = Math.max(1, num(status.ttl) ?? 60); s.refresh_interval = ttl;
    for (const station of list(obj(stations.data).stations)) {
      const state = statuses.get(station.station_id);
      const p = point(s, String(station.station_id), station.lon, station.lat, { name: station.name, capacity: station.capacity ?? null, available_bikes: state?.num_vehicles_available ?? state?.num_bikes_available ?? null, available_docks: state?.num_docks_available ?? null, is_renting: state?.is_renting ?? null, is_returning: state?.is_returning ?? null, is_installed: state?.is_installed ?? null, vehicle_types_available: state?.vehicle_types_available ?? null, feed_updated: timestamp(status.last_updated), ttl, system_id: q.system }, state?.last_reported ?? null);
      if (p && distanceMeters(Number(station.lon), Number(station.lat), q) <= q.radius) features.push(p);
    }
    if ([...statuses.values()].length === 0) warnings.push("Station status feed contains no reports. Availability is unknown.");
    return { features: features.slice(0, 3000), updated: timestamp(status.last_updated), ttl, truncated: features.length > 3000, warnings };
  }
  const types = await feed("vehicle_types", true);
  const kinds = new Map(list(obj(types.data).vehicle_types).map(t => [t.vehicle_type_id, t]));
  const vehicles = await feed(feeds.some(f => f.name === "vehicle_status") ? "vehicle_status" : "free_bike_status", true);
  const ttl = Math.max(1, num(vehicles.ttl) ?? 60); s.refresh_interval = ttl;
  const rows = list(obj(vehicles.data).vehicles ?? obj(vehicles.data).bikes);
  for (const vehicle of rows) {
    const kind = kinds.get(vehicle.vehicle_type_id);
    if (!kind || !["scooter", "scooter_standing", "scooter_seated", "moped", "cargo_bicycle"].includes(String(kind.form_factor))) continue;
    const p = point(s, String(vehicle.vehicle_id ?? vehicle.bike_id), vehicle.lon, vehicle.lat, { name: `${selected.Name} ${kind.form_factor}`, vehicle_type: kind.form_factor, is_reserved: vehicle.is_reserved ?? null, is_disabled: vehicle.is_disabled ?? null, station_id: vehicle.station_id ?? null, current_range_meters: vehicle.current_range_meters ?? null, current_fuel_percent: vehicle.current_fuel_percent ?? null, ttl, system_id: q.system }, vehicle.last_reported ?? vehicles.last_updated);
    if (p && distanceMeters(Number(vehicle.lon), Number(vehicle.lat), q) <= q.radius) features.push(p);
  }
  warnings.push("Only published vehicle types and coordinates are mapped. Missing battery/availability is unknown.");
  return { features: features.slice(0, 3000), updated: timestamp(vehicles.last_updated), ttl, truncated: features.length > 3000, warnings };
}
