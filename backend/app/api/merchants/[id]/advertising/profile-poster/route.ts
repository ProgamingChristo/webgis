import { NextRequest, NextResponse } from "next/server";
import { ProfilePosterServingService } from "@/src/features/umkm-advertising";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const { id: merchantId } = await context.params;

    if (!merchantId || merchantId.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Merchant ID wajib diisi.",
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = getRequestSupabaseClient(authHeader || "");

    const posterService = new ProfilePosterServingService(supabase);
    const poster = await posterService.getProfilePosterForMerchant(merchantId);

    const response = createSuccessResponse(reqId, poster);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  });
}

export const OPTIONS = createOptionsHandler("/api/merchants/[id]/advertising/profile-poster");
