import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { StudyAreaRepository } from "@/src/repositories/study-area.repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Auth check commented out to allow generic read if RLS permits.
    /*
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    */

    const { id } = await params;
    const repo = new StudyAreaRepository(supabase);
    const studyArea = await repo.findById(id);

    if (!studyArea) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({ data: studyArea });
  } catch (error) {
    console.error("GET /api/v1/study-areas/[id] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
