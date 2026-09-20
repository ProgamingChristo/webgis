import { INTERNATIONAL_INTENTS } from "@/src/features/international/interpret";
export type RoutedIntent = "SEARCH_PLACE" | "NEARBY" | "ROUTE" | "TRANSIT" | "UMKM" | "PROMOTION" | "CCTV" | "SENSOR" | "WEATHER" | "EARTHQUAKE" | "FIRE" | "AIR_QUALITY" | "FLOOD" | "ACCESSIBILITY" | "COMMUNITY" | "ADMIN" | "GENERAL_HELP" | "INTERNATIONAL";
const rules: [RoutedIntent, RegExp][] = [
  ["ADMIN", /\b(admin|moderasi|moderator|hak akses|approve|kurasi)\b/i],
  ["CCTV", /\b(cctv|kamera|camera|frame|deteksi kendaraan|ai vision)\b/i],
  ["SENSOR", /\b(sensor|telemetri|ispu|kebisingan)\b/i],
  ["PROMOTION", /\b(promo|promosi|iklan|kampanye|campaign|midtrans|pembayaran|invoice)\b/i],
  ["COMMUNITY", /\b(komunitas|community|postingan|laporan warga|komentar|posting|kontribusi)\b/i],
  ["ROUTE", /\b(rute|route|navigasi|journey|jalan kaki dari|naik motor dari|naik mobil dari|reroute)\b/i],
  ["ACCESSIBILITY", /\b(aksesibel|aksesibilitas|wheelchair|kursi roda|disabilitas|ramp|trotoar)\b/i],
  ["WEATHER", /\b(cuaca|weather|hujan|suhu|angin|kelembapan|prakiraan|radar|satelit)\b/i],
  ["EARTHQUAKE", /\b(gempa|earthquake|magnitudo)\b/i],
  ["FIRE", /\b(hotspot|titik panas|kebakaran|firms|active fire)\b/i],
  ["AIR_QUALITY", /\b(kualitas udara|air quality|polusi|pm2|pm10|aqi|openaq)\b/i],
  ["FLOOD", /\b(banjir|flood|muka air|pintu air|pompa)\b/i],
  ["TRANSIT", /\b(transit|halte|stasiun|transjakarta|krl|mrt|angkutan|kereta)\b/i],
  ["UMKM", /\b(umkm|merchant|warung|bakso|kuliner|usaha|toko|restoran|owner)\b/i],
  ["INTERNATIONAL", /\b(gbfs|sepeda|skuter|scooter|elevasi|elevation|timezone|zona waktu|geonames|osm|spklu|charging|air minum|water refill|open data|data terbuka)\b/i],
  ["NEARBY", /\b(terdekat|nearby|di sekitar)\b/i],
  ["SEARCH_PLACE", /\b(cari|search|lokasi|alamat|tempat)\b/i],
];
export function routeAssistantIntent(question: string) {
  const intents = rules.filter(([, rule]) => rule.test(question)).map(([intent]) => intent);
  return { intents: intents.length ? intents : ["GENERAL_HELP" as const], international_tools: [...new Set(INTERNATIONAL_INTENTS.filter(([rule]) => rule.test(question)).map(([, layer]) => layer))] };
}
