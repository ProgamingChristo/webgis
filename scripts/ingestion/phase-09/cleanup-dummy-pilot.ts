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
  console.log("Starting Cleanup for Phase 09 Dummy Pilot Area...");

  try {
    const { data: spatialSource, error: spatialError } = await supabase
      .from("spatial_sources")
      .select("*")
      .eq("source_name", "GETRA_INTERNAL")
      .maybeSingle();

    if (spatialError) throw spatialError;

    if (spatialSource) {
      const { data: areas, error: fetchError } = await supabase
        .from("study_areas")
        .select("id, name, metadata")
        .eq("source_id", spatialSource.id);

      if (fetchError) throw fetchError;

      let deleted = 0;
      for (const area of areas || []) {
        if (area.metadata && typeof area.metadata === 'object' && 'environment' in area.metadata && area.metadata.environment === "DUMMY") {
          const { error: delError } = await supabase
            .from("study_areas")
            .delete()
            .eq("id", area.id);
            
          if (delError) throw delError;
          console.log(`Deleted dummy area: ${area.name}`);
          deleted++;
        }
      }
      console.log(`Successfully deleted ${deleted} dummy study areas.`);
    }

    console.log("Cleanup completed.");
  } catch (error) {
    console.error("Error during cleanup:", error);
    process.exit(1);
  }
}

main();
