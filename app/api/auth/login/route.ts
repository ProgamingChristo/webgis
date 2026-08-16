import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { ApplicationError } from "@/src/lib/errors";
import { loginSchema } from "@/src/schemas/auth.schema";
import { validateBody } from "@/src/lib/validation";
import { withApiLogger } from "@/src/lib/api-logger";
import { rateLimiter } from "@/src/lib/rate-limit";
import { ProfileRepository } from "@/src/repositories/profile.repository";
import { ProfileService } from "@/src/services/profile.service";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  
  return withApiLogger(req, reqId, async () => {
    // 1. Rate Limiting Check (Identifier could be IP, but for now we use a generic string)
    await rateLimiter.checkLimit(req, "auth:login");

    // 2. Validation
    const body = await validateBody(req, loginSchema);
    
    const supabase = getServerSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      throw new ApplicationError("UNAUTHORIZED", "Invalid email or password.");
    }
    
    const profileService = new ProfileService(new ProfileRepository(supabase));
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
