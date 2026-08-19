import { NextRequest, NextResponse } from "next/server";
import {
  getRequestSupabaseClient,
  getServerSupabaseClient,
} from "@/src/lib/supabase/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { ApplicationError, RateLimitExceededError } from "@/src/lib/errors";
import { loginSchema } from "@/src/schemas/auth.schema";
import { validateBody } from "@/src/lib/validation";
import { withApiLogger } from "@/src/lib/api-logger";
import { rateLimiter } from "@/src/lib/rate-limit";
import { ProfileRepository } from "@/src/repositories/profile.repository";
import { ProfileService } from "@/src/services/profile.service";
import { MAX_AUTH_JSON_BODY_BYTES } from "@/src/lib/request-body";
import { createOptionsHandler } from "@/src/lib/api-security";
import { logger } from "@/src/lib/logger";

export const maxDuration = 15;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  
  return withApiLogger(req, reqId, async () => {
    // 1. Rate Limiting Check (Identifier could be IP, but for now we use a generic string)
    await rateLimiter.checkLimit(req, "auth:login");

    // 2. Validation
    const body = await validateBody(req, loginSchema, MAX_AUTH_JSON_BODY_BYTES);
    
    const supabase = getServerSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      logger.error("Auth login failed", {
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

      if (error.message.includes("Email not confirmed")) {
        throw new ApplicationError("UNAUTHORIZED", "Email belum dikonfirmasi.");
      }

      throw new ApplicationError("UNAUTHORIZED", "Invalid email or password.");
    }
    
    const userClient = getRequestSupabaseClient(`Bearer ${data.session.access_token}`);
    const profileService = new ProfileService(new ProfileRepository(userClient));
    const profile = await profileService.findProfile(data.user.id);
    
    return createSuccessResponse(reqId, {
      session: {
        access_token: data.session.access_token,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      profile: profile ? {
        display_name: profile.display_name,
        role: profile.role,
      } : null
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/auth/login");
