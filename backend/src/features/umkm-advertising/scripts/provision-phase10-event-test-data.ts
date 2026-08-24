import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in process.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TEST_MERCHANT_ID = "88888888-8888-4888-8888-888888888888";
const TEST_USER_ID = "cb0d10dc-a616-4e9b-8070-258b250f2a3a"; // getra.umkm.test@example.com
const TEST_CAMPAIGN_ID = "99999999-9999-4999-9999-999999999999";
const CREATIVE_PIN_ID = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const CREATIVE_BANNER_ID = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const CREATIVE_POSTER_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc";

async function provisionPhase10TestData() {
  console.log("=== Provisioning Phase 10 Event Tracking Test Data ===");

  // 1. Ensure Merchant Exists
  const { data: existingMerchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("id", TEST_MERCHANT_ID)
    .maybeSingle();

  if (!existingMerchant) {
    const { error: mError } = await supabase.from("merchants").insert({
      id: TEST_MERCHANT_ID,
      name: "Warung Kopi Selamat GETRA",
      address: "Jl. Kebon Jeruk No. 12, Jakarta Barat",
      publish_status: "PUBLISHED",
      verification_status: "VERIFIED",
      owner_id: TEST_USER_ID,
      location: {
        type: "Point",
        coordinates: [106.78, -6.18],
      },
    });
    if (mError) throw mError;
    console.log("✓ Merchant 'Warung Kopi Selamat GETRA' created.");
  } else {
    console.log("✓ Merchant exists.");
  }

  // 2. Ensure Active Campaign
  const now = new Date();
  const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: cError } = await supabase.from("ad_campaigns").upsert({
    id: TEST_CAMPAIGN_ID,
    merchant_id: TEST_MERCHANT_ID,
    created_by: TEST_USER_ID,
    name: "Campaign Promo All Placements Phase 10",
    description: "Data uji GETRA Advertising Phase 10 Event Tracking",
    status: "ACTIVE",
    start_at: startAt,
    end_at: endAt,
  });
  if (cError) throw cError;
  console.log("✓ Campaign verified (status: ACTIVE).");

  // 3. Ensure Spatial Targeting
  const { error: tError } = await (supabase as any).from("ad_campaign_targets").upsert({
    campaign_id: TEST_CAMPAIGN_ID,
    target_type: "RADIUS",
    center_geometry: "SRID=4326;POINT(106.78 -6.18)",
    radius_meters: 5000,
  });
  if (tError) throw tError;
  console.log("✓ Targeting verified (radius: 5000m).");

  // 4. Ensure Creatives in READY Status
  const creatives = [
    {
      id: CREATIVE_PIN_ID,
      creative_type: "SPONSORED_PIN",
      headline: "DUMMY Kopi Susu Diskon 30%",
      description: "Kopi susu gula aren hemat untuk pejalan kaki transit.",
      cta_type: "VIEW_PROFILE",
      status: "READY",
    },
    {
      id: CREATIVE_BANNER_ID,
      creative_type: "CONTEXTUAL_BANNER",
      headline: "DUMMY Promo Kopi Susu Diskon 40%",
      description: "Promo hemat sarapan untuk commuter transit!",
      image_path: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400",
      cta_type: "VIEW_PROFILE",
      status: "READY",
    },
    {
      id: CREATIVE_POSTER_ID,
      creative_type: "PROFILE_POSTER",
      headline: "DUMMY Paket Spesial Transit Mahasiswa Rp15.000",
      description: "Nikmati paket nasi + kopi susu spesial khusus pelanggan transit GETRA.",
      image_path: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600",
      cta_type: "REQUEST_ROUTE",
      status: "READY",
    },
  ];

  for (const cr of creatives) {
    const { error: crErr } = await supabase.from("ad_creatives").upsert({
      id: cr.id,
      campaign_id: TEST_CAMPAIGN_ID,
      creative_type: cr.creative_type,
      headline: cr.headline,
      description: cr.description,
      cta_type: cr.cta_type,
      image_path: cr.image_path || null,
      status: "READY",
    });
    if (crErr) throw crErr;
    console.log(`✓ Creative ${cr.creative_type} verified READY.`);
  }

  console.log("=== Provisioning Complete! ===");
}

provisionPhase10TestData().catch((err) => {
  console.error("Provisioning failed:", err);
  process.exit(1);
});
