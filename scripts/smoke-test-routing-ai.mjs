import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sesakxnjaphrxqxllqjm.supabase.co";
const supabaseAnonKey = "sb_publishable_XCmI_30nkk3NS1VdsQl1bg_g9xUNkW6";
const email = "getra.commuter.test@example.com";
const password = "PasswordDevelopment123!";

const publicApi = "https://getra-routing-api.tail0ed517.ts.net";

async function main() {
  console.log("1. Authenticating test user with Supabase...");
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError || !authData.session) {
    throw new Error(`Auth failed: ${authError?.message || "No session"}`);
  }

  const token = authData.session.access_token;
  console.log("   Authenticated successfully. Token acquired.");

  // Test 1: Routing Smoke Test (Walking, Motorcycle, Car)
  const modes = ["walking", "motorcycle", "car"];
  for (const mode of modes) {
    console.log(`\n2. Testing Routing Mode: [${mode}] via ${publicApi}/api/routing ...`);
    const routePayload = {
      origin: { latitude: -6.214120, longitude: 106.682990 },
      destination: { latitude: -6.218000, longitude: 106.687000 },
      mode
    };

    const routeRes = await fetch(`${publicApi}/api/routing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(routePayload)
    });

    console.log(`   HTTP Status: ${routeRes.status}`);
    const routeData = await routeRes.json();
    if (routeRes.status !== 200) {
      console.error("   Error response:", routeData);
    } else {
      console.log(`   Route Status: ${routeData.data?.route_status || "OK"}`);
      console.log(`   Distance: ${routeData.data?.distance_meters} m, Duration: ${routeData.data?.duration_seconds} s`);
      console.log(`   Coordinates: ${routeData.data?.geometry?.coordinates?.length || 0} points`);
    }
  }

  // Test 2: AI Smoke Test (Tanya GETRA: "bakso di jakarta pusat")
  console.log(`\n3. Testing Tanya GETRA AI: 'bakso di jakarta pusat' via ${publicApi}/api/ai/ask ...`);
  const aiPayload = {
    question: "bakso di jakarta pusat",
    active_experience: "GENERAL"
  };

  const aiRes = await fetch(`${publicApi}/api/ai/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(aiPayload)
  });

  console.log(`   HTTP Status: ${aiRes.status}`);
  const aiData = await aiRes.json();
  if (aiRes.status !== 200) {
    console.error("   Error response:", aiData);
  } else {
    console.log("   AI Response Answer:", aiData.data?.answer?.slice(0, 150) + "...");
    console.log("   AI Intent:", aiData.data?.intent);
    console.log("   AI Action:", aiData.data?.action?.type);
    console.log("   AI Provider:", aiData.data?.provider);
  }

  console.log("\nALL SMOKE TESTS COMPLETED!");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
