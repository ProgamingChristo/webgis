import { generateStructured } from "@/lib/ai/provider";
import { searchIntentSchema, type AiProvider, type SearchIntent, type Stakeholder } from "@/lib/contracts/search";

const parserInstructions = [
  "Anda adalah parser intent GETRA, bukan mesin GIS.",
  "Ekstrak preferensi pengguna ke schema yang diberikan.",
  "Jangan membuat koordinat, rute, skor, jarak, atau fakta lokasi.",
  "Gunakan default yang aman ketika informasi tidak disebutkan.",
].join(" ");

function fallbackIntent(query: string, stakeholder?: Stakeholder): SearchIntent {
  const text = query.toLowerCase();
  const minuteMatch = text.match(/(\d{1,2})\s*(?:menit|min)/);
  const maxWalkingMinutes = minuteMatch ? Math.min(30, Math.max(3, Number(minuteMatch[1]))) : 10;
  const category = text.includes("kopi") || text.includes("coffee")
    ? "kopi"
    : text.includes("klinik") || text.includes("obat")
      ? "kesehatan"
      : text.includes("laundry")
        ? "jasa"
        : "kuliner";

  return searchIntentSchema.parse({
    stakeholder: stakeholder ?? (text.includes("invest") ? "investor" : text.includes("umkm") ? "umkm" : "commuter"),
    originName: text.includes("blok m") ? "Stasiun Blok M" : "Stasiun Dukuh Atas",
    category,
    maxWalkingMinutes,
    priceLevel: text.includes("murah") || text.includes("hemat") ? "hemat" : text.includes("premium") ? "premium" : "semua",
    openNow: text.includes("buka sekarang") || text.includes("masih buka"),
    accessibilityNeeds: [
      ...(text.includes("kursi roda") || text.includes("tanpa tangga") ? ["step_free" as const] : []),
      ...(text.includes("terang") ? ["well_lit" as const] : []),
      ...(text.includes("penyeberangan") ? ["safe_crossing" as const] : []),
    ],
    sortBy: text.includes("terdekat") ? "closest" : text.includes("akses") ? "accessibility" : text.includes("peluang") ? "opportunity" : "best_match",
  });
}

export async function parseSearchIntent(
  query: string,
  stakeholder?: Stakeholder,
): Promise<{ intent: SearchIntent; source: AiProvider }> {
  const generated = await generateStructured({
    schema: searchIntentSchema,
    schemaName: "getra_search_intent",
    instructions: parserInstructions,
    input: query,
    maxTokens: 700,
  });

  if (generated) {
    return {
      intent: searchIntentSchema.parse({
        ...generated.data,
        stakeholder: stakeholder ?? generated.data.stakeholder,
      }),
      source: generated.source,
    };
  }

  return { intent: fallbackIntent(query, stakeholder), source: "fallback" };
}
