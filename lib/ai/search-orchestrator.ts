import { explainGroundedSearch } from "@/lib/ai/explainer";
import { parseSearchIntent } from "@/lib/ai/parser";
import {
  searchRequestSchema,
  searchResponseSchema,
  searchToolCallSchema,
  type Merchant,
  type SearchIntent,
  type SearchResponse,
  type Stakeholder,
} from "@/lib/contracts/search";
import { rankDemoMerchants } from "@/lib/geo/ranking";

type SearchInput = {
  query: string;
  stakeholder?: Stakeholder;
};

type SearchDependencies = {
  executeSearch: (intent: SearchIntent) => Merchant[] | Promise<Merchant[]>;
};

const demoDependencies: SearchDependencies = {
  executeSearch: rankDemoMerchants,
};

export async function runGroundedSearch(
  input: SearchInput,
  dependencies: SearchDependencies = demoDependencies,
): Promise<SearchResponse> {
  const request = searchRequestSchema.parse(input);
  const parsed = await parseSearchIntent(request.query, request.stakeholder);
  const toolCall = searchToolCallSchema.parse({
    name: "search_merchants",
    arguments: parsed.intent,
  });
  const results = await dependencies.executeSearch(toolCall.arguments);
  const explained = await explainGroundedSearch({ intent: parsed.intent, results });

  return searchResponseSchema.parse({
    intent: parsed.intent,
    results,
    explanation: explained.explanation,
    limitations: [
      "Hasil memakai data sintetis klaster Dukuh Atas dan bukan cakupan Jakarta lengkap.",
      "Rute, jarak, dan skor produksi harus dihitung oleh PostGIS/pgRouting atau tool GIS terverifikasi.",
      ...(parsed.source === "fallback"
        ? ["Provider AI belum aktif atau gagal; intent diproses oleh parser fallback terkontrol."]
        : []),
      ...(explained.source === "fallback"
        ? ["Grounded explanation dibuat secara deterministik tanpa model AI."]
        : []),
    ],
    source: explained.source,
    execution: {
      intentSource: parsed.source,
      explanationSource: explained.source,
      dataMode: "synthetic",
      tool: {
        ...toolCall,
        adapter: "demo-merchants",
        status: "completed",
        resultCount: results.length,
      },
      provenance: {
        dataset: "GETRA demo merchants",
        quality: "synthetic",
        coverage: "Klaster demo Dukuh Atas",
      },
    },
    generatedAt: new Date().toISOString(),
  });
}
