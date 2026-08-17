import { NextRequest, NextResponse } from "next/server";
import { ProfileRepository } from "@/src/repositories/profile.repository";
import { ProfileService } from "@/src/services/profile.service";
import { patchProfileSchema } from "@/src/schemas/profile.schema";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

import { requireAuthenticatedUser } from "@/src/lib/auth";
import { validateBody } from "@/src/lib/validation";
import { withApiLogger } from "@/src/lib/api-logger";
import { rateLimiter } from "@/src/lib/rate-limit";
import { MAX_PROFILE_JSON_BODY_BYTES } from "@/src/lib/request-body";
import { createOptionsHandler } from "@/src/lib/api-security";

export const maxDuration = 15;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  
  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    await rateLimiter.checkLimit(req, `${userId}:api:profile:get`);
    const authHeader = req.headers.get("Authorization")!;
    const userClient = getRequestSupabaseClient(authHeader);

    const repo = new ProfileRepository(userClient);
    const service = new ProfileService(repo);
    
    const profile = await service.getProfile(userId);
    
    return createSuccessResponse(reqId, profile);
  });
}

export const OPTIONS = createOptionsHandler("/api/profile");

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  
  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    await rateLimiter.checkLimit(req, `${userId}:mutation:profile:patch`);
    const body = await validateBody(
      req,
      patchProfileSchema,
      MAX_PROFILE_JSON_BODY_BYTES,
    );
    const authHeader = req.headers.get("Authorization")!;
    const userClient = getRequestSupabaseClient(authHeader);

    const repo = new ProfileRepository(userClient);
    const service = new ProfileService(repo);
    
    const updatedProfile = await service.updateProfile(userId, body);
    
    return createSuccessResponse(reqId, updatedProfile);
  });
}
