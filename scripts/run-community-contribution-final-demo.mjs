import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile("backend/.env.local");
process.loadEnvFile("frontend/.env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const frontendUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const chromePath =
  process.env.GETRA_CHROME_PATH ||
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!supabaseUrl || !anonKey || !serviceKey) {
  throw new Error("Missing Supabase URL, publishable key, or service key.");
}

const runId = `phase7-final-demo-${Date.now()}`;
const password = `Getra-${runId}-Pass123!`;
const userEmail = `getra-${runId}-user@example.test`;
const adminEmail = `getra-${runId}-admin@example.test`;
const merchantName = `GETRA Demo Merchant ${runId}`;
const artifactDir = path.join(
  "docs",
  "community-accessibility-contribution",
  "assets",
  "demo",
);

const service = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const evidence = {
  runId,
  date: new Date().toISOString(),
  environment: {
    branch: "",
    head: "",
    frontendUrl,
    apiUrl,
    supabaseProject: "sesakxnjaphrxqxllqjm",
    browser: "Chrome headless via puppeteer-core",
  },
  screenshots: [],
  api: {},
  security: {},
  privacy: {},
  reportTypes: {},
  cleanup: [],
  status: "PASS",
};

const created = {
  userIds: [],
  contributionIds: [],
  merchantId: null,
};

function pass(name, detail = "") {
  console.log(`[PASS] ${name}${detail ? ` - ${detail}` : ""}`);
}

async function createIdentity(email, role) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  created.userIds.push(data.user.id);
  const { error: profileError } = await service.from("profiles").upsert({
    id: data.user.id,
    display_name: `GETRA Demo ${role} ${runId}`,
    account_role: role,
    onboarding_complete: true,
    trust_score: 50,
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  return data.user.id;
}

async function signIn(email) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return {
    client: createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      },
    }),
    token: data.session.access_token,
  };
}

async function cleanup() {
  if (created.contributionIds.length > 0) {
    await service
      .from("community_contribution_point_events")
      .delete()
      .in("contribution_id", created.contributionIds);
    await service
      .from("community_contribution_moderation_events")
      .delete()
      .in("contribution_id", created.contributionIds);
    await service
      .from("community_notifications")
      .delete()
      .in("entity_id", created.contributionIds);
    await service
      .from("community_contributions")
      .delete()
      .in("id", created.contributionIds);
    evidence.cleanup.push("Deleted isolated demo contribution records by exact IDs.");
  }

  if (created.merchantId) {
    await service.from("merchants").delete().eq("id", created.merchantId);
    evidence.cleanup.push("Deleted isolated demo merchant by exact ID.");
  }

  if (created.userIds.length > 0) {
    await service.from("user_stakeholder_modes").delete().in("user_id", created.userIds);
    await service.from("profiles").delete().in("id", created.userIds);
    for (const userId of created.userIds) {
      await service.auth.admin.deleteUser(userId);
    }
    evidence.cleanup.push("Deleted isolated demo auth users/profiles by exact IDs.");
  }
}

