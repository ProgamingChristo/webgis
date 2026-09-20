import { z } from "zod";
import { isInternationalLayer } from "@/types/international";
import { querySchema } from "@/src/features/international/service";
import { internationalDataTool } from "@/src/features/international/interpret";
import { NextRequest } from "next/server";
import { internationalRequest } from "@/src/features/international/request";
import { readBoundedJsonBody } from "@/src/lib/request-body";
import { createOptionsHandler } from "@/src/lib/api-security";
import { ApplicationError } from "@/src/lib/errors";
export async function POST(request: NextRequest) {
  return internationalRequest(request, async () => {
  if (Number(request.headers.get("content-length") ?? 0) > 16000) return Response.json({ error: "Request too large" }, { status: 413 });
  try {
    const input = z.object({ layer: z.string(), query: querySchema }).parse(await readBoundedJsonBody(request, 16000));
    if (!isInternationalLayer(input.layer)) return Response.json({ error: "Unknown layer" }, { status: 400 });
    const { answer, result } = await internationalDataTool(input.layer, input.query);
    return Response.json({ answer, source: result.source, status: result.status, generated_by: "deterministic source interpretation" });
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    return Response.json({ error: "Cannot interpret unavailable or invalid data." }, { status: 400 });
  }
  });
}
export const OPTIONS = createOptionsHandler("/api/international/interpret");
