import { NextRequest, NextResponse } from "next/server";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { ApplicationError } from "@/src/lib/errors";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { rateLimiter } from "@/src/lib/rate-limit";
import { createOptionsHandler } from "@/src/lib/api-security";
import { validateBody } from "@/src/lib/validation";
import { onboardingSchema } from "@/src/schemas/onboarding.schema";
import { MAX_AUTH_JSON_BODY_BYTES } from "@/src/lib/request-body";

export const maxDuration = 15;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    await rateLimiter.checkLimit(req, `${userId}:api:onboarding`);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new ApplicationError("UNAUTHORIZED");

    const userClient = getRequestSupabaseClient(authHeader);

    // Get profiles and modes
    const [profileRes, modesRes] = await Promise.all([
      userClient.from("profiles").select("onboarding_complete").eq("id", userId).single(),
      userClient.from("user_stakeholder_modes").select("mode").eq("user_id", userId),
    ]);

    if (profileRes.error) {
      throw new ApplicationError("INTERNAL_ERROR", "Failed to fetch profile");
    }
    if (modesRes.error) {
      throw new ApplicationError("INTERNAL_ERROR", "Failed to fetch modes");
    }

    const stakeholder_modes = modesRes.data.map((row) => row.mode);

    return createSuccessResponse(reqId, {
      onboarding_complete: profileRes.data.onboarding_complete,
      stakeholder_modes,
    });
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    await rateLimiter.checkLimit(req, `${userId}:api:onboarding:mutation`);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new ApplicationError("UNAUTHORIZED");

    const body = await validateBody(req, onboardingSchema, MAX_AUTH_JSON_BODY_BYTES);

    const userClient = getRequestSupabaseClient(authHeader);

    const { error } = await userClient.rpc("complete_onboarding", {
      selected_modes: body.modes,
    });

    if (error) {
      throw new ApplicationError("INTERNAL_ERROR", error.message);
    }

    return createSuccessResponse(reqId, {
      onboarding_complete: true,
      stakeholder_modes: body.modes,
    });
  });
}

export const OPTIONS = createOptionsHandler("/api/onboarding");