async function screenshot(page, fileName) {
  const filePath = path.join(artifactDir, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  evidence.screenshots.push(filePath.replaceAll("\\", "/"));
}

async function login(page, email) {
  await page.goto(`${frontendUrl}/login`, { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto(`${frontendUrl}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#email", { timeout: 30_000 });
  await page.focus("#email");
  await page.keyboard.down("Control");
  await page.keyboard.press("A");
  await page.keyboard.up("Control");
  await page.type("#email", email);
  await page.focus("#password");
  await page.keyboard.down("Control");
  await page.keyboard.press("A");
  await page.keyboard.up("Control");
  await page.type("#password", password);
  const responsePromise = page.waitForResponse(
    (response) => response.url() === `${apiUrl}/api/auth/login`,
    { timeout: 30_000 },
  );
  await page.$eval("form", (form) => form.requestSubmit());
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(`Login failed with HTTP ${response.status()}`);
  }
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
}

async function waitText(page, text, timeout = 30_000) {
  try {
    await page.waitForFunction(
      (expected) => document.body.innerText.includes(expected),
      { timeout },
      text,
    );
  } catch (error) {
    const body = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, " ").slice(0, 700),
    );
    throw new Error(`Timed out waiting for "${text}" at ${page.url()}: ${body}`, {
      cause: error,
    });
  }
}

async function clickText(page, text) {
  const clicked = await page.evaluate((expected) => {
    const primary = Array.from(document.querySelectorAll("button, a, label, [role='button']"));
    const primaryTarget = primary.find((element) =>
      element.textContent?.includes(expected),
    );
    if (primaryTarget) {
      primaryTarget.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      primaryTarget.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      primaryTarget.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return true;
    }

    const elements = Array.from(document.querySelectorAll("li, article, div"));
    const target = elements.find((element) =>
      element.textContent?.includes(expected),
    );
    const clickable = target?.closest("button, a, label, [role='button']") || target;
    if (!clickable) return false;
    clickable.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    clickable.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    clickable.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return true;
  }, text);

  if (!clicked) throw new Error(`Clickable text not found: ${text}`);
}

async function clickNthButtonText(page, text, index) {
  const clicked = await page.evaluate(
    ({ expected, targetIndex }) => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const matches = buttons.filter((button) =>
        button.textContent?.includes(expected),
      );
      const target = matches[targetIndex];
      if (!target) return false;
      target.click();
      return true;
    },
    { expected: text, targetIndex: index },
  );

  if (!clicked) throw new Error(`Button "${text}" at index ${index} not found`);
}

async function clickMap(page, ariaLabel, xRatio = 0.52, yRatio = 0.48) {
  const handle = await page.waitForSelector(`[aria-label="${ariaLabel}"]`, {
    timeout: 30_000,
  });
  await handle.evaluate((element) =>
    element.scrollIntoView({ block: "center", inline: "center" }),
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error(`Map picker not visible: ${ariaLabel}`);
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await page.mouse.click(box.x + box.width * xRatio, box.y + box.height * yRatio);
    const selected = await page
      .waitForFunction(
        () => document.body.innerText.includes("Titik peta dipilih."),
        { timeout: 5000 },
      )
      .then(() => true)
      .catch(() => false);
    if (selected) return;
  }
  await waitText(page, "Titik peta dipilih.", 5000);
}

async function setObservedAtPast(page) {
  await page.$eval('input[type="datetime-local"]', (input) => {
    const date = new Date(Date.now() - 10 * 60 * 1000);
    const pad = (value) => String(value).padStart(2, "0");
    input.value = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function selectReportType(page, value) {
  const selector = `input[name="report_type"][value="${value}"]`;
  await page.waitForSelector(selector, { timeout: 30_000 });
  const box = await page.$eval(selector, (input) => {
    const label = input.closest("label");
    const rect = (label || input).getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function fetchApi(pathName, token, init = {}) {
  const response = await fetch(`${apiUrl}${pathName}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

async function createContributionViaRpc(identity, reportType, location, data, extra = {}) {
  const { data: row, error } = await identity.client
    .rpc("create_community_contribution_v1", {
      p_report_type: reportType,
      p_longitude: location.longitude,
      p_latitude: location.latitude,
      p_observed_at: new Date().toISOString(),
      p_report_data: data,
      p_target_merchant_id: extra.targetMerchantId ?? null,
      p_reported_new_longitude: extra.reportedNewLocation?.longitude ?? null,
      p_reported_new_latitude: extra.reportedNewLocation?.latitude ?? null,
    })
    .single();
  if (error) throw error;
  created.contributionIds.push(row.id);
  evidence.reportTypes[reportType] = "PASS";
  return row;
}

async function reviewViaApi(contributionId, token, action, reason = null) {
  const suffix = action === "APPROVED" ? "confirm" : "reject";
  const init =
    action === "APPROVED"
      ? { method: "POST" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        };
  const { response, json } = await fetchApi(
    `/api/admin/community/contributions/${contributionId}/${suffix}`,
    token,
    init,
  );
  if (!response.ok || !json?.success) {
    throw new Error(`${action} failed: HTTP ${response.status()} ${JSON.stringify(json)}`);
  }
  if (json.data.status !== action) {
    throw new Error(`${action} returned status ${json.data.status}`);
  }
  return json.data;
}

function hasForbiddenKeys(value) {
  const text = JSON.stringify(value);
  return [
    "email",
    "phone",
    "account_role",
    "reviewer",
    "reviewed_by",
    "private_moderation_note",
    "report_data",
    "points_awarded",
    "trust_score",
  ].filter((key) => text.includes(key));
}

async function run() {
  await fs.mkdir(artifactDir, { recursive: true });
  evidence.environment.branch = (
    await execText("git branch --show-current")
  ).trim();
  evidence.environment.head = (await execText("git rev-parse HEAD")).trim();

  const userId = await createIdentity(userEmail, "USER");
  await createIdentity(adminEmail, "ADMIN");

  const { data: merchant, error: merchantError } = await service
    .from("merchants")
    .insert({
      name: merchantName,
      slug: `getra-demo-merchant-${runId}`,
      location: { type: "Point", coordinates: [106.828, -6.176] },
      address: "GETRA demo-safe merchant address",
      price_level: "CANONICAL_PRICE",
      opening_hours: { monday: "08:00-17:00" },
      publish_status: "PUBLISHED",
      verification_status: "VERIFIED",
      metadata: { demo_run_id: runId },
    })
    .select("id, location, price_level, opening_hours")
    .single();
  if (merchantError) throw merchantError;
  created.merchantId = merchant.id;

  const user = await signIn(userEmail);
  const admin = await signIn(adminEmail);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-fake-ui-for-media-stream"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
  await page.setGeolocation({ longitude: 106.8277, latitude: -6.1759 });
  await browser.defaultBrowserContext().overridePermissions(frontendUrl, ["geolocation"]);

  const criticalConsole = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /TypeError|ReferenceError|Unhandled|Hydration/i.test(message.text())) {
      criticalConsole.push(message.text());
    }
  });
  page.on("pageerror", (error) => criticalConsole.push(error.message));

  try {
    await login(page, userEmail);
    await page.goto(`${frontendUrl}/community`, { waitUntil: "networkidle2" });
    await waitText(page, "Community");
    await page.goto(`${frontendUrl}/community/contributions`, { waitUntil: "networkidle2" });
    await waitText(page, "Laporkan Kondisi Akses");

    const approvedDetails = `Final demo approved sidewalk ${runId}`;
    await setObservedAtPast(page);
    await page.type("textarea", approvedDetails);
    await clickMap(page, "Lokasi kejadian pada peta");
    await screenshot(page, "01-contribution-form.png");
    await clickNthButtonText(page, "Kirim laporan", 0);
    await waitText(page, "Laporan berhasil dikirim.");

    const approvedLookup = await service
      .from("community_contributions")
      .select("id,status")
      .eq("author_id", userId)
      .eq("report_data->>details", approvedDetails)
      .limit(1);
    if (approvedLookup.error || approvedLookup.data.length !== 1) {
      throw approvedLookup.error || new Error("Approved demo contribution not found.");
    }
    const approvedContributionId = approvedLookup.data[0].id;
    created.contributionIds.push(approvedContributionId);
    if (approvedLookup.data[0].status !== "PENDING") {
      throw new Error("Demo A did not create PENDING contribution.");
    }
    evidence.reportTypes.SIDEWALK_OBSTRUCTION = "PASS";

    await clickText(page, "Riwayat");
    await waitText(page, "Menunggu pemeriksaan");
    await screenshot(page, "02-pending-history.png");
    pass("Demo A browser contribution and pending history");

    await login(page, adminEmail);
    await page.goto(`${frontendUrl}/admin/community/contributions`, { waitUntil: "networkidle2" });
    await waitText(page, "Moderasi Kontribusi Akses");
    await waitText(page, runId);
    await clickText(page, runId).catch(() => undefined);
    await screenshot(page, "03-admin-moderation.png");
    const approvedReview = await reviewViaApi(approvedContributionId, admin.token, "APPROVED");
    if (!approvedReview.reviewedAt && !approvedReview.reviewed_at) {
      throw new Error("Approved contribution did not return reviewed timestamp.");
    }
    pass("Demo B admin approval");

    await login(page, userEmail);
    await page.goto(`${frontendUrl}/community/contributions?merchantDemo=${Date.now()}`, {
      waitUntil: "networkidle2",
    });
    await waitText(page, "Laporkan Kondisi Akses");
    await clickText(page, "Riwayat");
    await waitText(page, "Diterima");
    await screenshot(page, "04-approved-history.png");
    await screenshot(page, "05-points-trust.png");
    await waitText(page, "kontribusi diterima ditampilkan.", 45_000);
    await screenshot(page, "06-approved-map.png");
    pass("Demo C approved history, points/trust panel, and map");

    const rejectedDetails = `Final demo rejected crossing ${runId}`;
    await page.goto(`${frontendUrl}/community/contributions`, { waitUntil: "networkidle2" });
    await waitText(page, "Laporkan Kondisi Akses");
    await clickText(page, "Penyeberangan");
    await setObservedAtPast(page);
    await page.type("textarea", rejectedDetails);
    await clickMap(page, "Lokasi kejadian pada peta", 0.54, 0.5);
    await clickNthButtonText(page, "Kirim laporan", 0);
    await waitText(page, "Laporan berhasil dikirim.");
    const rejectedLookup = await service
      .from("community_contributions")
      .select("id,status")
      .eq("author_id", userId)
      .eq("report_data->>details", rejectedDetails)
      .limit(1);
    if (rejectedLookup.error || rejectedLookup.data.length !== 1) {
      throw rejectedLookup.error || new Error("Rejected demo contribution not found.");
    }
    const rejectedContributionId = rejectedLookup.data[0].id;
    created.contributionIds.push(rejectedContributionId);
    evidence.reportTypes.CROSSING = "PASS";
    await reviewViaApi(rejectedContributionId, admin.token, "REJECTED", "INSUFFICIENT_INFORMATION");
    await page.goto(`${frontendUrl}/community/contributions`, { waitUntil: "networkidle2" });
    await waitText(page, "Laporkan Kondisi Akses");
    await clickText(page, "Riwayat");
    await waitText(page, "Ditolak");
    await screenshot(page, "07-rejected-history.png");
    pass("Demo D rejection flow");

    await page.goto(`${frontendUrl}/app`, { waitUntil: "networkidle2" });
    await waitText(page, "GETRA", 30_000);
    await clickText(page, "Notifikasi Community").catch(() => undefined);
    await screenshot(page, "08-notification.png");

    await page.goto(`${frontendUrl}/community/contributions`, { waitUntil: "networkidle2" });
    await waitText(page, "Laporkan Kondisi Akses");
    await selectReportType(page, "MERCHANT_LOCATION_CHANGED");
    await screenshot(page, "09-merchant-location-select.png");
    await waitText(page, "Pilih usaha dari hasil pencarian");
    await setObservedAtPast(page);
    await page.type('input[type="search"]', merchantName);
    await waitText(page, merchantName, 30_000);
    await clickText(page, merchantName);
    await page.type("textarea", `Final demo merchant moved ${runId}`);
    await clickMap(page, "Lokasi kejadian pada peta", 0.49, 0.5);
    await clickMap(page, "Lokasi baru yang dilaporkan pada peta", 0.58, 0.43);
    await clickNthButtonText(page, "Kirim laporan", 0);
    await waitText(page, "Laporan berhasil dikirim.");
    const movedLookup = await service
      .from("community_contributions")
      .select("id,status")
      .eq("author_id", userId)
      .eq("target_merchant_id", merchant.id)
      .eq("report_type", "MERCHANT_LOCATION_CHANGED")
      .order("created_at", { ascending: false })
      .limit(1);
    if (movedLookup.error || movedLookup.data.length !== 1) {
      throw movedLookup.error || new Error("Merchant location demo contribution not found.");
    }
    const movedId = movedLookup.data[0].id;
    created.contributionIds.push(movedId);
    await reviewViaApi(movedId, admin.token, "APPROVED");
    evidence.reportTypes.MERCHANT_LOCATION_CHANGED = "PASS";
    await screenshot(page, "09-merchant-location-browser.png");
    pass("Merchant location changed browser submission and approval");

    await createContributionViaRpc(
      user,
      "RAMP_OR_GUIDING_BLOCK",
      { longitude: 106.8278, latitude: -6.1758 },
      { facility_type: "RAMP", details: `API ramp ${runId}` },
    );
    await createContributionViaRpc(
      user,
      "MERCHANT_PRICE_CHANGED",
      { longitude: 106.8278, latitude: -6.1758 },
      { reported_price_level: "Rp10.000-Rp15.000", notes: `API price ${runId}` },
      { targetMerchantId: merchant.id },
    );
    await createContributionViaRpc(
      user,
      "MERCHANT_HOURS_CHANGED",
      { longitude: 106.8278, latitude: -6.1758 },
      { reported_opening_hours: { monday: "09:00-18:00" }, notes: `API hours ${runId}` },
      { targetMerchantId: merchant.id },
    );

    const history = await fetchApi("/api/community/contributions?page=1&limit=20", user.token);
    const notifications = await fetchApi("/api/community/notifications?page=1&limit=10", user.token);
    const map = await fetchApi(
      "/api/community/contributions/map?min_lng=106.80&min_lat=-6.20&max_lng=106.90&max_lat=-6.10&limit=250",
      user.token,
    );

    evidence.api.historyStatus = history.response.status;
    evidence.api.notificationsStatus = notifications.response.status;
    evidence.api.mapStatus = map.response.status;
    evidence.api.summary = history.json?.data?.summary ?? null;
    evidence.api.notificationsCount = notifications.json?.data?.items?.length ?? 0;
    evidence.api.approvedMapContainsApproved = Boolean(
      map.json?.data?.some((item) => item.id === approvedContributionId),
    );
    evidence.api.rejectedMapContainsRejected = Boolean(
      map.json?.data?.some((item) => item.id === rejectedContributionId),
    );
    evidence.api.merchantCanonicalUnchanged = true;

    const merchantAfter = await service
      .from("merchants")
      .select("location, price_level, opening_hours")
      .eq("id", merchant.id)
      .single();
    if (merchantAfter.error) throw merchantAfter.error;
    evidence.api.merchantCanonicalUnchanged =
      JSON.stringify(merchantAfter.data.location) === JSON.stringify(merchant.location) &&
      merchantAfter.data.price_level === merchant.price_level &&
      JSON.stringify(merchantAfter.data.opening_hours) === JSON.stringify(merchant.opening_hours);

    const forbidden = hasForbiddenKeys(map.json);
    evidence.privacy.mapForbiddenKeys = forbidden;
    if (forbidden.length > 0) {
      throw new Error(`Map privacy leak: ${forbidden.join(", ")}`);
    }
    if (!evidence.api.approvedMapContainsApproved || evidence.api.rejectedMapContainsRejected) {
      throw new Error("Approved/rejected map projection mismatch.");
    }
    if ((evidence.api.summary?.contributionPoints ?? 0) < 2) {
      throw new Error("Points summary did not increase after approval.");
    }
    if ((evidence.api.notificationsCount ?? 0) < 2) {
      throw new Error("Moderation notifications were not visible through API.");
    }
    if (!evidence.api.merchantCanonicalUnchanged) {
      throw new Error("Canonical merchant record mutated during merchant-location demo.");
    }

    const userModerationAttempt = await fetchApi(
      `/api/admin/community/contributions/${approvedContributionId}/confirm`,
      user.token,
      { method: "POST" },
    );
    const statusSpoof = await user.client
      .from("community_contributions")
      .update({ status: "APPROVED" })
      .eq("id", rejectedContributionId);
    const pointsSpoof = await user.client.from("community_contribution_point_events").insert({
      user_id: userId,
      contribution_id: rejectedContributionId,
      points: 999,
      reason: "APPROVED_CONTRIBUTION",
    });
    const trustSpoof = await user.client
      .from("profiles")
      .update({ trust_score: 100 })
      .eq("id", userId);

    evidence.security.userModerationDenied = userModerationAttempt.response.status >= 400;
    evidence.security.statusSpoofDenied = Boolean(statusSpoof.error);
    evidence.security.pointsSpoofDenied = Boolean(pointsSpoof.error);
    evidence.security.trustSpoofDenied = Boolean(trustSpoof.error);
    if (
      !evidence.security.userModerationDenied ||
      !evidence.security.statusSpoofDenied ||
      !evidence.security.pointsSpoofDenied ||
      !evidence.security.trustSpoofDenied
    ) {
      throw new Error(`Security boundary failed: ${JSON.stringify(evidence.security)}`);
    }

    if (criticalConsole.length > 0) {
      throw new Error(`Critical browser console errors: ${criticalConsole.join(" | ")}`);
    }
    pass("Security, privacy, six report types, notification, and canonical boundary");
  } finally {
    await browser.close();
  }
}

async function execText(command) {
  const { exec } = await import("node:child_process");
  return await new Promise((resolve, reject) => {
    exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

run()
  .then(async () => {
    await cleanup();
    await fs.writeFile(
      path.join(artifactDir, "demo-evidence.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );
    console.log(`[DONE] ${runId}`);
  })
  .catch(async (error) => {
    evidence.status = "FAIL";
    evidence.error = error.message;
    await cleanup();
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(
      path.join(artifactDir, "demo-evidence.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );
    console.error(`[FAIL] ${runId}: ${error.message}`);
    process.exitCode = 1;
  });
