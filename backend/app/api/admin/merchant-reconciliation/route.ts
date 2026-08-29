import type { NextRequest } from "next/server";

import {
  MerchantReconciliationRepository,
  MerchantReconciliationService,
} from "@/src/features/merchant-reconciliation";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireRole } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { getRequestId } from "@/src/lib/request-id";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

type ReconciliationRouteService = Pick<
  MerchantReconciliationService,
  "getSummary" | "reconcile"
>;

export interface MerchantReconciliationRouteDependencies {
  authorize: typeof requireRole;
  createService: () => ReconciliationRouteService;
}

const defaultDependencies: MerchantReconciliationRouteDependencies = {
  authorize: requireRole,
  createService: () => new MerchantReconciliationService(
    new MerchantReconciliationRepository(getServiceRoleSupabaseClient()),
  ),
};

export function createMerchantReconciliationHandlers(
  dependencies: MerchantReconciliationRouteDependencies = defaultDependencies,
) {
  return {
    GET: async (request: NextRequest) => {
      const requestId = getRequestId(request);
      return withApiLogger(request, requestId, async () => {
        await dependencies.authorize(request, "ADMIN");
        return createSuccessResponse(
          requestId,
          await dependencies.createService().getSummary(),
        );
      });
    },
    POST: async (request: NextRequest) => {
      const requestId = getRequestId(request);
      return withApiLogger(request, requestId, async () => {
        await dependencies.authorize(request, "ADMIN");
        try {
          return createSuccessResponse(
            requestId,
            await dependencies.createService().reconcile(),
          );
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "MERCHANT_RECONCILIATION_ALREADY_RUNNING"
          ) {
            throw new ApplicationError("CONFLICT");
          }
          throw error;
        }
      });
    },
  };
}

const handlers = createMerchantReconciliationHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;
export const OPTIONS = createOptionsHandler("/api/admin/merchant-reconciliation");

