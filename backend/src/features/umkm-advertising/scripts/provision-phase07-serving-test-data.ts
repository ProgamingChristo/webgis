import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function provisionPhase07TestData() {
  console.log("=== [PHASE 07] Provisioning Ad Serving Test Data ===");

  const now = new Date();

  // 1. Locate or select a verified merchant
  const { data: merchants, error: mErr } = await supabase
    .from("merchants")
    .select("id, name, location, owner_id")
    .limit(1);

  if (mErr || !merchants || merchants.length === 0) {
    console.error("No merchants found to bind test campaigns");
    return;
  }

  const merchant = merchants[0];
  const merchantId = merchant.id;
  const ownerId = merchant.owner_id;
  console.log(`Using Merchant: ${merchant.name} (${merchantId})`);

  // Ensure owner profile exists
  let creatorId = ownerId;
  if (!creatorId) {
    const { data: profiles } = await supabase.from("profiles").select("id").limit(1);
    creatorId = profiles?.[0]?.id;
  }

  if (!creatorId) {
    console.error("No profile found for created_by");
    return;
  }

  // 2. Scenario 1: ACTIVE Radius Campaign (now - 2h to now + 48h)
  const activeStart = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const activeEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const { data: activeCampaign, error: activeCampaignError } = await supabase
    .from("ad_campaigns")
    .upsert(
      {
        merchant_id: merchantId,
        created_by: creatorId,
        name: "DUMMY Sponsored Pin Phase 7 — Active Radius",
        description: "Test Campaign for Phase 7 Ad Serving Engine (Active)",
        status: "ACTIVE",
        start_at: activeStart,
        end_at: activeEnd,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (activeCampaignError) {
    console.error(
      "Failed to provision active radius campaign:",
      activeCampaignError.message,
    );
  }

  if (activeCampaign) {
    console.log(`✓ Provisioned Active Campaign: ${activeCampaign.id}`);

    // Creative
    await supabase.from("ad_creatives").upsert({
      campaign_id: activeCampaign.id,
      creative_type: "SPONSORED_PIN",
      headline: "DUMMY Promo Kopi Pagi Diskon 20%",
      description: "Nikmati kopi susu andalan dengan promo khusus commuter transit",
      cta_type: "VIEW_PROFILE",
      status: "READY",
    });

    // Target (Radius 1000m)
    await supabase.from("ad_campaign_targets").upsert(
      {
        campaign_id: activeCampaign.id,
        target_type: "RADIUS",
        radius_meters: 1000,
        center_geometry: merchant.location || { type: "Point", coordinates: [107.609, -6.9175] },
      },
      { onConflict: "campaign_id" }
    );
  }

  // 3. Scenario 2: PAUSED Campaign
  const { data: pausedCampaign } = await supabase
    .from("ad_campaigns")
    .upsert(
      {
        merchant_id: merchantId,
        created_by: creatorId,
        name: "DUMMY Sponsored Pin Phase 7 — Paused Campaign",
        description: "Test Campaign for Phase 7 Ad Serving Engine (Paused)",
        status: "PAUSED",
        start_at: activeStart,
        end_at: activeEnd,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (pausedCampaign) {
    console.log(`✓ Provisioned Paused Campaign: ${pausedCampaign.id}`);

    await supabase.from("ad_creatives").upsert({
      campaign_id: pausedCampaign.id,
      creative_type: "SPONSORED_PIN",
      headline: "DUMMY Promo Jeda",
      description: "Campaign ini sedang di-pause dan tidak boleh diserve",
      cta_type: "REQUEST_ROUTE",
      status: "READY",
    });

    await supabase.from("ad_campaign_targets").upsert(
      {
        campaign_id: pausedCampaign.id,
        target_type: "RADIUS",
        radius_meters: 500,
        center_geometry: merchant.location || { type: "Point", coordinates: [107.609, -6.9175] },
      },
      { onConflict: "campaign_id" }
    );
  }

  console.log("=== [PHASE 07] Test Data Provisioning Complete ===");
}

if (process.argv[1]?.includes("provision-phase07-serving-test-data")) {
  provisionPhase07TestData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
