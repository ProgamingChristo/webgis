import { NextResponse } from "next/server";
import { AiAskRequestSchema } from "@/src/modules/ai/ai.schema";
import { AiService } from "@/src/modules/ai/ai.service";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";

export async function POST(req: Request) {
  try {
    const authorization = req.headers.get("authorization") ?? undefined;
    
    // We enforce auth for AI endpoint
    if (!authorization) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await readBoundedJsonBody(req, 8192);
    if (!body) {
      return NextResponse.json({ success: false, error: { message: "Invalid or too large request body" } }, { status: 400 });
    }

    const parsed = AiAskRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { message: "Invalid payload shape", details: parsed.error.issues } }, { status: 400 });
    }

    const aiService = new AiService(authorization);
    const result = await aiService.handleAskRequest(parsed.data);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json({ success: false, error: { message: error.message || "Internal server error" } }, { status: 500 });
  }
}
