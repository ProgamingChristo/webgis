import { createClient } from "@supabase/supabase-js";

process.loadEnvFile("backend/.env.local");
process.loadEnvFile("frontend/.env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!supabaseUrl || !serviceKey || !anonKey) {
  throw new Error("Missing Supabase URL/service/publishable key in local env.");
}

const service = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = `phase7-${Date.now()}`;
const password = `Getra-${runId}-Pass123!`;
const emails = {
  userA: `getra-${runId}-a@example.test`,
  userB: `getra-${runId}-b@example.test`,
  admin: `getra-${runId}-admin@example.test`,
  government: `getra-${runId}-gov@example.test`,
  umkm: `getra-${runId}-umkm@example.test`,
};

const results = [];
const createdUsers = [];
const createdContributionIds = [];
let merchantId = null;
let canonicalBefore = null;
let canonicalAfter = null;

function record(name, status, detail = "") {
  results.push({ name, status: status === true ? "PASS" : status, detail });
}

function ok(value) {
  return !value.error;
}

function expectDenied(value) {
  return Boolean(value.error);
}

function publicClient(accessToken) {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

async function createIdentity(label, accountRole = "USER", modes = []) {
  const email = emails[label];
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const user = data.user;
  createdUsers.push(user.id);

  const { error: profileError } = await service.from("profiles").upsert({
    id: user.id,
    display_name: `GETRA Phase7 ${label}`,
    account_role: accountRole,
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  for (const mode of modes) {
    const { error: modeError } = await service
      .from("user_stakeholder_modes")
      .upsert({ user_id: user.id, mode }, { onConflict: "user_id,mode" });
    if (modeError) throw modeError;
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sessionData, error: signInError } =
    await authClient.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return {
    id: user.id,
    email,
    accessToken: sessionData.session.access_token,
    client: publicClient(sessionData.session.access_token),
  };
}

async function createContribution(identity, reportType, location, reportData, options = {}) {
  const { data, error } = await identity.client
    .rpc("create_community_contribution_v1", {
      p_report_type: reportType,
      p_longitude: location.longitude,
      p_latitude: location.latitude,
      p_observed_at: new Date().toISOString(),
      p_report_data: reportData,
      p_target_merchant_id: options.targetMerchantId ?? null,
      p_reported_new_longitude: options.reportedNewLocation?.longitude ?? null,
      p_reported_new_latitude: options.reportedNewLocation?.latitude ?? null,
    })
    .single();

  if (error) throw error;
  createdContributionIds.push(data.id);
  return data;
}

async function reviewContribution(admin, contributionId, action, reason = null) {
  const { data, error } = await admin.client
    .rpc("review_community_contribution_v1", {
      p_contribution_id: contributionId,
      p_action: action,
      p_rejection_reason: reason,
    })
    .single();
  if (error) throw error;
  return data;
}

function hasForbiddenKeys(value) {
  const text = JSON.stringify(value);
  const forbidden = [
    "author_id",
    "email",
    "phone",
    "account_role",
    "reviewer",
    "reviewed_by",
    "report_data",
    "points_awarded",
    "trust_score",
    "auth",
  ];
  return forbidden.filter((key) => text.includes(key));
}

async function cleanup() {
  if (createdContributionIds.length > 0) {
    await service
      .from("community_contribution_point_events")
      .delete()
      .in("contribution_id", createdContributionIds);
    await service
      .from("community_contribution_moderation_events")
      .delete()
      .in("contribution_id", createdContributionIds);
    await service
      .from("community_notifications")
      .delete()
      .in("entity_id", createdContributionIds);
    await service
      .from("community_contributions")
      .delete()
      .in("id", createdContributionIds);
  }

  if (merchantId) {
    await service.from("merchants").delete().eq("id", merchantId);
  }

  if (createdUsers.length > 0) {
    await service
      .from("user_stakeholder_modes")
      .delete()
      .in("user_id", createdUsers);
    await service.from("profiles").delete().in("id", createdUsers);
    for (const userId of createdUsers) {
      await service.auth.admin.deleteUser(userId);
    }
  }
}

try {
  const userA = await createIdentity("userA");
  const userB = await createIdentity("userB");
  const admin = await createIdentity("admin", "ADMIN");
  const government = await createIdentity("government", "USER", ["GOVERNMENT"]);
  const umkm = await createIdentity("umkm", "USER", ["UMKM"]);

  const { data: merchant, error: merchantError } = await service
    .from("merchants")
    .insert({
      name: `GETRA Phase7 Merchant ${runId}`,
      slug: `getra-phase7-${runId}`,
      location: { type: "Point", coordinates: [106.828, -6.176] },
      address: "GETRA Phase7 test address",
      price_level: "CANONICAL_PRICE",
      opening_hours: { mon: "08:00-17:00" },
      publish_status: "PUBLISHED",
      verification_status: "VERIFIED",
      metadata: { phase7_test: runId },
    })
    .select("id, price_level, opening_hours, location")
    .single();
  if (merchantError) throw merchantError;
  merchantId = merchant.id;
  canonicalBefore = merchant;

  const pending = await createContribution(
    userA,
    "SIDEWALK_OBSTRUCTION",
    { longitude: 106.8272, latitude: -6.1754 },
    { details: `Pending obstruction ${runId}` },
  );
  const approvedInfra = await createContribution(
    userA,
    "RAMP_OR_GUIDING_BLOCK",
    { longitude: 106.8273, latitude: -6.1755 },
    { facility_type: "RAMP", details: `Approved ramp ${runId}` },
  );
  const rejected = await createContribution(
    userA,
    "CROSSING",
    { longitude: 106.8274, latitude: -6.1756 },
    { details: `Rejected crossing ${runId}` },
  );
  const price = await createContribution(
    userA,
    "MERCHANT_PRICE_CHANGED",
    { longitude: 106.831, latitude: -6.181 },
    { reported_price_level: `TEST_PRICE_${runId}` },
    { targetMerchantId: merchantId },
  );
  const hours = await createContribution(
    userA,
    "MERCHANT_HOURS_CHANGED",
    { longitude: 106.832, latitude: -6.182 },
    { reported_opening_hours: { mon: "09:00-18:00" } },
    { targetMerchantId: merchantId },
  );
  const moved = await createContribution(
    userA,
    "MERCHANT_LOCATION_CHANGED",
    { longitude: 106.833, latitude: -6.183 },
    { notes: `Moved ${runId}` },
    {
      targetMerchantId: merchantId,
      reportedNewLocation: { longitude: 106.8295, latitude: -6.1775 },
    },
  );
  const userBContribution = await createContribution(
    userB,
    "SIDEWALK_OBSTRUCTION",
    { longitude: 106.8272, latitude: -6.1754 },
    { details: `Cross-user similar ${runId}` },
  );

  await reviewContribution(admin, approvedInfra.id, "APPROVED");
  await reviewContribution(admin, rejected.id, "REJECTED", "INVALID_LOCATION");
  await reviewContribution(admin, price.id, "APPROVED");
  await reviewContribution(admin, hours.id, "APPROVED");
  await reviewContribution(admin, moved.id, "APPROVED");

  const mapValid = await userA.client.rpc("list_community_contribution_map_features_v1", {
    p_min_lng: 106.7,
    p_min_lat: -6.3,
    p_max_lng: 106.9,
    p_max_lat: -6.1,
    p_limit: 999,
  });
  const mapRows = mapValid.data ?? [];
  const ids = new Set(mapRows.map((row) => row.id));
  record("RPC authenticated valid bbox", ok(mapValid), `${mapRows.length} rows`);
  record("PENDING absent from map", !ids.has(pending.id) ? "PASS" : "FAIL");
  record("REJECTED absent from map", !ids.has(rejected.id) ? "PASS" : "FAIL");
  record("APPROVED visible on map", ids.has(approvedInfra.id) ? "PASS" : "FAIL");
  record("Cross-user similar allowed", userBContribution.status === "PENDING" ? "PASS" : "FAIL");

  const anonMap = await publicClient(null).rpc("list_community_contribution_map_features_v1", {
    p_min_lng: 106.7,
    p_min_lat: -6.3,
    p_max_lng: 106.9,
    p_max_lat: -6.1,
    p_limit: 10,
  });
  record("RPC anonymous denied", expectDenied(anonMap) ? "PASS" : "FAIL");

  const invalidBbox = await userA.client.rpc("list_community_contribution_map_features_v1", {
    p_min_lng: 106.9,
    p_min_lat: -6.3,
    p_max_lng: 106.7,
    p_max_lat: -6.1,
    p_limit: 10,
  });
  record("RPC invalid bbox denied", expectDenied(invalidBbox) ? "PASS" : "FAIL");

  const oversizedBbox = await userA.client.rpc("list_community_contribution_map_features_v1", {
    p_min_lng: 100,
    p_min_lat: -8,
    p_max_lng: 110,
    p_max_lat: -5,
    p_limit: 10,
  });
  record("RPC oversized bbox denied", expectDenied(oversizedBbox) ? "PASS" : "FAIL");

  const outsideBbox = await userA.client.rpc("list_community_contribution_map_features_v1", {
    p_min_lng: 107.5,
    p_min_lat: -6.3,
    p_max_lng: 107.6,
    p_max_lat: -6.1,
    p_limit: 10,
  });
  record(
    "RPC outside bbox excludes approved fixture",
    !(outsideBbox.data ?? []).some((row) => row.id === approvedInfra.id) ? "PASS" : "FAIL",
  );

  const forbiddenKeys = hasForbiddenKeys(mapRows.filter((row) => createdContributionIds.includes(row.id)));
  record("RPC privacy forbidden keys", forbiddenKeys.length === 0 ? "PASS" : "FAIL", forbiddenKeys.join(","));

  const byId = new Map(mapRows.map((row) => [row.id, row]));
  const priceRow = byId.get(price.id);
  const hoursRow = byId.get(hours.id);
  const movedRow = byId.get(moved.id);
  record(
    "Price projection canonical merchant location",
    priceRow &&
      Math.abs(priceRow.public_longitude - 106.828) < 0.000001 &&
      Math.abs(priceRow.public_latitude - -6.176) < 0.000001
      ? "PASS"
      : "FAIL",
  );
  record(
    "Hours projection canonical merchant location",
    hoursRow &&
      Math.abs(hoursRow.public_longitude - 106.828) < 0.000001 &&
      Math.abs(hoursRow.public_latitude - -6.176) < 0.000001
      ? "PASS"
      : "FAIL",
  );
  record(
    "Merchant-location projection candidate location",
    movedRow &&
      Math.abs(movedRow.public_longitude - 106.8295) < 0.000001 &&
      Math.abs(movedRow.public_latitude - -6.1775) < 0.000001
      ? "PASS"
      : "FAIL",
  );

  const historyA = await userA.client.rpc("list_community_contribution_history_v1", {
    p_limit: 50,
    p_offset: 0,
    p_status: null,
    p_report_type: null,
  });
  const historyB = await userB.client.rpc("list_community_contribution_history_v1", {
    p_limit: 50,
    p_offset: 0,
    p_status: null,
    p_report_type: null,
  });
  record(
    "User A history excludes User B",
    !(historyA.data ?? []).some((row) => row.id === userBContribution.id) ? "PASS" : "FAIL",
  );
  record(
    "User B history excludes User A",
    !(historyB.data ?? []).some((row) => row.id === pending.id) ? "PASS" : "FAIL",
  );

  const userModeration = await userA.client.rpc("review_community_contribution_v1", {
    p_contribution_id: pending.id,
    p_action: "APPROVED",
    p_rejection_reason: null,
  });
  record("USER moderation denied", expectDenied(userModeration) ? "PASS" : "FAIL");

  const govModeration = await government.client.rpc("review_community_contribution_v1", {
    p_contribution_id: pending.id,
    p_action: "APPROVED",
    p_rejection_reason: null,
  });
  record("GOVERNMENT-mode moderation denied", expectDenied(govModeration) ? "PASS" : "FAIL");

  const umkmModeration = await umkm.client.rpc("review_community_contribution_v1", {
    p_contribution_id: pending.id,
    p_action: "APPROVED",
    p_rejection_reason: null,
  });
  record("UMKM-mode moderation denied", expectDenied(umkmModeration) ? "PASS" : "FAIL");

  const selfReview = await userA.client.rpc("review_community_contribution_v1", {
    p_contribution_id: pending.id,
    p_action: "APPROVED",
    p_rejection_reason: null,
  });
  record("Self-confirm denied", expectDenied(selfReview) ? "PASS" : "FAIL");

  const spoofAuthor = await userA.client.from("community_contributions").insert({
    author_id: userB.id,
    report_type: "SIDEWALK_OBSTRUCTION",
    status: "PENDING",
    location: { type: "Point", coordinates: [106.82, -6.17] },
    observed_at: new Date().toISOString(),
    report_data: { details: "spoof" },
  });
  record("Direct author spoof denied", expectDenied(spoofAuthor) ? "PASS" : "FAIL");

  const spoofStatus = await userA.client.from("community_contributions").insert({
    author_id: userA.id,
    report_type: "SIDEWALK_OBSTRUCTION",
    status: "APPROVED",
    location: { type: "Point", coordinates: [106.821, -6.171] },
    observed_at: new Date().toISOString(),
    report_data: { details: "spoof status" },
  });
  record("Direct status spoof denied", expectDenied(spoofStatus) ? "PASS" : "FAIL");

  const reviewSpoof = await userA.client
    .from("community_contributions")
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: userA.id })
    .eq("id", pending.id);
  record("Direct review spoof denied", expectDenied(reviewSpoof) ? "PASS" : "FAIL");

  const pointInsert = await userA.client.from("community_contribution_point_events").insert({
    user_id: userA.id,
    contribution_id: pending.id,
    points: 999,
    reason: "APPROVED_CONTRIBUTION",
  });
  record("Direct points insert denied", expectDenied(pointInsert) ? "PASS" : "FAIL");

  const awardPending = await userA.client.rpc("award_community_contribution_points_v1", {
    p_contribution_id: pending.id,
  });
  record("Award pending contribution denied", expectDenied(awardPending) ? "PASS" : "FAIL");

  const trustUpdate = await userA.client
    .from("profiles")
    .update({ trust_score: 100 })
    .eq("id", userA.id);
  record("Direct trust_score update denied", expectDenied(trustUpdate) ? "PASS" : "FAIL");

  const duplicate = await userA.client
    .rpc("create_community_contribution_v1", {
    p_report_type: "SIDEWALK_OBSTRUCTION",
    p_longitude: 106.8272,
    p_latitude: -6.1754,
    p_observed_at: new Date().toISOString(),
    p_report_data: { details: `Pending duplicate ${runId}` },
    p_target_merchant_id: null,
    p_reported_new_longitude: null,
    p_reported_new_latitude: null,
  })
    .single();
  if (duplicate.data?.id) {
    createdContributionIds.push(duplicate.data.id);
  }
  record(
    "Self duplicate denied",
    expectDenied(duplicate) ? "PASS" : "FAIL",
    duplicate.error?.message ?? JSON.stringify(duplicate.data),
  );

  const { data: summaryA } = await userA.client
    .rpc("get_community_contribution_summary_v1")
    .single();
  record(
    "Points/trust summary updated",
    summaryA?.contribution_points === 4 && summaryA?.reviewed_contributions >= 5
      ? "PASS"
      : "FAIL",
    JSON.stringify({
      points: summaryA?.contribution_points,
      trust: summaryA?.trust_score,
      reviewed: summaryA?.reviewed_contributions,
    }),
  );

  const { data: notifications } = await userA.client
    .from("community_notifications")
    .select("id,type,entity_id,metadata")
    .in("entity_id", [approvedInfra.id, rejected.id, price.id, hours.id, moved.id]);
  record(
    "Notifications created for moderation",
    (notifications ?? []).length >= 5 ? "PASS" : "FAIL",
    `${(notifications ?? []).length} notifications`,
  );

  const { data: merchantAfter, error: merchantAfterError } = await service
    .from("merchants")
    .select("id, price_level, opening_hours, location")
    .eq("id", merchantId)
    .single();
  if (merchantAfterError) throw merchantAfterError;
  canonicalAfter = merchantAfter;
  record(
    "Canonical merchant price/hours unchanged",
    canonicalAfter.price_level === canonicalBefore.price_level &&
      JSON.stringify(canonicalAfter.opening_hours) === JSON.stringify(canonicalBefore.opening_hours)
      ? "PASS"
      : "FAIL",
  );

  if (apiUrl) {
    const unauth = await fetch(
      `${apiUrl}/api/community/contributions/map?min_lng=106.7&min_lat=-6.3&max_lng=106.9&max_lat=-6.1&limit=10`,
    );
    record("API unauthenticated denied", unauth.status === 401 ? "PASS" : "FAIL", String(unauth.status));

    const auth = await fetch(
      `${apiUrl}/api/community/contributions/map?min_lng=106.7&min_lat=-6.3&max_lng=106.9&max_lat=-6.1&limit=999`,
      { headers: { Authorization: `Bearer ${userA.accessToken}` } },
    );
    const authJson = await auth.json().catch(() => null);
    const apiForbidden = hasForbiddenKeys(authJson?.data ?? []);
    record("API authenticated valid bbox", auth.ok ? "PASS" : "FAIL", String(auth.status));
    record("API privacy forbidden keys", apiForbidden.length === 0 ? "PASS" : "FAIL", apiForbidden.join(","));

    const bad = await fetch(
      `${apiUrl}/api/community/contributions/map?min_lng=106.9&min_lat=-6.3&max_lng=106.7&max_lat=-6.1`,
      { headers: { Authorization: `Bearer ${userA.accessToken}` } },
    );
    record("API invalid bbox denied", bad.status === 400 ? "PASS" : "FAIL", String(bad.status));
  } else {
    record("API checks", "NOT_VERIFIED", "NEXT_PUBLIC_API_URL missing");
  }
} finally {
  await cleanup();
}

const failed = results.filter((result) => result.status === "FAIL");
console.log(JSON.stringify({ runId, results, failed: failed.length }, null, 2));
process.exitCode = failed.length > 0 ? 1 : 0;
