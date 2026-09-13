import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const service = createClient(supabaseUrl, serviceKey);

async function testFallbackTrace() {
  const subId = "e83ec3d1-6905-4e68-bb13-82ad7f0dd9ae"; // kopi christo
  console.log("Fetching sub:", subId);
  const { data: sub, error } = await service
    .from("merchant_submissions")
    .select("*")
    .eq("id", subId)
    .single();

  console.log("Fetched sub location raw:", typeof sub?.location, JSON.stringify(sub?.location));
}

testFallbackTrace().catch(console.error);
