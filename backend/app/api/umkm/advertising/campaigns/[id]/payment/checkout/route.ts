import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/src/lib/api-response";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import {
  PaymentCheckoutService,
  createCheckoutSchema,
} from "@/src/features/umkm-advertising/payment";

export const maxDuration = 15;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);
  const { id } = await params;

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const body = await req.json().catch(() => ({}));
    const parsed = createCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message || "Payload checkout tidak valid.";
      return createErrorResponse(reqId, new ApplicationError("VALIDATION_ERROR", errMsg));
    }

    const service = new PaymentCheckoutService(supabase);
    const result = await service.createCheckout(id, userId);

    return createSuccessResponse(reqId, result, { status: 201 });
  });
}

export const OPTIONS = createOptionsHandler(
  "/api/umkm/advertising/campaigns/[id]/payment/checkout"
);
