import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { withApiLogger } from "@/src/lib/api-logger";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);
  
  return withApiLogger(req, reqId, async () => {
    const supabase = getServerSupabaseClient();
    
    // Attempt to log out. In a stateless API using Supabase JS (not SSR cookies),
    // logout doesn't strictly "invalidate" the JWT instantly unless we use Supabase session management.
    // However, calling signOut is standard practice.
    // We should ideally pass the token to signOut if we want it to be token specific,
    // but the client only has the anon key. 
    // We'll extract token to sign out properly if needed, but standard auth.signOut() works for local session.
    // For an API, the client just discards the token.
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      await supabase.auth.admin.signOut(token).catch(() => {}); // Optional: requires admin/service role to invalidate globally if needed, but regular signOut works if context is set.
      // Since we don't use service_role here to prevent leak, we just return success. 
      // The frontend must discard the token.
    }
    
    return createSuccessResponse(reqId, { message: "Logged out successfully" });
  });
}
