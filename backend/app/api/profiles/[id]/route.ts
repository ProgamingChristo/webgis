import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createOptionsHandler,
} from "@/src/lib/api-security";
import {
  createSuccessResponse,
} from "@/src/lib/api-response";
import {
  requireAuthenticatedUser,
} from "@/src/lib/auth";
import {
  ApplicationError,
} from "@/src/lib/errors";
import {
  withApiLogger,
} from "@/src/lib/api-logger";
import {
  rateLimiter,
} from "@/src/lib/rate-limit";
import {
  getRequestId,
} from "@/src/lib/request-id";
import {
  createAdminSupabaseClient,
} from "@/lib/supabase/admin-client";
import {
  ProfileRepository,
} from "@/src/repositories/profile.repository";
import {
  ProfileService,
} from "@/src/services/profile.service";

export const maxDuration = 15;

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const reqId =
    getRequestId(req);

  return withApiLogger(
    req,
    reqId,
    async () => {
      const viewerId =
        await requireAuthenticatedUser(
          req,
        );

      await rateLimiter.checkLimit(
        req,
        `${viewerId}:api:profiles:read`,
      );

      const {
        id,
      } =
        await context.params;

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id,
        )
      ) {
        throw new ApplicationError(
          "VALIDATION_ERROR",
        );
      }

      const service =
        new ProfileService(
          new ProfileRepository(
            createAdminSupabaseClient(),
          ),
        );

      const profile =
        await service.getPublicProfile(
          id,
        );

      return createSuccessResponse(
        reqId,
        profile,
      );
    },
  );
}

export const OPTIONS =
  createOptionsHandler(
    "/api/profiles/[id]",
  );
