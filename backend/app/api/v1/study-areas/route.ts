import { NextResponse } from "next/server";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import { StudyAreaRepository } from "@/src/repositories/study-area.repository";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    // Note: To support public reads if RLS allows, we pass the header (which might be empty).
    // If it requires auth, RLS will block it if empty, or we can explicitly check.
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
  } catch (error) {
    console.error("GET /api/v1/study-areas Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
