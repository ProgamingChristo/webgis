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
  withApiLogger,
} from "@/src/lib/api-logger";
import {
  rateLimiter,
} from "@/src/lib/rate-limit";
import {
  getRequestId,
} from "@/src/lib/request-id";
import {
  publicProfileListQuerySchema,
} from "@/src/schemas/profile.schema";
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

export async function GET(
  req: NextRequest,
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
        `${viewerId}:api:profiles:list`,
      );

      const query =
        publicProfileListQuerySchema.parse({
          search:
            req.nextUrl.searchParams.get(
              "search",
            ) ?? undefined,
          limit:
            req.nextUrl.searchParams.get(
              "limit",
            ) ?? undefined,
        });

      const service =
        new ProfileService(
          new ProfileRepository(
            createAdminSupabaseClient(),
          ),
        );

      const profiles =
        await service.listPublicProfiles(
          query,
        );

      return createSuccessResponse(
        reqId,
        {
          profiles,
        },
      );
    },
  );
}

export const OPTIONS =
  createOptionsHandler(
    "/api/profiles",
  );
