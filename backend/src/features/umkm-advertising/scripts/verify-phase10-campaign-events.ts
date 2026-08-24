import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in process.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const TEST_CAMPAIGN_ID = "99999999-9999-4999-9999-999999999999";

async function verifyPhase10Events() {
  console.log("=== Verifying Recorded Campaign Events ===");

  const { data: events, error } = await supabase
    .from("campaign_events")
    .select("id, event_type, placement, creative_id, dedup_key, occurred_at")
    .eq("campaign_id", TEST_CAMPAIGN_ID)
    .order("occurred_at", { ascending: false });

  if (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }

  console.log(`Total events recorded for campaign ${TEST_CAMPAIGN_ID}: ${events?.length || 0}`);

  const breakdown: Record<string, number> = {};
  for (const ev of events || []) {
    const key = `${ev.event_type} (${ev.placement})`;
    breakdown[key] = (breakdown[key] || 0) + 1;
  }

  console.table(breakdown);

  if (events && events.length > 0) {
    console.log("\nLatest 5 events:");
    console.table(events.slice(0, 5));
  }

  console.log("=== Verification Finished ===");
}

verifyPhase10Events().catch(console.error);
