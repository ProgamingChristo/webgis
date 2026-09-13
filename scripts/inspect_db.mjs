import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars", { supabaseUrl, hasServiceKey: !!serviceKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("Checking database...");

  // Check submissions
  const { data: submissions, error: subError } = await supabase
    .from("merchant_submissions")
    .select("id, name, status, category, address, location, submitted_by, canonical_merchant_id, created_at")
    .order("created_at", { ascending: false });

  if (subError) {
    console.error("Submissions error:", subError);
  } else {
    console.log("Found", submissions?.length, "submissions:");
    console.table(submissions?.map(s => ({
      id: s.id,
      name: s.name,
      status: s.status,
      category: s.category,
      has_loc: !!s.location,
      submitted_by: s.submitted_by?.slice(0, 8),
      canonical_id: s.canonical_merchant_id?.slice(0, 8) ?? "NONE"
    })));
  }

  // Check claims
  const { data: claims, error: claimError } = await supabase
    .from("merchant_claims")
    .select("id, merchant_id, user_id, status, note, created_at")
    .order("created_at", { ascending: false });

  if (claimError) {
    console.error("Claims error:", claimError);
  } else {
    console.log("Found", claims?.length, "claims:");
    console.table(claims?.map(c => ({
      id: c.id,
      merchant_id: c.merchant_id?.slice(0, 8),
      user_id: c.user_id?.slice(0, 8),
      status: c.status,
    })));
  }

  // Check admin profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, account_role, display_name")
    .eq("account_role", "ADMIN");

  console.log("Admin profiles:", profiles);
}

main().catch(console.error);
