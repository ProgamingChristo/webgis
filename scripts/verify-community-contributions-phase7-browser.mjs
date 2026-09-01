import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile("backend/.env.local");
process.loadEnvFile("frontend/.env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const frontendUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl =
  process.env.NEXT_PUBLIC_GETRA_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";
const chromePath =
  process.env.GETRA_CHROME_PATH ||
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing Supabase URL or service role key in local env.");
}

const runId = `phase7-browser-${Date.now()}`;
const password = `Getra-${runId}-Pass123!`;
const userEmail = `getra-${runId}-user@example.test`;
const adminEmail = `getra-${runId}-admin@example.test`;
const observedDetails = `Browser Phase 7 obstruction ${runId}`;
const createdUsers = [];
const createdContributionIds = [];
const service = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function log(name, detail = "") {
  console.log(`[PASS] ${name}${detail ? ` - ${detail}` : ""}`);
}

async function createIdentity(email, accountRole) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  createdUsers.push(data.user.id);

  const { error: profileError } = await service.from("profiles").upsert({
    id: data.user.id,
    display_name: `GETRA ${accountRole} ${runId}`,
    account_role: accountRole,
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;

  return data.user.id;
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

  if (createdUsers.length > 0) {
    await service.from("profiles").delete().in("id", createdUsers);
    for (const userId of createdUsers) {
      await service.auth.admin.deleteUser(userId);
    }
  }
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
  await page.type("#email", email, { delay: 5 });
  await page.focus("#password");
  await page.keyboard.down("Control");
  await page.keyboard.press("A");
  await page.keyboard.up("Control");
  await page.type("#password", password, { delay: 5 });
  const loginResponsePromise = page
    .waitForResponse(
      (response) => response.url() === `${apiUrl}/api/auth/login`,
      { timeout: 30_000 },
    )
    .catch(() => null);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30_000 }).catch(() => null),
    page.$eval("form", (form) => form.requestSubmit()),
  ]);
  const loginResponse = await loginResponsePromise;
  if (!loginResponse) {
    throw new Error(`No /api/auth/login response captured for ${email}. URL: ${page.url()}`);
  }
  if (!loginResponse.ok()) {
    const body = await loginResponse.text().catch(() => "");
    throw new Error(
      `/api/auth/login returned ${loginResponse.status()} for ${email}. Body: ${body.slice(0, 300)}`,
    );
  }
  try {
    await page.waitForFunction(
      () => !location.pathname.startsWith("/login"),
      { timeout: 30_000 },
    );
  } catch (error) {
    const body = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, " ").slice(0, 500),
    );
    throw new Error(`Login did not leave /login for ${email}. URL: ${page.url()}. Body: ${body}`, {
      cause: error,
    });
  }
}

async function assertText(page, text, timeout = 20_000) {
  try {
    await page.waitForFunction(
      (expected) => document.body.innerText.includes(expected),
      { timeout },
      text,
    );
  } catch (error) {
    const body = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, " ").slice(0, 500),
    );
    throw new Error(
      `Timed out waiting for text "${text}" at ${page.url()}. Body: ${body}`,
      { cause: error },
    );
  }
}

async function clickButtonByText(page, text) {
  const buttons = await page.$$("button");
  for (const button of buttons) {
    const label = await button.evaluate((element) => element.textContent ?? "");
    if (label.includes(text)) {
      await button.click();
      return;
    }
  }

  throw new Error(`Button not found: ${text}`);
}

