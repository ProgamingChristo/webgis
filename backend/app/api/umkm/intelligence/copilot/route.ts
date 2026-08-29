import type { NextRequest } from "next/server";
import {
  UmkmCopilotService,
  UmkmIntelligenceRepository,
  UmkmIntelligenceService,
  umkmCopilotRequestSchema,
  type MerchantIntelligenceResult,
  type UmkmCopilotResult,
} from "@/src/features/umkm-intelligence";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 45;

interface UmkmCopilotRouteDependencies {
  authorize: typeof requireAuthenticatedUser;
  analyze: (userId: string, merchantId: string, days: 7 | 30) => Promise<MerchantIntelligenceResult>;
  explain: (result: MerchantIntelligenceResult, question: string) => Promise<UmkmCopilotResult>;
}

const defaultDependencies: UmkmCopilotRouteDependencies = {
  authorize: requireAuthenticatedUser,
  analyze: (userId, merchantId, days) => new UmkmIntelligenceService(
    new UmkmIntelligenceRepository(getServiceRoleSupabaseClient()),
  ).analyze(userId, { merchant_id: merchantId, days }),
  explain: (result, question) => new UmkmCopilotService().explain(result, question),
};

export function createUmkmCopilotHandler(dependencies: UmkmCopilotRouteDependencies = defaultDependencies) {
  return async (request: NextRequest) => {
    const requestId = getRequestId(request);
    return withApiLogger(request, requestId, async () => {
      const userId = await dependencies.authorize(request);
      const parsed = umkmCopilotRequestSchema.safeParse(await readBoundedJsonBody(request, 4_096));
      if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
      const result = await dependencies.analyze(userId, parsed.data.merchant_id, parsed.data.days);
      const explanation = await dependencies.explain(result, parsed.data.question);
      return createSuccessResponse(requestId, explanation);
    });
  };
}

export const POST = createUmkmCopilotHandler();
export const OPTIONS = createOptionsHandler("/api/umkm/intelligence/copilot");
