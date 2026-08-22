import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StudyAreaRepository } from "@/src/repositories/study-area.repository";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Public endpoint for Phase 9 dummy areas, or rely on RLS. We can skip strong auth check for dummy read foundation.
    // Auth check commented out to allow generic read if RLS permits.
    /*
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    */

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
