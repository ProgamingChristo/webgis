import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function inspectApproved() {
  const subId = "f331dd3a-f989-4214-b402-ff087d5700eb";
  const { data: sub } = await supabase
    .from("merchant_submissions")
    .select("*")
    .eq("id", subId)
    .single();

  console.log("Submission status:", {
    id: sub.id,
    status: sub.status,
    canonical_merchant_id: sub.canonical_merchant_id,
    reviewed_by: sub.reviewed_by,
    reviewed_at: sub.reviewed_at,
  });

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", sub.canonical_merchant_id)
    .single();

  console.log("Canonical merchant created:", merchant);
}

inspectApproved().catch(console.error);
