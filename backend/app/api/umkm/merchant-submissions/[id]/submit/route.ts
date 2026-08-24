import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { MerchantSubmissionService } from "@/src/features/merchant-submission";

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

    const service = new MerchantSubmissionService(supabase);
    const result = await service.submitForReview(id, userId);

    return createSuccessResponse(reqId, result);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/merchant-submissions/[id]/submit");
