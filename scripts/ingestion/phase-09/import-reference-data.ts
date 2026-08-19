import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";
import { DataSourceRepository } from "@/src/modules/ingestion/repositories/data-source.repository";
import type { DataEnvironment } from "@/src/modules/ingestion/ingestion.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);
const dataSourceRepo = new DataSourceRepository(supabase);

async function main() {
  console.log("Starting Phase 09 Reference Data Import...");

  try {
    // 1. Register Data Source
    let dataSource = await dataSourceRepo.findByCode("PHASE_09_DUMMY_PILOT");
    if (!dataSource) {
      console.log("Creating Data Source: PHASE_09_DUMMY_PILOT");
      dataSource = await dataSourceRepo.create({
        code: "PHASE_09_DUMMY_PILOT",
        name: "Phase 09 Dummy Pilot Source",
        description: "Data source for Phase 9 dummy pilot area ingestion",
        environment: "DUMMY" as DataEnvironment,
      });
      console.log("Data Source created:", dataSource.id);
    } else {
      console.log("Data Source already exists:", dataSource.id);
    }

    // 2. Register Spatial Source
    const { data: spatialSource, error: spatialError } = await supabase
      .from("spatial_sources")
      .select("*")
      .eq("source_name", "GETRA_INTERNAL")
      .maybeSingle();

    if (spatialError) {
      throw spatialError;
    }

    if (!spatialSource) {
      console.log("Creating Spatial Source: GETRA_INTERNAL");
      const { data: newSpatialSource, error: createSpatialError } = await supabase
        .from("spatial_sources")
        .insert({
          source_name: "GETRA_INTERNAL",
          source_type: "system",
          description: "Internal GETRA generated reference data",
        })
        .select()
        .single();

      if (createSpatialError) {
        throw createSpatialError;
      }
      console.log("Spatial Source created:", newSpatialSource.id);
    } else {
      console.log("Spatial Source already exists:", spatialSource.id);
    }

    console.log("Reference data import completed successfully.");
  } catch (error) {
    console.error("Error importing reference data:", error);
    process.exit(1);
  }
}

main();
