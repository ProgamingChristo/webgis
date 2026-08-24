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
  adminApproveSubmissionSchema,
} from "@/src/features/merchant-submission";

export const maxDuration = 15;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const reqId = getRequestId(req);
  const { id } = await params;

  return withApiLogger(req, reqId, async () => {
    const adminId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const body = await req.json().catch(() => ({}));
    const parsed = adminApproveSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message || "Payload tidak valid.";
      return createErrorResponse(reqId, new ApplicationError("VALIDATION_ERROR", errMsg));
    }

    const service = new MerchantSubmissionService(supabase);
    const result = await service.adminApprove(id, adminId, parsed.data.note);

    return createSuccessResponse(reqId, result);
  });
}

export const OPTIONS = createOptionsHandler("/api/admin/merchant-submissions/[id]/approve");
