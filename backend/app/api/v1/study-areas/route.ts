import { NextResponse, type NextRequest } from "next/server";
import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { StudyAreaRepository } from "@/src/repositories/study-area.repository";

export async function GET(request: NextRequest) {
  return withApiLogger(request, getRequestId(request), async () => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) throw new ApplicationError("UNAUTHORIZED");
    const userId = await requireAuthenticatedUser(request);
    await rateLimiter.checkLimit(request, `${userId}:api:v1-study-areas`);
    const supabase = getRequestSupabaseClient(authHeader);

    const { searchParams } = new URL(request.url);
    const environment = searchParams.get("environment");

    const repo = new StudyAreaRepository(supabase);
    // Passing pagination defaults.
    const result = await repo.findMany({
      limit: 100,
      offset: 0,
      page: 1,
      sort: "created_at",
      order: "desc",
    });

    // If environment filter is applied
    let items = result.items;
    if (environment) {
      items = items.filter(
        (item) => item.provenance?.metadata?.environment === environment
      );
    }

    return NextResponse.json({ data: items });
  });
}

export const OPTIONS = createOptionsHandler("/api/v1/study-areas");
