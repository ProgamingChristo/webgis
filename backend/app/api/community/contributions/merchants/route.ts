import type {
  NextRequest,
  NextResponse,
} from "next/server";
import { z } from "zod";

import { withApiLogger } from "@/src/lib/api-logger";
import { createSuccessResponse } from "@/src/lib/api-response";
import { createOptionsHandler } from "@/src/lib/api-security";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 15;

const merchantSearchSchema = z.object({
  query: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(10).optional().default(6),
});

type MerchantSearchRow = {
  id: string;
  name: string;
  address: string | null;
  price_level: string | null;
  opening_hours: unknown;
};

function normalizeOpeningHours(
  value: unknown,
): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" && typeof entry[1] === "string",
    )
    .slice(0, 14);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = getRequestId(request);

  return withApiLogger(request, requestId, async () => {
    const userId = await requireAuthenticatedUser(request);
    await rateLimiter.checkLimit(
      request,
      `${userId}:community:contributions:merchant-search`,
    );

    const parsed = merchantSearchSchema.safeParse({
      query: request.nextUrl.searchParams.get("query"),
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      throw new ApplicationError("VALIDATION_ERROR");
    }

    const authorization = request.headers.get("Authorization");

    if (!authorization) {
      throw new ApplicationError("UNAUTHORIZED");
    }

    const supabase = getRequestSupabaseClient(authorization);
    const { data, error } = await supabase
      .from("merchants")
      .select("id, name, address, price_level, opening_hours")
      .ilike("name", `%${parsed.data.query}%`)
      .neq("publish_status", "ARCHIVED")
      .order("name", { ascending: true })
      .limit(parsed.data.limit);

    if (error) {
      throw new ApplicationError("DATABASE_ERROR");
    }

    return createSuccessResponse(
      requestId,
      ((data ?? []) as MerchantSearchRow[]).map((merchant) => ({
        id: merchant.id,
        name: merchant.name,
        address: merchant.address,
        priceLevel: merchant.price_level,
        openingHours: normalizeOpeningHours(merchant.opening_hours),
      })),
    );
  });
}

export const OPTIONS = createOptionsHandler(
  "/api/community/contributions/merchants",
);
