import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSuccessResponse, createErrorResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { ApplicationError } from "@/src/lib/errors";
import {
  MerchantProfileService,
  updateMerchantProfileSchema,
} from "@/src/features/merchant-ownership";

const merchantIdSchema = z.string().uuid();

export const maxDuration = 15;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const parsedMerchantId = merchantIdSchema.safeParse((await params).id);
    if (!parsedMerchantId.success) {
      return createErrorResponse(
        reqId,
        new ApplicationError("VALIDATION_ERROR", "Merchant ID tidak valid.")
      );
    }

    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const body = await req.json().catch(() => ({}));
    const parsed = updateMerchantProfileSchema.safeParse(body);

    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message || "Payload tidak valid.";
      return createErrorResponse(reqId, new ApplicationError("VALIDATION_ERROR", errMsg));
    }

    const service = new MerchantProfileService(supabase);
    const result = await service.updateProfile(parsedMerchantId.data, userId, parsed.data);

    return createSuccessResponse(reqId, result);
  });
}

export const OPTIONS = createOptionsHandler("/api/merchants/[id]/profile");
