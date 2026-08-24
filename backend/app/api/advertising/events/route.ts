import { NextRequest, NextResponse } from "next/server";
import {
  CampaignEventService,
  recordCampaignEventSchema,
} from "@/src/features/umkm-advertising";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Format JSON body tidak valid.",
            code: "INVALID_JSON",
          },
        },
        { status: 400 }
      );
    }

    const parsed = recordCampaignEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: parsed.error.issues[0]?.message || "Payload event tidak valid.",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = getRequestSupabaseClient(authHeader || "");

    const eventService = new CampaignEventService(supabase);
    const result = await eventService.recordEvent(parsed.data);

    const response = createSuccessResponse(reqId, result);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  });
}

export const OPTIONS = createOptionsHandler("/api/advertising/events");
