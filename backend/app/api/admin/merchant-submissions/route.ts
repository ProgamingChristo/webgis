import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { MerchantSubmissionService } from "@/src/features/merchant-submission";

export const maxDuration = 15;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const adminId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const service = new MerchantSubmissionService(supabase);
    const pendingSubmissions = await service.adminListPending(adminId, limit, offset);

    return createSuccessResponse(reqId, pendingSubmissions);
  });
}

export const OPTIONS = createOptionsHandler("/api/admin/merchant-submissions");
