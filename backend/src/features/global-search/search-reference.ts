import type { SupabaseClient } from "@supabase/supabase-js";
import { ApplicationError } from "@/src/lib/errors";
import type { CommuterOrigin } from "@/src/features/commuter/commuter.types";
import { entityRetrievalTerms, resolveEntityCandidates } from "@/types/entity-resolution";

export interface SearchReference { id?: string; label: string; longitude: number; latitude: number; type: "USER_LOCATION" | "TRANSIT" | "SELECTED_POINT" }

export async function resolveSearchReference(supabase: SupabaseClient, name: string | undefined, origin: CommuterOrigin | null): Promise<SearchReference | null> {
  if (!name) return origin ? { ...origin, type: origin.source === "USER_LOCATION" ? "USER_LOCATION" : "SELECTED_POINT", label: origin.source === "USER_LOCATION" ? "lokasi saya" : "titik pilihan" } : null;
  const retrievalTerm = entityRetrievalTerms(name)[0] ?? name.trim();
  const { data, error } = await supabase.from("transport_nodes").select("id,name,geometry")
    .ilike("name", `%${retrievalTerm.replace(/[\\%_]/g, "\\$&")}%`).limit(20);
  if (error) throw error;
  const resolution = resolveEntityCandidates(name, data ?? [], (node) => node.name);
  if (resolution.status !== "RESOLVED") throw new ApplicationError("VALIDATION_ERROR", "Nama stasiun atau halte belum dapat dipastikan. Gunakan nama lengkap.");
  const node = resolution.candidate.value;
  const coordinates = node.geometry?.coordinates;
  if (!Array.isArray(coordinates) || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) throw new ApplicationError("VALIDATION_ERROR");
  return { id: node.id, label: node.name, type: "TRANSIT", longitude: coordinates[0], latitude: coordinates[1] };
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
