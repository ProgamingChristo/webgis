import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse } from "@/src/lib/api-response";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { UmkmWorkspaceService } from "@/src/features/umkm-workspace";

export const maxDuration = 15;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    const userId = await requireAuthenticatedUser(req);
    const authHeader = req.headers.get("Authorization")!;
    const supabase = getRequestSupabaseClient(authHeader);

    // Stakeholder mode selects an experience; merchant ownership controls private data.
    const workspaceService = new UmkmWorkspaceService(supabase);
    const summary = await workspaceService.getWorkspaceSummary(userId);

    return createSuccessResponse(reqId, summary);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/workspace");
