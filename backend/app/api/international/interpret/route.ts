import { z } from "zod";
import { isInternationalLayer } from "@/types/international";
import { querySchema } from "@/src/features/international/service";
import { internationalDataTool } from "@/src/features/international/interpret";
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 16000) return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const text = await request.text(); if (text.length > 16000) return Response.json({ error: "Request too large" }, { status: 413 });
    const input = z.object({ layer: z.string(), query: querySchema }).parse(JSON.parse(text));
    if (!isInternationalLayer(input.layer)) return Response.json({ error: "Unknown layer" }, { status: 400 });
    const { answer, result } = await internationalDataTool(input.layer, input.query);
    return Response.json({ answer, source: result.source, status: result.status, generated_by: "deterministic source interpretation" });
  } catch { return Response.json({ error: "Cannot interpret unavailable or invalid data." }, { status: 400 }); }
}
