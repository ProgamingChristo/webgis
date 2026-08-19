import { createClient } from "@supabase/supabase-js";
import { DemandAggregationService } from "@/src/modules/demand/demand-aggregation.service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting Descriptive Demand Aggregation (Phase 13)...");

  // 1. Fetch the dummy survey we just inserted
  const { data: survey, error } = await supabase
    .from("surveys")
    .select("id")
    .eq("code", "PHASE13_DUMMY_SURVEY")
    .eq("environment", "DUMMY")
    .single();

  if (error || !survey) {
    throw new Error("Dummy Survey not found. Have you run the seed script?");
  }

  const aggregationService = new DemandAggregationService(supabase);

  // 2. Perform aggregation
  const result = await aggregationService.aggregateDescriptiveDemand(survey.id, "DUMMY");

  console.log("\n--- AGGREGATION RESULT ---");
  console.log(JSON.stringify(result, null, 2));
  console.log("--------------------------\n");

  if (result.sampleSize === "SUPPRESSED") {
    console.log("Note: Result was suppressed due to low sample size (< 5).");
  } else {
    console.log(`Aggregation successful for ${result.sampleSize} samples.`);
  }
}

run().catch((err) => {
  console.error("Fatal error during aggregation:", err);
  process.exit(1);
});
