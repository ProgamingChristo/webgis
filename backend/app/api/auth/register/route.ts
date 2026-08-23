import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
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
  RateLimitExceededError,
} from "@/src/lib/errors";

import {
  registerSchema,
} from "@/src/schemas/auth.schema";

import {
  validateBody,
} from "@/src/lib/validation";

import {
  withApiLogger,
} from "@/src/lib/api-logger";

import {
  rateLimiter,
} from "@/src/lib/rate-limit";

import {
  MAX_AUTH_JSON_BODY_BYTES,
} from "@/src/lib/request-body";

import {
  createOptionsHandler,
} from "@/src/lib/api-security";

import {
  logger,
} from "@/src/lib/logger";

export const maxDuration = 15;

export async function POST(
  req: NextRequest,
): Promise<NextResponse> {
  const reqId =
    getRequestId(req);

  return withApiLogger(
    req,
    reqId,
    async () => {
      await rateLimiter.checkLimit(
        req,
        "auth:register",
      );

      const body =
        await validateBody(
          req,
          registerSchema,
          MAX_AUTH_JSON_BODY_BYTES,
        );

      const supabase =
        getServerSupabaseClient();

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email:
            body.email,

          password:
            body.password,

          options: {
            data: {
              display_name:
                body.display_name,
            },
          },
        });

      if (error) {
        const errorWithCode =
          error as {
            code?: unknown;
          };

        const supabaseCode =
          typeof errorWithCode.code ===
          "string"
            ? errorWithCode.code
            : "UNKNOWN";

        logger.error(
          "Auth registration failed",
          {
            requestId:
              reqId,

            errorName:
              error.name,

            errorCode:
              error.status ?? 0,

            errorMessage:
              error.message,

            supabaseCode,
          },
        );

        if (
          error.status === 429 ||
          supabaseCode ===
            "over_email_send_rate_limit" ||
          error.name ===
            "AuthRetryableFetchError"
        ) {
          throw new RateLimitExceededError(
            60,
            "SUPABASE_AUTH",
          );
        }

        if (
          error.status === 422 ||
          supabaseCode ===
            "user_already_exists"
        ) {
          throw new ApplicationError(
            "AUTH_EMAIL_ALREADY_EXISTS",
          );
        }

        if (
          error.status === 400 ||
          supabaseCode ===
            "validation_failed"
        ) {
          throw new ApplicationError(
            "VALIDATION_ERROR",
            error.message,
          );
        }

        throw new ApplicationError(
          "INTERNAL_ERROR",
          error.message,
        );
      }

      if (!data.session) {
        logger.error(
          "Auth registration returned no session",
          {
            requestId:
              reqId,

            reason:
              "Supabase email confirmation is likely still enabled",
          },
        );

        throw new ApplicationError(
          "AUTH_EMAIL_CONFIRMATION_REQUIRED",
        );
      }

      return createSuccessResponse(
        reqId,
        {
          session:
            {
              access_token:
                data.session
                  .access_token,

              refresh_token:
                data.session
                  .refresh_token,

              expires_at:
                data.session
                  .expires_at ??
                null,
            },

          user: {
            id:
              data.user?.id ??
              null,

            email:
              data.user?.email ??
              null,
          },

          profile: {
            display_name:
              body.display_name,

            account_role:
              "USER" as const,

            onboarding_complete:
              false,
          },
        },
      );
    },
  );
}

export const OPTIONS =
  createOptionsHandler(
    "/api/auth/register",
  );
