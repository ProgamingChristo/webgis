import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";
import { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import { TransportNodeService } from "@/src/modules/transport-node/transport-node.service";
import { createSpatialService } from "@/src/modules/spatial/spatial.service";
import { loadSpatialConfig } from "@/src/modules/spatial/spatial.config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 20;
    const page = Number(searchParams.get("page")) || 1;
    
    // Use service role for internal reading, or require auth if this was exposed
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey);
    const repo = new TransportNodeRepository(supabase);
    const config = loadSpatialConfig();
    const spatial = createSpatialService(supabase, config);
    const service = new TransportNodeService(repo, spatial);

    const result = await service.findNodes({
      limit,
      page,
      offset: (page - 1) * limit,
      sort: "created_at",
      order: "desc"
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
