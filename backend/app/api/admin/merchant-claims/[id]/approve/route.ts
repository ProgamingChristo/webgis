import type { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { withApiLogger } from "@/src/lib/api-logger";
import { requireRole } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import {
  AdminMerchantClaimService,
  adminApproveMerchantClaimSchema,
} from "@/src/features/merchant-ownership";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const reqId = getRequestId(req);
  const { id } = await params;

  return withApiLogger(req, reqId, async () => {
    const { userId: adminId } = await requireRole(req, "ADMIN");
    const body = await req.json().catch(() => ({}));
    const parsed = adminApproveMerchantClaimSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Payload tidak valid.";
      return createErrorResponse(reqId, new ApplicationError("VALIDATION_ERROR", message));
    }

    const service = new AdminMerchantClaimService(
      getRequestSupabaseClient(req.headers.get("Authorization")!),
    );
    const claim = await service.approve(id, adminId, parsed.data.note);

    return createSuccessResponse(reqId, claim);
  });
}

export const OPTIONS = createOptionsHandler("/api/admin/merchant-claims/[id]/approve");
