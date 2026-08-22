import { createClient } from "@supabase/supabase-js";



async function runAudit() {
  console.log("--- GETRA PHASE 14: REMOTE DATA AUDIT ---");
  
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const tables = [
    "study_areas",
    "transport_nodes",
    "transport_corridors",
    "transport_route_stops",
    "pedestrian_nodes",
    "pedestrian_edges",
    "umkm_profiles",
    "pois",
    "surveys",
    "survey_responses",
    "data_sources",
  ];

  const inventory: Record<string, number> = {};

  for (const table of tables) {
    const { count, error } = await client
      .from(table as any)
      .select("*", { count: "exact", head: true });
      
    if (error) {
      console.warn(`WARNING: Failed to read from ${table}. Error: ${error.message}`);
      inventory[table] = -1;
    } else {
      inventory[table] = count || 0;
    }
  }

  console.log("\n--- INVENTORY RESULTS ---");
  for (const [table, count] of Object.entries(inventory)) {
    console.log(`${table.padEnd(25, " ")}: ${count === -1 ? "ERROR/MISSING" : count}`);
  }
  
  console.log("\n--- AUDIT COMPLETE ---");
}

runAudit().catch(err => {
  console.error("Audit failed:", err);
  process.exit(1);
});
