import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/src/lib/api-response";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import {
  MerchantSubmissionService,
  updateMerchantSubmissionSchema,
} from "@/src/features/merchant-submission";

export const maxDuration = 15;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);
  const { id } = await params;

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const service = new MerchantSubmissionService(supabase);
    const submission = await service.getSubmissionById(id, userId);

    return createSuccessResponse(reqId, submission);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);
  const { id } = await params;

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const body = await req.json().catch(() => null);
    const parsed = updateMerchantSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message || "Payload tidak valid.";
      return createErrorResponse(reqId, new ApplicationError("VALIDATION_ERROR", errMsg));
    }

    const service = new MerchantSubmissionService(supabase);
    const updated = await service.updateDraft(id, userId, parsed.data);

    return createSuccessResponse(reqId, updated);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/merchant-submissions/[id]");
