import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function main() {
  console.log("Cleaning up Phase 10 Dummy Transport Data...");

  try {
    // Delete Route Stops (cascading normally happens, but we delete explicitly)
    // Wait, we can just delete from transport_nodes and transport_corridors where source_id is GETRA_INTERNAL and source_record_id like %DUMMY%
    
    const { data: spatialSource } = await supabase
      .from("spatial_sources")
      .select("id")
      .eq("source_name", "GETRA_INTERNAL")
      .maybeSingle();

    if (!spatialSource) {
      console.log("No GETRA_INTERNAL source found, nothing to clean up.");
      return;
    }

    // Since route stops cascade on delete from corridor or node, we just delete nodes and corridors.
    const { error: err1 } = await supabase
      .from("transport_nodes")
      .delete()
      .eq("source_id", spatialSource.id)
      .like("source_record_id", "%NODE_DUMMY%");

    if (err1) throw err1;

    const { error: err2 } = await supabase
      .from("transport_corridors")
      .delete()
      .eq("source_id", spatialSource.id)
      .like("source_record_id", "%CORRIDOR_DUMMY%");

    if (err2) throw err2;

    console.log("Cleanup completed successfully.");
    
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

main();
