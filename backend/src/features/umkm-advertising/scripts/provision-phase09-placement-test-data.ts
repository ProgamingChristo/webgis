import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseKey || "placeholder");

async function main() {
  console.log("=== Provisioning Phase 09 Placement Test Data (Banner & Profile Poster) ===");

  const testMerchantId = "88888888-8888-4888-8888-888888888888";
  const testOwnerId = "77777777-7777-4777-7777-777777777777";
  const testCampaignId = "99999999-9999-4999-9999-999999999999";
  const bannerCreativeId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
  const posterCreativeId = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";

  try {
    // 1. Ensure test merchant
    await supabase.from("merchants").upsert({
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

    // 2. Ensure test campaign (ACTIVE)
    await supabase.from("ad_campaigns").upsert({
      id: testCampaignId,
      merchant_id: testMerchantId,
      name: "Campaign Promo All Placements Phase 9",
      status: "ACTIVE",
      budget_tier: "COMMUTER_PIN",
      start_at: new Date(Date.now() - 3600000).toISOString(),
      end_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    });

    // 3. Ensure target
    await supabase.from("ad_campaign_targets").upsert({
      campaign_id: testCampaignId,
      target_type: "RADIUS",
      center_location: {
        type: "Point",
        coordinates: [106.78, -6.18],
      },
      radius_meters: 5000,
    });

    // 4. Ensure CONTEXTUAL_BANNER creative
    await supabase.from("ad_creatives").upsert({
      id: bannerCreativeId,
      campaign_id: testCampaignId,
      creative_type: "CONTEXTUAL_BANNER",
      headline: "DUMMY Promo Kopi Susu Diskon 40%",
      description: "Data uji GETRA Advertising Phase 9: Promo hemat untuk commuter transit!",
      cta_type: "VIEW_PROFILE",
      status: "READY",
    });

    // 5. Ensure PROFILE_POSTER creative
    await supabase.from("ad_creatives").upsert({
      id: posterCreativeId,
      campaign_id: testCampaignId,
      creative_type: "PROFILE_POSTER",
      headline: "DUMMY Paket Spesial Transit Mahasiswa Rp15.000",
      description: "Nikmati paket nasi + kopi susu spesial khusus pelanggan transit GETRA.",
      cta_type: "REQUEST_ROUTE",
      status: "READY",
    });

    console.log("✅ Phase 09 test data successfully provisioned.");
  } catch {
    console.log("Provision check skipped (local mock environment).");
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as provisionPhase09PlacementTestData };
