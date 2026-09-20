import type { InternationalLayer, InternationalQuery, InternationalResult } from "@/types/international";
import type { AiAskRequest, AiAskResponse } from "@/src/modules/ai/ai.schema";
import { queryInternational } from "./service";

/** This is a data tool, not generated knowledge. The AI may interpret this result
 * but cannot replace timestamps, measures, coordinates, statuses or GIS calculations. */
export async function internationalDataTool(layer: InternationalLayer, query: InternationalQuery) {
  const result = await queryInternational(layer, query);
  return { result, answer: interpretData(result) };
}
export function interpretData(result: InternationalResult): string {
  const origin = `${result.source.provider} / ${result.source.name}`;
  if (!result.fetched_at) return `${origin}: ${result.message ?? "No live data available."} Tidak ada nilai pengamatan yang dapat disimpulkan. Buka /international/${result.layer} untuk memeriksa sumber.`;
  const count = result.data.features.length;
  const first = result.data.features[0]?.properties;
  const fields = first ? Object.entries(first).filter(([key, value]) => ["temperature_2m", "temperature_c", "humidity_percent", "relative_humidity_2m", "precipitation", "wind_speed_10m", "wind_kmh", "magnitude", "depth_km", "value", "unit", "parameter", "elevation_m", "timezone", "local_time", "sunrise", "sunset", "available_bikes", "available_docks", "wheelchair", "official_status", "availability", "confidence"].includes(key) && value !== null && value !== undefined).map(([key, value]) => `${key}: ${String(value)}`).join("; ") : "";
  return `${origin}: ${count} catatan spasial dalam hasil kueri${result.truncated ? " (dibatasi provider)" : ""}. ${first ? `Catatan pertama: ${first.name}. ${fields}. Waktu catatan: ${first.timestamp ?? "tidak dipublikasikan"}; freshness: ${first.freshness}. ` : "Tidak ada pengamatan untuk disimpulkan. "}Status feed: ${result.status}; waktu sumber: ${result.last_updated ?? "tidak dipublikasikan"}; diambil: ${result.fetched_at}; TTL: ${result.ttl} detik. ${result.status === "STALE" ? "Data kedaluwarsa; jangan diperlakukan sebagai kondisi saat ini. " : ""}${result.warnings.join(" ")} Sumber: ${result.source.endpoint}`;
}

export const INTERNATIONAL_INTENTS: [RegExp, InternationalLayer][] = [
  [/\b(gempa|earthquake)\b/i, "earthquakes"], [/\b(hotspot|active fire|titik panas)\b/i, "active-fire"],
  [/\b(kualitas udara|air quality|pm2[.,]5|polusi udara)\b/i, "air-quality"],
  [/\b(radar cuaca|weather radar)\b/i, "weather-radar"], [/\b(satelit cuaca|satellite weather|citra awan)\b/i, "weather-satellite"],
  [/\b(cuaca|weather|suhu sekarang)\b/i, "weather"], [/\b(tinggi muka air|banjir|flood)\b/i, "flood"],
  [/\b(bencana|disaster)\b/i, "disaster"], [/\b(stasiun sepeda|bike share|bikeshare|gbfs|sepeda tersedia)\b/i, "bikeshare"],
  [/\b(skuter|scooter|mikromobilitas|micromobility)\b/i, "micromobility"],
  [/\b(charging station|ev charging|pengisian kendaraan|spklu)\b/i, "ev-charging"],
  [/\b(toilet.*akses|wheelchair|fasilitas aksesibel|toilet aksesibel|ramp terdekat)\b/i, "accessibility"], [/\b(air minum|water refill|drinking water)\b/i, "water-refill"],
  [/\b(elevasi|elevation|ketinggian tanah)\b/i, "elevation"], [/\b(zona waktu|timezone|matahari terbit|sunrise|sunset)\b/i, "timezone"],
  [/\b(peta halte transjakarta|jakarta transit)\b/i, "jakarta-transit"], [/\b(transit stops|global transit)\b/i, "transit-stops"],
  [/\b(geocoding|geonames|cari nama tempat)\b/i, "places"], [/\b(open data|data terbuka)\b/i, "open-data"], [/\b(osm poi|fasilitas terdekat|rumah sakit terdekat|apotek terdekat)\b/i, "poi"],
];
export async function answerInternational(req: AiAskRequest): Promise<AiAskResponse | null> {
  const matchedLayers = [...new Set(INTERNATIONAL_INTENTS.filter(([pattern]) => pattern.test(req.question)).map(([, layer]) => layer))];
  // Radar/satellite are more specific than the word 'weather'.
  const layers = matchedLayers.filter(layer => layer !== "weather" || !matchedLayers.some(l => l === "weather-radar" || l === "weather-satellite")).slice(0, 3);
  const layer = layers[0];
  if (!layer) return null;
  let location = req.context?.origin;
  const named = req.question.match(/(?:\bdi\s+(?:sekitar\s+)?|\bdekat\s+)(.+?)(?:\s+(?:sekarang|terbaru|hari ini))?[?!.]*$/i)?.[1]?.trim();
  if (named && !/^(sini|lokasi ini|rute saya|sana)$/i.test(named)) {
    const places = await queryInternational("places", { lat: location?.latitude ?? 0, lon: location?.longitude ?? 0, radius: 10000, q: named });
    const first = places.data.features[0];
    if (!first || first.geometry.type !== "Point") return { answer: `Lokasi “${named}” belum dapat di-resolve dari GeoNames. ${places.message ?? "Pilih koordinat lokasi pada peta."}`, intent: "ENVIRONMENT", provider: "deterministic", evidence: [], limitations: ["Koordinat tidak boleh ditebak."], action: { type: "NAVIGATE", path: `/international/${layer}`, label: "Buka layer data" } };
    location = { longitude: first.geometry.coordinates[0], latitude: first.geometry.coordinates[1] };
  }
  if (!location) return { answer: `Pilih lokasi pada peta /international/${layer} agar GETRA dapat memanggil sumber data untuk koordinat yang benar.`, intent: "ENVIRONMENT", provider: "deterministic", evidence: [], limitations: ["Belum ada koordinat lokasi."], action: { type: "NAVIGATE", path: `/international/${layer}`, label: "Buka layer data" } };
  if (layer === "open-data") return { answer: "Pilih dataset di /international/open-data. GETRA hanya memuat sumber yang Anda pilih dan menampilkan timestamp serta lisensinya.", intent: "ENVIRONMENT", provider: "deterministic", evidence: [], limitations: [], action: { type: "NAVIGATE", path: `/international/${layer}`, label: "Buka layer data" } };
  const answers = await Promise.all(layers.map(async id => internationalDataTool(id, { lat: location.latitude, lon: location.longitude, radius: id === "earthquakes" || id === "active-fire" ? 250000 : 10000, category: /apotek/i.test(req.question) ? "pharmacy" : /rumah sakit/i.test(req.question) ? "hospital" : id === "accessibility" ? "toilet" : undefined })));
  return { answer: answers.map(a => a.answer).join("\n\n"), intent: "ENVIRONMENT", provider: "deterministic", evidence: answers.map(({ result }) => ({ source: result.source.provider, dataset: result.source.name, description: `${result.source.endpoint}; fetched=${result.fetched_at}; updated=${result.last_updated}; status=${result.status}` })), limitations: answers.flatMap(a => a.result.warnings), action: { type: "NAVIGATE", path: `/international/${layer}`, label: "Buka layer data" } };
}
