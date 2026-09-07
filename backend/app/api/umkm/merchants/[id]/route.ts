import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { UmkmWorkspaceService } from "@/src/features/umkm-workspace";

const merchantIdSchema = z.string().uuid();

export const maxDuration = 15;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const requestId = getRequestId(req);

  return withApiLogger(req, requestId, async () => {
    await requireAuthenticatedUser(req);

    const parsedMerchantId = merchantIdSchema.safeParse((await params).id);
    if (!parsedMerchantId.success) {
      return createExpectedError(requestId, 400, "VALIDATION_ERROR", "ID usaha tidak valid.");
    }

    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);
    const workspaceService = new UmkmWorkspaceService(supabase);
    const result = await workspaceService.archiveOwnedMerchant(parsedMerchantId.data);

    switch (result.status) {
      case "ARCHIVED":
      case "ALREADY_ARCHIVED":
        return createSuccessResponse(requestId, result);
      case "ACTIVE_CAMPAIGNS":
        return createExpectedError(
          requestId,
          409,
          "CONFLICT",
          `Selesaikan atau batalkan ${result.blocking_campaigns_count} campaign aktif sebelum menghapus usaha.`,
        );
      case "FORBIDDEN":
        return createExpectedError(
          requestId,
          403,
          "FORBIDDEN",
          "Anda hanya dapat menghapus usaha milik sendiri.",
        );
      case "NOT_FOUND":
        return createExpectedError(requestId, 404, "NOT_FOUND", "Usaha tidak ditemukan.");
    }
  });
}

function createExpectedError(
  requestId: string,
  status: number,
  code: "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR",
  message: string,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, retryable: false },
      request_id: requestId,
    },
    {
      status,
      headers: { "Cache-Control": "no-store", "x-request-id": requestId },
    },
  );
}

export const OPTIONS = createOptionsHandler("/api/umkm/merchants/[id]");
