import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/src/lib/api-response";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import {
  PaymentWebhookService,
  midtransNotificationSchema,
} from "@/src/features/umkm-advertising/payment";

export const maxDuration = 15;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const body = await req.json().catch(() => ({}));
    const parsed = midtransNotificationSchema.safeParse(body);

    if (!parsed.success) {
      const errMsg =
        parsed.error.issues[0]?.message || "Payload notifikasi Midtrans tidak valid.";
      return createErrorResponse(reqId, new ApplicationError("VALIDATION_ERROR", errMsg));
    }

    const supabase = getServiceRoleSupabaseClient();
    const service = new PaymentWebhookService(supabase);
    const result = await service.handleNotification(parsed.data);

    return createSuccessResponse(reqId, result);
  });
}

export const OPTIONS = createOptionsHandler("/api/payments/midtrans/notification");
