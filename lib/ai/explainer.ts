import { z } from "zod";
import { generateStructured } from "@/lib/ai/provider";
import type { AiProvider, Merchant, SearchIntent } from "@/lib/contracts/search";

const explanationSchema = z.object({
  summary: z.string().min(1).max(500),
  limitation: z.string().min(1).max(240),
});

type ExplanationInput = {
  intent: SearchIntent;
  results: Merchant[];
};

const explainerInstructions = [
  "Anda adalah explanation layer GETRA.",
  "Jelaskan hanya fakta yang tersedia dalam JSON hasil tool.",
  "Jangan menghitung ulang, membuat koordinat, rute, skor, jumlah, atau klaim lokasi baru.",
  "Gunakan Bahasa Indonesia yang ringkas dan sebutkan keterbatasan data sintetis.",
].join(" ");

const serializeExplanationInput = (input: ExplanationInput) => JSON.stringify({
  intent: input.intent,
  results: input.results.slice(0, 5).map((result) => ({
    name: result.name,
    category: result.category,
    walkingMinutes: result.walkingMinutes,
    distanceMeters: result.distanceMeters,
    accessibilityScore: result.accessibilityScore,
    comfortScore: result.comfortScore,
    retailGapScore: result.retailGapScore,
    score: result.score,
    source: result.source,
  })),
  dataMode: "synthetic",
});

const fallbackExplanation = ({ results }: ExplanationInput) => {
  if (!results.length) {
    return "Tidak ada kandidat yang memenuhi seluruh batas keras. Ubah kategori, waktu berjalan, atau harga untuk melihat alternatif.";
  }

  const first = results[0];
  return `GETRA menemukan ${results.length} pilihan. ${first.name} berada di urutan pertama dengan waktu berjalan ${first.walkingMinutes} menit, skor akses ${first.accessibilityScore}/100, dan retail gap ${first.retailGapScore}/100.`;
};

export async function explainGroundedSearch(
  input: ExplanationInput,
): Promise<{ explanation: string; source: AiProvider }> {
  const generated = await generateStructured({
    schema: explanationSchema,
    schemaName: "getra_grounded_explanation",
    instructions: explainerInstructions,
    input: serializeExplanationInput(input),
    maxTokens: 600,
  });

  if (generated) {
    return {
      explanation: `${generated.data.summary} Keterbatasan: ${generated.data.limitation}`,
      source: generated.source,
    };
  }

  return { explanation: fallbackExplanation(input), source: "fallback" };
}
