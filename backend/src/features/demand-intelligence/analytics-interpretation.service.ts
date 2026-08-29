import { z } from "zod";
import { generateStructured } from "@/lib/ai/provider";
import type { AnalyticsInterpretation, AnalyticsRow, DemandIntelligenceResult } from "./analytics.types";

const interpretationSchema = z.object({ answer: z.string().min(1).max(1_000) }).strict();
const FORBIDDEN_CLAIMS = /pasti\s+(?:laku|untung)|untung\s+besar|roi\s+tinggi|revenue|pendapatan|ukuran\s+pasar|total\s+permintaan/i;

export class AnalyticsInterpretationService {
  async explain(result: DemandIntelligenceResult, regionId: string): Promise<AnalyticsInterpretation> {
    const row = result.rows.find((item) => item.spatial_unit.id === regionId);
    if (!row) throw new Error("Analytics region is not present in the requested result.");
    const fallback = deterministicInterpretation(result, row);
    const response = await generateStructured({
      schema: interpretationSchema,
      schemaName: "getra_demand_interpretation",
      instructions: `Explain only the supplied GETRA observed-signal facts in concise Indonesian.
Never invent or modify numbers. Never claim total population demand, revenue, profit, ROI,
market size, guaranteed opportunity, or guaranteed business success. Mention the category,
time window, evidence confidence, and that field validation may be needed.`,
      input: JSON.stringify({
        region: row.spatial_unit.name,
        category: result.category.name,
        window: result.window,
        demand_score: row.demand_score,
        supply_score: row.supply_score,
        retail_gap: row.retail_gap,
        raw_counts: row.raw_counts,
        confidence: row.evidence.confidence,
        claim_scope: result.claim_scope,
      }),
    });
    const answer = response?.data.answer;
    const allowedNumbers = collectAllowedNumbers(result, row);
    const safe = answer && !FORBIDDEN_CLAIMS.test(answer) && numbersIn(answer).every((value) => allowedNumbers.has(value));
    return {
      status: safe ? "AI" : "DETERMINISTIC_FALLBACK",
      answer: safe ? answer : fallback,
      evidence: {
        region_id: row.spatial_unit.id,
        category: result.category.slug,
        demand_score: row.demand_score,
        supply_score: row.supply_score,
        retail_gap: row.retail_gap,
        sample_size: row.evidence.sample_size,
        confidence: row.evidence.confidence,
        window: result.window,
      },
      limitations: result.limitations,
    };
  }
}

function deterministicInterpretation(result: DemandIntelligenceResult, row: AnalyticsRow): string {
  if (row.evidence.confidence === "INSUFFICIENT_DATA") {
    return `Data ${result.category.name} di ${row.spatial_unit.name} belum cukup untuk menghitung Retail Gap secara andal pada window ini.`;
  }
  const gap = row.retail_gap === null ? "belum dapat dihitung" : `${row.retail_gap}`;
  return `Berdasarkan sinyal yang tercatat di GETRA untuk ${result.category.name} di ${row.spatial_unit.name}, Demand Score ${row.demand_score}, Supply Score ${row.supply_score}, dan Retail Gap ${gap}. Bukti berstatus ${row.evidence.confidence}; hasil ini adalah indikasi relatif dan perlu validasi lapangan.`;
}

function numbersIn(value: string) {
  return [...value.matchAll(/-?\d+(?:[.,]\d+)?/g)].map((match) => Number(match[0].replace(",", ".")));
}

function collectAllowedNumbers(result: DemandIntelligenceResult, row: AnalyticsRow) {
  return new Set([
    row.demand_score,
    row.supply_score,
    row.retail_gap,
    row.evidence.sample_size,
    ...Object.values(row.raw_counts),
    new Date(result.window.start_at).getUTCFullYear(),
    new Date(result.window.end_at).getUTCFullYear(),
  ].filter((value): value is number => typeof value === "number"));
}