async function run() {
  await createIdentity(userEmail, "USER");
  await createIdentity(adminEmail, "ADMIN");
  log("Created isolated browser users");

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--use-fake-ui-for-media-stream",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
  await page.setGeolocation({ longitude: 106.8277, latitude: -6.1759 });
  await browser.defaultBrowserContext().overridePermissions(frontendUrl, [
    "geolocation",
  ]);

  const criticalConsole = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (/TypeError|ReferenceError|Unhandled|Hydration/i.test(text)) {
        criticalConsole.push(text);
      }
    }
  });
  page.on("pageerror", (error) => criticalConsole.push(error.message));

  const mapResponses = [];
  page.on("response", async (response) => {
    if (!response.url().includes("/api/community/contributions/map")) {
      return;
    }

    const json = await response.json().catch(() => null);
    mapResponses.push({ status: response.status(), json });
  });

  try {
    await login(page, userEmail);
    log("User login through real UI");

    await page.goto(`${frontendUrl}/community/contributions`, {
      waitUntil: "networkidle2",
    });
    await assertText(page, "Laporkan Kondisi Akses");
    await page.type("textarea", observedDetails, { delay: 5 });
    await clickButtonByText(page, "Gunakan lokasi saya");
    await assertText(page, "Lokasi perangkat dipilih.");
    await clickButtonByText(page, "Kirim laporan");
    await assertText(page, "Laporan berhasil dikirim.", 30_000);
    log("User submitted contribution through browser form");

    const { data: submitted, error: lookupError } = await service
      .from("community_contributions")
      .select("id,status,author_id")
      .eq("report_data->>details", observedDetails)
      .single();
    if (lookupError) throw lookupError;
    createdContributionIds.push(submitted.id);
    if (submitted.status !== "PENDING") {
      throw new Error(`Expected submitted contribution PENDING, got ${submitted.status}`);
    }
    log("Browser submission landed as PENDING");

    await login(page, adminEmail);
    await page.goto(`${frontendUrl}/admin/community/contributions`, {
      waitUntil: "networkidle2",
    });
    await assertText(page, "Moderasi Kontribusi Akses");
    await assertText(page, "Trotoar terhalang", 30_000);
    log("Admin moderation queue rendered pending browser submission");

    const { data: adminSession, error: adminSignInError } =
      await service.auth.signInWithPassword({
        email: adminEmail,
        password,
      });
    if (adminSignInError) throw adminSignInError;

    const confirmResponse = await fetch(
      `${apiUrl}/api/admin/community/contributions/${submitted.id}/confirm`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminSession.session.access_token}`,
        },
      },
    );
    if (!confirmResponse.ok) {
      const body = await confirmResponse.text().catch(() => "");
      throw new Error(
        `Admin confirm API returned ${confirmResponse.status}: ${body.slice(0, 300)}`,
      );
    }
    const confirmJson = await confirmResponse.json().catch(() => null);
    if (!confirmJson?.success || confirmJson.data?.status !== "APPROVED") {
      throw new Error(
        `Admin confirm API did not return APPROVED: ${JSON.stringify(confirmJson).slice(0, 500)}`,
      );
    }

    log("Admin confirm API approved browser submission");

    await login(page, userEmail);
    await page.goto(`${frontendUrl}/community/contributions`, {
      waitUntil: "networkidle2",
    });
    await assertText(page, "Laporkan Kondisi Akses", 30_000);
    await clickButtonByText(page, "Riwayat");
    await assertText(page, "Kontribusi Anda", 30_000);
    await assertText(page, "Diterima", 30_000);
    await assertText(page, "Kontribusi diterima", 30_000);
    await page.waitForFunction(() => {
      return document.body.innerText.includes("kontribusi diterima ditampilkan.");
    }, { timeout: 45_000 });
    log("User history and approved map projection rendered in browser");

    const successfulMap = mapResponses.find(
      (entry) => entry.status === 200 && entry.json?.success === true,
    );
    if (!successfulMap) {
      throw new Error("No successful browser map API response captured.");
    }

    const forbidden = [
      "author_id",
      "email",
      "phone",
      "account_role",
      "reviewed_by",
      "report_data",
      "points_awarded",
      "trust_score",
    ].filter((key) => JSON.stringify(successfulMap.json).includes(key));
    if (forbidden.length > 0) {
      throw new Error(`Browser map response leaked forbidden keys: ${forbidden.join(", ")}`);
    }
    log("Browser map API response privacy shape verified");

    if (criticalConsole.length > 0) {
      throw new Error(`Critical browser console errors: ${criticalConsole.join(" | ")}`);
    }
    log("No critical browser console/runtime errors");
  } finally {
    await browser.close();
  }
}

run()
  .then(async () => {
    await cleanup();
    console.log(`[DONE] ${runId}`);
  })
  .catch(async (error) => {
    await cleanup();
    console.error(`[FAIL] ${runId}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  });
