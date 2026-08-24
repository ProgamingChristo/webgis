import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.log("Supabase credentials not configured in process.env");
}

const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseKey || "placeholder");

async function main() {
  console.log("=== Provisioning Phase 08 Fair Discovery Test Data ===");

  const testMerchantId = "88888888-8888-4888-8888-888888888888";
  const testOwnerId = "77777777-7777-4777-7777-777777777777";

  try {
    const { data: existingMerchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("id", testMerchantId)
      .single();

    if (!existingMerchant) {
      console.log("Creating test merchant...");
      await supabase.from("merchants").insert({
        id: testMerchantId,
        name: "Warung Kopi Selamat GETRA",
        address: "Jl. Kebon Jeruk No. 12, Jakarta Barat",
        primary_category_id: "CAFE",
        publish_status: "PUBLISHED",
        verification_status: "VERIFIED",
        owner_id: testOwnerId,
        location: {
          type: "Point",
          coordinates: [106.78, -6.18],
        },
        data_quality_score: 85,
      });
    } else {
      console.log("Test merchant exists:", testMerchantId);
    }
  } catch {
    console.log("Provision check skipped (local environment).");
  }

  console.log("✅ Phase 08 Fair Discovery test data script finished.");
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as provisionPhase08FairDiscoveryTestData };
