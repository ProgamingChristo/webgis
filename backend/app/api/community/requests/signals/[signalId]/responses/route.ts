import type { NextRequest, NextResponse } from "next/server";

import {
  CommunityService,
  SupabaseCommunityRepository,
  type CommunityResponseMerchant,
  type CommunityUmkmResponse,
} from "@/src/features/community";
import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import {
  MAX_PROFILE_JSON_BODY_BYTES,
  readBoundedJsonBody,
} from "@/src/lib/request-body";
import { rateLimiter, type RateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

type CommunityDemandSignalResponsesEndpointService = {
  listDemandSignalResponses(signalId: unknown): Promise<CommunityUmkmResponse[]>;
  listResponseMerchants(): Promise<CommunityResponseMerchant[]>;
  upsertDemandSignalResponse(
    signalId: unknown,
    input: unknown,
  ): Promise<CommunityUmkmResponse>;
};

type CommunityDemandSignalResponsesContext = {
  params: Promise<{
    signalId: string;
  }>;
};

export type CommunityDemandSignalResponsesHandlerDependencies = {
  authenticate(request: NextRequest): Promise<string>;
  createService(request: NextRequest): CommunityDemandSignalResponsesEndpointService;
  rateLimiter: RateLimiter;
};

const defaultDependencies: CommunityDemandSignalResponsesHandlerDependencies = {
  authenticate: requireAuthenticatedUser,
  createService: (request) => {
    const authorization = request.headers.get("Authorization");

    if (!authorization) {
      throw new Error("Missing authorization header");
    }

    return new CommunityService(
      new SupabaseCommunityRepository(
        getRequestSupabaseClient(authorization),
      ),
    );
  },
  rateLimiter,
};

export function createCommunityDemandSignalResponsesHandlers(
  dependencies: CommunityDemandSignalResponsesHandlerDependencies = defaultDependencies,
) {
  return {
    GET: async function GET(
      request: NextRequest,
      context: CommunityDemandSignalResponsesContext,
    ): Promise<NextResponse> {
      const requestId = getRequestId(request);
      return withApiLogger(request, requestId, async () => {
        const userId = await dependencies.authenticate(request);
        await dependencies.rateLimiter.checkLimit(
          request,
          `${userId}:community:request-signal-responses:list`,
        );

        const params = await context.params;
        const service = dependencies.createService(request);
        const [responses, merchants] = await Promise.all([
          service.listDemandSignalResponses(params.signalId),
          service.listResponseMerchants(),
        ]);

        return createSuccessResponse(requestId, {
          responses,
          ownedMerchants: merchants,
        });
      });
    },

    POST: async function POST(
      request: NextRequest,
      context: CommunityDemandSignalResponsesContext,
    ): Promise<NextResponse> {
      const requestId = getRequestId(request);
      return withApiLogger(request, requestId, async () => {
        const userId = await dependencies.authenticate(request);
        await dependencies.rateLimiter.checkLimit(
          request,
          `${userId}:community:request-signal-responses:upsert`,
        );

        const params = await context.params;
        const body = await readBoundedJsonBody(
          request,
          MAX_PROFILE_JSON_BODY_BYTES,
        );
        const response = await dependencies
          .createService(request)
          .upsertDemandSignalResponse(params.signalId, body);

        return createSuccessResponse(requestId, response, {
          status: 201,
        });
      });
    },
  };
}

const handlers = createCommunityDemandSignalResponsesHandlers();

export const GET = handlers.GET;
export const POST = handlers.POST;
export const OPTIONS = createOptionsHandler(
  "/api/community/requests/signals/[signalId]/responses",
);
