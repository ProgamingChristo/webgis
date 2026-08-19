import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { ApplicationError, RateLimitExceededError } from "@/src/lib/errors";
import { registerSchema } from "@/src/schemas/auth.schema";
import { validateBody } from "@/src/lib/validation";
import { withApiLogger } from "@/src/lib/api-logger";
import { rateLimiter } from "@/src/lib/rate-limit";
import { MAX_AUTH_JSON_BODY_BYTES } from "@/src/lib/request-body";
import { createOptionsHandler } from "@/src/lib/api-security";
import { logger } from "@/src/lib/logger";

export const maxDuration = 15;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  
  return withApiLogger(req, reqId, async () => {
    await rateLimiter.checkLimit(req, "auth:register");
    const body = await validateBody(
      req,
      registerSchema,
      MAX_AUTH_JSON_BODY_BYTES,
    );
    
    if (body.role === "ADMIN") {
      throw new ApplicationError("FORBIDDEN", "Role ADMIN tidak dapat dibuat melalui public registration.");
    }
    
    const supabase = getServerSupabaseClient();
    
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          display_name: body.display_name,
          role: body.role,
        }
      }
    });

    if (error) {
      logger.error("Auth registration failed", {
        requestId: reqId,
        errorName: error.name,
        errorCode: error.status ?? 0,
        errorMessage: error.message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseCode: (error as any).code,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error.status === 429 || (error as any).code === "over_email_send_rate_limit" || error.name === "AuthRetryableFetchError") {
        throw new RateLimitExceededError(60, "SUPABASE_AUTH");
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error.status === 422 || (error as any).code === "user_already_exists") {
        throw new ApplicationError("AUTH_EMAIL_ALREADY_EXISTS");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (error.status === 400 || (error as any).code === "validation_failed") {
        throw new ApplicationError("VALIDATION_ERROR", error.message);
      }

      throw new ApplicationError("INTERNAL_ERROR", error.message);
    }
    
    // We intentionally don't return the full user object with password hashes etc.
    return createSuccessResponse(reqId, {
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      profile: {
        display_name: body.display_name,
        role: body.role,
      }
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/auth/register");
