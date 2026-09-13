import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(supabaseUrl, anonKey);
const serviceClient = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log("=== STEP 1: AUTHENTICATE ADMIN ===");
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: "getra.admin.test@example.com",
    password: "PasswordDevelopment123!",
  });
  if (authErr) throw authErr;
  const adminToken = auth.session.access_token;
  const adminId = auth.user.id;
  console.log("Admin logged in:", adminId);

  console.log("\n=== STEP 2: RECORD BEFORE STATE ===");
  const submissionId = "e83ec3d1-6905-4e68-bb13-82ad7f0dd9ae"; // "kopi christo"
  const { data: beforeSub, error: beforeErr } = await serviceClient
    .from("merchant_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (beforeErr || !beforeSub) {
    throw new Error("Submission not found: " + JSON.stringify(beforeErr));
  }

  console.log("SUBMISSION_ID:", beforeSub.id);
  console.log("SUBMITTER_ID:", beforeSub.submitted_by);
  console.log("NAME:", beforeSub.name);
  console.log("STATUS:", beforeSub.status);
  console.log("COORDINATES:", JSON.stringify(beforeSub.location?.coordinates));
  console.log("ADDRESS:", beforeSub.address);
  console.log("CANONICAL_MERCHANT_ID:", beforeSub.canonical_merchant_id ?? "NONE");

  // Check before merchant count
  const { count: beforeMerchantCount } = await serviceClient
    .from("merchants")
    .select("*", { count: "exact", head: true })
    .eq("metadata->>submitted_from_id", submissionId);
  console.log("MERCHANT_COUNT_FOR_IDENTITY_BEFORE:", beforeMerchantCount);

  console.log("\n=== STEP 3: EXECUTE APPROVE VIA BACKEND API (PORT 8180) ===");
  const approveUrl = `http://localhost:8180/api/admin/merchant-submissions/${submissionId}/approve`;
  const approveRes = await fetch(approveUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ note: "Disetujui oleh admin operasional GETRA." }),
  });

  const approveJson = await approveRes.json();
  console.log("Approve HTTP Status:", approveRes.status);
  console.log("Approve Response:", JSON.stringify(approveJson, null, 2));

  if (!approveRes.ok || !approveJson.success) {
    throw new Error("Approval failed: " + JSON.stringify(approveJson));
  }

  const canonicalMerchantId = approveJson.data.merchant_id || approveJson.data.canonical_merchant_id;
  console.log("CANONICAL_MERCHANT_ID_RETURNED:", canonicalMerchantId);

  console.log("\n=== STEP 4: TEST IDEMPOTENCY (SECOND APPROVAL) ===");
  const approveRes2 = await fetch(approveUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ note: "Approval kedua untuk uji idempotency." }),
  });
  const approveJson2 = await approveRes2.json();
  console.log("Second Approve HTTP Status:", approveRes2.status);
  console.log("Second Approve Response:", JSON.stringify(approveJson2, null, 2));

  const { count: afterMerchantCount } = await serviceClient
    .from("merchants")
    .select("*", { count: "exact", head: true })
    .eq("metadata->>submitted_from_id", submissionId);
  console.log("MERCHANT_COUNT_FOR_IDENTITY_AFTER:", afterMerchantCount);

  const { count: afterOwnershipCount } = await serviceClient
    .from("merchant_ownerships")
    .select("*", { count: "exact", head: true })
    .eq("merchant_id", canonicalMerchantId);
  console.log("VERIFIED_OWNERSHIP_COUNT:", afterOwnershipCount);

  console.log("\n=== STEP 5: VERIFY CANONICAL MERCHANT DATA & GEOMETRY ===");
  const { data: merchantRow, error: merchErr } = await serviceClient
    .from("merchants")
    .select("*")
    .eq("id", canonicalMerchantId)
    .single();

  if (merchErr || !merchantRow) {
    throw new Error("Canonical merchant not found in DB: " + JSON.stringify(merchErr));
  }

  console.log("MERCHANT_NAME:", merchantRow.name);
  console.log("MERCHANT_ADDRESS:", merchantRow.address);
  console.log("MERCHANT_LOCATION:", JSON.stringify(merchantRow.location));
  console.log("MERCHANT_PUBLISH_STATUS:", merchantRow.publish_status);
  console.log("MERCHANT_VERIFICATION_STATUS:", merchantRow.verification_status);
  console.log("MERCHANT_SOURCES:", JSON.stringify(merchantRow.sources));

  // Coordinate check
  const subLng = beforeSub.location.coordinates[0];
  const subLat = beforeSub.location.coordinates[1];
  const merchLng = merchantRow.location.coordinates[0];
  const merchLat = merchantRow.location.coordinates[1];

  console.log("SUBMITTED_COORDINATES:", [subLng, subLat]);
  console.log("CANONICAL_COORDINATES:", [merchLng, merchLat]);
  const coordMatch = Math.abs(subLng - merchLng) < 0.00001 && Math.abs(subLat - merchLat) < 0.00001;
  console.log("COORDINATE_MATCH:", coordMatch ? "YES" : "NO");
  console.log("LAT_LON_ORDER:", (merchLng > 90 && merchLat < 0) ? "PASS" : "FAIL");

  console.log("\n=== STEP 6: VERIFY SUBMISSION AFTER STATE ===");
  const { data: afterSub } = await serviceClient
    .from("merchant_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();
  console.log("SUBMISSION_STATUS_AFTER:", afterSub.status);
  console.log("SUBMISSION_CANONICAL_ID:", afterSub.canonical_merchant_id);

  console.log("\n=== STEP 7: QUERY PUBLIC CANONICAL ENDPOINT ===");
  const canonicalUrl = `http://localhost:8180/api/merchants/canonical?q=kopi+christo&scope=GLOBAL`;
  const canRes = await fetch(canonicalUrl, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const canJson = await canRes.json();
  console.log("Canonical HTTP Status:", canRes.status);
  const foundInCan = canJson.data?.merchants?.some(m => m.id === canonicalMerchantId || m.name?.toLowerCase().includes("kopi christo"));
  console.log("APPROVED_MERCHANT_FOUND_IN_CANONICAL:", foundInCan ? "YES" : "NO");
  if (foundInCan) {
    const m = canJson.data.merchants.find(m => m.id === canonicalMerchantId || m.name?.toLowerCase().includes("kopi christo"));
    console.log("CANONICAL_MERCHANT_COORDS:", [m.longitude, m.latitude]);
    console.log("CANONICAL_MERCHANT_NAME:", m.name);
    console.log("CANONICAL_MERCHANT_STATUS:", m.status);
    console.log("CANONICAL_MERCHANT_SOURCE:", m.source);
  }

  console.log("\n=== STEP 8: TEST ROUTING (RUTE KE SINI) ===");
  const startLng = merchLng + 0.005;
  const startLat = merchLat + 0.005;
  const routeUrl = `http://localhost:8180/api/routing`;
  const routeRes = await fetch(routeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      origin: { longitude: startLng, latitude: startLat },
      destination: { longitude: merchLng, latitude: merchLat },
      mode: "walking",
    }),
  });
  const routeJson = await routeRes.json();
  console.log("Routing HTTP Status:", routeRes.status);
  console.log("Routing Success:", routeJson.success);
  console.log("Routing Distance:", routeJson.data?.routes?.[0]?.distance_meters);
  console.log("Routing Duration:", routeJson.data?.routes?.[0]?.duration_seconds);

  console.log("\n=== STEP 9: TEST OWNER WORKSPACE ===");
  const workspaceUrl = `http://localhost:8180/api/umkm/workspace`;
  const wsRes = await fetch(workspaceUrl, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const wsJson = await wsRes.json();
  console.log("Owner Workspace HTTP Status:", wsRes.status);
  const foundInWs = wsJson.data?.owned_merchants?.some(m => m.id === canonicalMerchantId || m.name.toLowerCase().includes("kopi christo"));
  console.log("FOUND_IN_OWNER_WORKSPACE:", foundInWs ? "YES" : "NO");

  console.log("\n=== ALL DATABASE AND BACKEND CHECKS COMPLETED ===");
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
