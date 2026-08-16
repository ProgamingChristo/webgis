import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { ApplicationError } from "@/src/lib/errors";
import { registerSchema } from "@/src/schemas/auth.schema";
import { validateBody } from "@/src/lib/validation";
import { withApiLogger } from "@/src/lib/api-logger";
import { rateLimiter } from "@/src/lib/rate-limit";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  
  return withApiLogger(req, reqId, async () => {
    await rateLimiter.checkLimit(req, "auth:register");
    const body = await validateBody(req, registerSchema);
    
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
