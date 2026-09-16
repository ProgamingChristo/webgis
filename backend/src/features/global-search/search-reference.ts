import type { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import type { CommuterOrigin } from "@/src/features/commuter/commuter.types";
import { entityRetrievalTerms, resolveEntityCandidates } from "@/types/entity-resolution";
export interface SearchReference { id?: string; label: string; longitude: number; latitude: number; type: "USER_LOCATION" | "TRANSIT" | "SELECTED_POINT" }

export const KNOWN_TRANSIT_STATIONS: Array<{ label: string; aliases: string[]; longitude: number; latitude: number }> = [
  { label: "Stasiun Manggarai", aliases: ["stasiun manggarai", "st manggarai", "manggarai"], longitude: 106.849935, latitude: -6.21017 },
  { label: "Stasiun Tanah Abang", aliases: ["stasiun tanah abang", "st tanah abang", "tanah abang"], longitude: 106.810894, latitude: -6.185713 },
  { label: "Stasiun Sudirman", aliases: ["stasiun sudirman", "st sudirman", "sudirman"], longitude: 106.8236, latitude: -6.2023 },
  { label: "Stasiun Tebet", aliases: ["stasiun tebet", "st tebet", "tebet"], longitude: 106.8581, latitude: -6.2263 },
  { label: "Stasiun Gambir", aliases: ["stasiun gambir", "st gambir", "gambir"], longitude: 106.8307, latitude: -6.1767 },
  { label: "Stasiun Juanda", aliases: ["stasiun juanda", "st juanda", "juanda"], longitude: 106.8300, latitude: -6.1668 },
  { label: "Stasiun Cikini", aliases: ["stasiun cikini", "st cikini", "cikini"], longitude: 106.8415, latitude: -6.1985 },
  { label: "Stasiun Gondangdia", aliases: ["stasiun gondangdia", "st gondangdia", "gondangdia"], longitude: 106.8329, latitude: -6.1865 },
  { label: "Stasiun Jakarta Kota", aliases: ["stasiun jakarta kota", "st jakarta kota", "stasiun kota", "kota"], longitude: 106.8142, latitude: -6.1376 },
  { label: "Stasiun Pasar Minggu", aliases: ["stasiun pasar minggu", "st pasar minggu", "pasar minggu"], longitude: 106.8443, latitude: -6.2842 },
  { label: "Stasiun Palmerah", aliases: ["stasiun palmerah", "st palmerah", "palmerah"], longitude: 106.7972, latitude: -6.2072 },
  { label: "Stasiun Karet", aliases: ["stasiun karet", "st karet", "karet"], longitude: 106.8175, latitude: -6.2012 },
  { label: "Stasiun Duren Kalibata", aliases: ["stasiun duren kalibata", "st duren kalibata", "duren kalibata", "kalibata"], longitude: 106.8553, latitude: -6.2555 },
  { label: "Stasiun Pasar Senen", aliases: ["stasiun pasar senen", "st pasar senen", "pasar senen", "senen"], longitude: 106.8436, latitude: -6.1744 },
  { label: "Stasiun Jatinegara", aliases: ["stasiun jatinegara", "st jatinegara", "jatinegara"], longitude: 106.8680, latitude: -6.2151 },
  { label: "Stasiun Cakung", aliases: ["stasiun cakung", "st cakung", "cakung"], longitude: 106.9535, latitude: -6.2195 },
  { label: "Stasiun Klender", aliases: ["stasiun klender", "st klender", "klender"], longitude: 106.8996, latitude: -6.2132 },
  { label: "Stasiun Buaran", aliases: ["stasiun buaran", "st buaran", "buaran"], longitude: 106.9242, latitude: -6.2163 },
  { label: "Stasiun Cawang", aliases: ["stasiun cawang", "st cawang", "cawang"], longitude: 106.8588, latitude: -6.2427 },
];

export async function resolveSearchReference(supabase: SupabaseClient, name: string | undefined, origin: CommuterOrigin | null): Promise<SearchReference | null> {
  if (!name) return origin ? { ...origin, type: origin.source === "USER_LOCATION" ? "USER_LOCATION" : "SELECTED_POINT", label: origin.source === "USER_LOCATION" ? "lokasi saya" : "titik pilihan" } : null;

  const retrievalTerm = entityRetrievalTerms(name)[0] ?? name.trim();
  const { data, error } = await supabase.from("transport_nodes").select("id,name,geometry")
    .ilike("name", `%${retrievalTerm.replace(/[\\%_]/g, "\\$&")}%`).limit(20);
  if (error) throw error;

  if (data && data.length > 0) {
    const resolution = resolveEntityCandidates(name, data, (node) => node.name);
    if (resolution.status !== "RESOLVED") throw new ApplicationError("VALIDATION_ERROR", "Nama stasiun atau halte belum dapat dipastikan. Gunakan nama lengkap.");
    const node = resolution.candidate.value;
    const coordinates = node.geometry?.coordinates;
    if (!Array.isArray(coordinates) || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) throw new ApplicationError("VALIDATION_ERROR");
    return { id: node.id, label: node.name, type: "TRANSIT", longitude: coordinates[0], latitude: coordinates[1] };
  }

  // Fallback for environments where transport_nodes table is unpopulated
  const normalizedName = name.trim().toLowerCase();
  for (const station of KNOWN_TRANSIT_STATIONS) {
    if (station.aliases.some(alias => normalizedName === alias || normalizedName.includes(alias))) {
      return {
        id: `transit-${station.label.toLowerCase().replace(/\s+/g, "-")}`,
        label: station.label,
        type: "TRANSIT",
        longitude: station.longitude,
        latitude: station.latitude,
      };
    }
  }

  throw new ApplicationError("VALIDATION_ERROR", "Nama stasiun atau halte belum dapat dipastikan. Gunakan nama lengkap.");
}

/** Server-side spherical distance in meters. This is never a walking distance/time. */
export function referenceDistance(reference: Pick<SearchReference, "longitude" | "latitude">, point: { longitude: number; latitude: number }) {
  const rad = Math.PI / 180;
  const a = Math.sin((point.latitude - reference.latitude) * rad / 2) ** 2
    + Math.cos(reference.latitude * rad) * Math.cos(point.latitude * rad)
    * Math.sin((point.longitude - reference.longitude) * rad / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export function referenceBounds(reference: SearchReference, radius: number) {
  const latitude = radius / 111000;
  const longitude = latitude / Math.max(.01, Math.cos(reference.latitude * Math.PI / 180));
  return { west: Math.max(-180, reference.longitude - longitude), east: Math.min(180, reference.longitude + longitude), south: Math.max(-90, reference.latitude - latitude), north: Math.min(90, reference.latitude + latitude) };
}
