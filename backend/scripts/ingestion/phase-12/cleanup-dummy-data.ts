import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting Phase 12 Dummy Data Cleanup...");

  const { error: accessError } = await supabase.from("entity_network_access").delete().eq("environment", "DUMMY");
  if (accessError) console.error("Error clearing entity_network_access:", accessError.message);

  const { error: umkmError } = await supabase.from("umkm").delete().eq("environment", "DUMMY");
  if (umkmError) console.error("Error clearing umkm:", umkmError.message);
  
  const { error: poiError } = await supabase.from("pois").delete().eq("environment", "DUMMY");
  if (poiError) console.error("Error clearing pois:", poiError.message);

  console.log("Phase 12 Dummy Data Cleanup Completed!");
}

run().catch((err) => {
  console.error("Fatal error during cleanup:", err);
  process.exit(1);
});
