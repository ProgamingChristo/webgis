import type { NextRequest } from "next/server";

import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { withApiLogger } from "@/src/lib/api-logger";
import { requireRole } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";
import { AdminMerchantClaimService } from "@/src/features/merchant-ownership";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    await requireRole(req, "ADMIN");

    const { searchParams } = new URL(req.url);
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

    const service = new AdminMerchantClaimService(getServiceRoleSupabaseClient());
    const claims = await service.list(limit, offset);

    return createSuccessResponse(reqId, claims);
  });
}

export const OPTIONS = createOptionsHandler("/api/admin/merchant-claims");
