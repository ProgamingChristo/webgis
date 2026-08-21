import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getRequestSupabaseClient,
  getServerSupabaseClient,
} from "@/src/lib/supabase/server";

import {
  createSuccessResponse,
} from "@/src/lib/api-response";

import {
  getRequestId,
} from "@/src/lib/request-id";

import {
  ApplicationError,
} from "@/src/lib/errors";

import {
  requireAuthenticatedUser,
} from "@/src/lib/auth";

import {
  ProfileRepository,
} from "@/src/repositories/profile.repository";

import {
  ProfileService,
} from "@/src/services/profile.service";

import {
  withApiLogger,
} from "@/src/lib/api-logger";

import {
  rateLimiter,
} from "@/src/lib/rate-limit";

import {
  createOptionsHandler,
} from "@/src/lib/api-security";

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
      const userId =
        await requireAuthenticatedUser(
          req,
        );

      await rateLimiter.checkLimit(
        req,
        `${userId}:api:auth:me`,
      );

      const authHeader =
        req.headers.get(
          "Authorization",
        );

      if (!authHeader) {
        throw new ApplicationError(
          "UNAUTHORIZED",
        );
      }

      const match =
        /^Bearer ([^\s]+)$/i.exec(
          authHeader,
        );

      if (!match?.[1]) {
        throw new ApplicationError(
          "UNAUTHORIZED",
        );
      }

      const token =
        match[1];

      const supabase =
        getServerSupabaseClient();

      const {
        data: {
          user: authUser,
        },
        error: authError,
      } =
        await supabase.auth.getUser(
          token,
        );

      if (
        authError ||
        !authUser
      ) {
        throw new ApplicationError(
          "UNAUTHORIZED",
          "User not found",
        );
      }

      const userClient =
        getRequestSupabaseClient(
          authHeader,
        );

      const profileService =
        new ProfileService(
          new ProfileRepository(
            userClient,
          ),
        );

      const profile =
        await profileService
          .findProfile(
            userId,
          );

      return createSuccessResponse(
        reqId,
        {
          user: {
            id:
              authUser.id,

            email:
              authUser.email,
          },

          profile:
            profile
              ? {
                  display_name:
                    profile.display_name,

                  avatar_url:
                    profile.avatar_url,

                  account_role:
                    profile.account_role,

                  onboarding_complete:
                    profile.onboarding_complete,

                  trust_score:
                    profile.trust_score,
                }
              : null,
        },
      );
    },
  );
}

export const OPTIONS =
  createOptionsHandler(
    "/api/auth/me",
  );