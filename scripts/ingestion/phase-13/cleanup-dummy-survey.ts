import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Starting Phase 13 Dummy Data Cleanup...");

  // Since survey_questions and survey_responses have cascade/foreign keys to surveys,
  // we just delete the dummy surveys, which might fail if we don't CASCADE or delete children first.
  
  // Actually, Supabase REST API doesn't do deep cascade deletions safely sometimes if not set up,
  // but we set up ON DELETE CASCADE for survey_questions. 
  // Let's delete responses first.
  const { error: respError } = await supabase.from("survey_responses").delete().eq("environment", "DUMMY");
  if (respError) console.error("Error clearing survey_responses:", respError.message);

  const { error: surveyError } = await supabase.from("surveys").delete().eq("environment", "DUMMY");
  if (surveyError) console.error("Error clearing surveys:", surveyError.message);
  
  console.log("Phase 13 Dummy Data Cleanup Completed!");
}

run().catch((err) => {
  console.error("Fatal error during cleanup:", err);
  process.exit(1);
});
