import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/src/lib/api-response";
import { ApplicationError } from "@/src/lib/errors";
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

    // 1. Verify UMKM Stakeholder Mode or Admin
    const { data: modes } = await supabase
      .from("user_stakeholder_modes")
      .select("mode")
      .eq("user_id", userId);

    const stakeholderModes = (modes || []).map((m: any) => m.mode);
    const hasUmkmMode = stakeholderModes.includes("UMKM");

    // Also check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_role")
      .eq("id", userId)
      .single();

    const isAdmin = profile?.account_role === "ADMIN";

    if (!hasUmkmMode && !isAdmin) {
      return createErrorResponse(
        reqId,
        new ApplicationError(
          "FORBIDDEN",
          "Akses ditolak: Stakeholder mode UMKM diperlukan untuk mengakses UMKM Workspace."
        )
      );
    }

    // 2. Fetch Workspace Summary
    const workspaceService = new UmkmWorkspaceService(supabase);
    const summary = await workspaceService.getWorkspaceSummary(userId);

    return createSuccessResponse(reqId, summary);
  });
}

export const OPTIONS = createOptionsHandler("/api/umkm/workspace");
