import { createClient } from "@supabase/supabase-js";

process.loadEnvFile("backend/.env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const userEmail = "getra.umkm.test@example.com";
const { data: userData } = await supabase.auth.admin.listUsers();
let user = userData.users.find((u) => u.email === userEmail);

if (!user) {
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email: userEmail,
    password: "Password123!",
    email_confirm: true,
  });
  if (createErr) throw createErr;
  user = newUser.user;
}

const userId = user.id;
console.log(`[Setup] User ID: ${userId}`);

// 1. Ensure Profile
await supabase.from("profiles").upsert({
  id: userId,
  account_role: "USER",
  onboarding_complete: true,
  display_name: "Budi UMKM GETRA",
  updated_at: new Date().toISOString(),
});

// 2. Ensure UMKM Mode
await supabase.from("user_stakeholder_modes").upsert(
  { user_id: userId, mode: "UMKM" },
  { onConflict: "user_id,mode" }
);

// 3. Ensure Owned Merchant
const { data: existingMerchants } = await supabase
  .from("merchants")
  .select("*")
  .eq("owner_id", userId);

let merchantId;
if (existingMerchants && existingMerchants.length > 0) {
  merchantId = existingMerchants[0].id;
} else {
  const { data: newMerchant, error: merchErr } = await supabase
    .from("merchants")
    .insert({
      name: "Warung Kopi & Roti Selamat",
      owner_id: userId,
      category: "Makanan & Minuman",
      address: "Jalan Biak No. 29C, Jakarta Pusat",
      description: "Kedai Kopi & Roti Tradisional Transit Ramah Komuter",
      publish_status: "PUBLISHED",
      verification_status: "VERIFIED",
      location: {
        type: "Point",
        coordinates: [106.8150, -6.1700],
      },
    })
    .select()
    .single();

  if (merchErr) throw merchErr;
  merchantId = newMerchant.id;
}

console.log(`[Setup] Merchant ID: ${merchantId}`);

// 4. Ensure Submission Draft
const { data: existingSubmissions } = await supabase
  .from("merchant_submissions")
  .select("id")
  .eq("submitted_by", userId);

if (!existingSubmissions || existingSubmissions.length === 0) {
  await supabase.from("merchant_submissions").insert({
    submitted_by: userId,
    name: "Kopi Transit Juanda",
    category: "Makanan & Minuman",
    address: "Jl. Ir. H. Juanda No. 12, Gambir",
    description: "Kopi Seduh Segar di Dekat Stasiun Juanda",
    status: "PENDING_REVIEW",
    location: {
      type: "Point",
      coordinates: [106.8290, -6.1660],
    },
  });
  console.log(`[Setup] Created sample submission.`);
}

// 5. Ensure Campaign
const campaignId = "11111111-2222-4333-8444-555555555555";
const now = new Date();
const startAt = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
const endAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

await supabase.from("ad_campaigns").upsert({
  id: campaignId,
  merchant_id: merchantId,
  created_by: userId,
  name: "DUMMY GETRA FINAL DEMO CAMPAIGN",
  description: "Promo Spesial Komuter Transit Jabodetabek 2026",
  status: "ACTIVE",
  start_at: startAt,
  end_at: endAt,
  updated_at: now.toISOString(),
});

// 6. Ensure Creative
await supabase.from("ad_creatives").upsert({
  campaign_id: campaignId,
  headline: "Promo Kopi Transit Diskon 20%",
  body: "Tunjukkan tiket transit KRL/MRT Anda dan nikmati diskon 20% untuk semua varian kopi espresso dan roti hangat.",
  call_to_action: "Kunjungi Outlet",
  status: "READY",
  updated_at: now.toISOString(),
});

// 7. Ensure Targeting
await supabase.from("ad_campaign_targets").upsert({
  campaign_id: campaignId,
  radius_meters: 1000,
  updated_at: now.toISOString(),
});

// 8. Ensure Payment Order (PAID)
await supabase.from("ad_payment_orders").upsert(
  {
    campaign_id: campaignId,
    created_by: userId,
    order_id: "GETRA-AD-DEMO-2026-PAID",
    amount: 50000,
    currency: "IDR",
    status: "PAID",
    provider: "MIDTRANS",
    provider_transaction_status: "settlement",
    paid_at: now.toISOString(),
    updated_at: now.toISOString(),
  },
  { onConflict: "order_id" }
);

// 9. Ensure Sample Events for Analytics
const eventTypes = [
  { type: "IMPRESSION", count: 48, placement: "SPONSORED_PIN" },
  { type: "SPONSORED_PIN_CLICK", count: 18, placement: "SPONSORED_PIN" },
  { type: "PROFILE_OPEN", count: 12, placement: "PROFILE_POSTER" },
  { type: "ROUTE_REQUEST", count: 6, placement: "SPONSORED_PIN" },
];

for (const e of eventTypes) {
  for (let i = 0; i < e.count; i++) {
    const eventTime = new Date(now.getTime() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000));
    await supabase.from("campaign_events").insert({
      campaign_id: campaignId,
      event_type: e.type,
      placement: e.placement,
      occurred_at: eventTime.toISOString(),
      dedup_key: `dedup_${e.type}_${e.placement}_${eventTime.getTime()}_${i}_${Math.random()}`,
    });
  }
}

console.log("[Setup] Demo test data initialized successfully!");
