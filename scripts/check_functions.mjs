import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function listFunctions() {
  const { data, error } = await supabase.rpc("search_canonical_merchants_v2", {
    p_limit: 1,
    p_offset: 0
  });
  console.log("search_canonical_merchants_v2 works:", !error);

  // Check if we can query pg_proc via postgrest? Postgrest typically only exposes tables in public schema
  // Let's test calling approve_merchant_submission with invalid ID to see error message
  const { error: rpcErr } = await supabase.rpc("approve_merchant_submission", {
    p_submission_id: "00000000-0000-0000-0000-000000000000",
  });
  console.log("approve_merchant_submission error:", rpcErr);
}

listFunctions().catch(console.error);
