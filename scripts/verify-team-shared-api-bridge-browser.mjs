import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { approvedAccountFixture } from "../frontend/tests/routing/browser-user-fixture.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.GETRA_PLAYWRIGHT_MODULE ||
    "D:/Antigravity IDE/resources/app/node_modules/playwright",
);

const origin = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3300";
const expectedProxyTarget = process.env.GETRA_EXPECTED_PROXY_TARGET;
const output = resolve("outputs/team-shared-api-bridge");
mkdirSync(output, { recursive: true });

const evidence = {
  origin,
  expectedProxyTarget,
  status: "FAIL",
  checks: {},
  apiDestinations: [],
  routeResponses: [],
  browserErrors: [],
  warnings: [],
  screenshots: [],
};

function observe(page, scope) {
  page.on("pageerror", (error) => evidence.browserErrors.push(`${scope}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") evidence.browserErrors.push(`${scope}: ${message.text()}`);
    if (message.type() === "warning") evidence.warnings.push(`${scope}: ${message.text()}`);
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!url.pathname.startsWith("/api/")) return;
    evidence.apiDestinations.push({
      scope,
      method: request.method(),
      origin: url.origin,
      pathname: url.pathname,
    });
  });
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (url.pathname !== "/api/routing" || response.request().method() !== "POST") return;
    let body;
    try {
      body = await response.json();
    } catch {
      return;
    }
    const route = body?.data;
    evidence.routeResponses.push({
      scope,
      http: response.status(),
      mode: route?.mode,
      routeStatus: route?.route_status,
      distanceMeters: route?.distance_meters,
      durationSeconds: route?.duration_seconds,
      geometryType: route?.geometry?.type,
      geometryPoints: route?.geometry?.coordinates?.length ?? 0,
    });
  });
}

async function login(page, role = "USER") {
  const account = approvedAccountFixture(role);
  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app", { timeout: 60_000 });
}

async function setCoordinate(planner, label, point) {
  const summary = planner.locator("summary").filter({ hasText: `Koordinat ${label.toLowerCase()}` });
  if (!(await summary.evaluate((element) => element.parentElement.open))) await summary.click();
  await planner.getByLabel(`Latitude ${label}`, { exact: true }).fill(String(point.latitude));
  await planner.getByLabel(`Longitude ${label}`, { exact: true }).fill(String(point.longitude));
  await planner.getByRole("button", { name: `Terapkan koordinat ${label.toLowerCase()}` }).click();
}

async function waitForRoutable(page, mode) {
  await page.waitForFunction(
    () => document.querySelector("[data-routing-state]")?.dataset.routingState === "ROUTABLE",
    null,
    { timeout: 90_000 },
  );
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="routing-result"]').length === 1,
    null,
    { timeout: 15_000 },
  );
  const response = evidence.routeResponses.findLast(
    (item) => item.scope === "user" && item.mode === mode && item.routeStatus === "ROUTABLE",
  );
  assert(response, `ROUTING_RESPONSE_MISSING_${mode}`);
  assert.equal(response.http, 200);
  assert(response.distanceMeters > 0 && response.durationSeconds > 0);
  assert.equal(response.geometryType, "LineString");
  assert(response.geometryPoints > 1);
}

async function readAccessToken(page) {
  return page.evaluate(() => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.endsWith("-auth-token")) continue;

      try {
        const session = JSON.parse(window.localStorage.getItem(key) ?? "null");
        if (typeof session?.access_token === "string" && session.access_token) {
          return session.access_token;
        }
      } catch {
        // Ignore unrelated or malformed local-storage entries.
      }
    }

    return null;
  });
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  assert(expectedProxyTarget, "GETRA_EXPECTED_PROXY_TARGET_REQUIRED");
  assert.notEqual(new URL(expectedProxyTarget).hostname, "localhost");
  assert.notEqual(new URL(expectedProxyTarget).hostname, "127.0.0.1");

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["geolocation"],
    geolocation: { latitude: -6.2088, longitude: 106.8456, accuracy: 15 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  observe(page, "user");
  await login(page);
  await page.locator(".maplibregl-canvas").waitFor({ timeout: 60_000 });
  evidence.checks.login = "PASS";
  evidence.checks.app = "PASS";
  evidence.checks.map = "PASS";

  const searchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/merchants/canonical" &&
      url.searchParams.get("q") === "bakso" &&
      response.request().method() === "GET";
  });
  await page.locator("#global-search-query").fill("bakso");
  await page.locator('.commuter-search__form button[type="submit"]').click();
  const resolvedSearchResponse = await searchResponse;
  if (resolvedSearchResponse.status() !== 200) {
    let failure = { code: "UNREADABLE", message: "" };
    try {
      const body = await resolvedSearchResponse.json();
      failure = {
        code: body?.error?.code ?? "UNKNOWN",
        message: body?.error?.message ?? "",
      };
    } catch {}
    evidence.checks.search =
      `FAIL_HTTP_${resolvedSearchResponse.status()}_${failure.code}: ${failure.message}`;
  } else {
    await page.locator(".result-row, .commuter-merchant").first().waitFor({ timeout: 60_000 });
    evidence.checks.search = "PASS";
  }

  await page.getByRole("button", { name: /Tanya GETRA/ }).first().click();
  await page.getByLabel("Pertanyaan untuk Tanya GETRA").fill("Cari bakso di Jakarta Pusat");
  const aiResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/ai/ask" && response.request().method() === "POST";
  });
  await page.getByRole("button", { name: "Kirim pertanyaan" }).click();
  const aiResponse = await aiResponsePromise;
  evidence.checks.ai = aiResponse.status() === 200 ? "PASS" : `FAIL_HTTP_${aiResponse.status()}`;
  await page.getByRole("button", { name: "Tutup Tanya GETRA" }).click();

  await page.getByRole("button", { name: "Rute", exact: true }).first().click();
  const planner = page.getByRole("region", { name: "Perencana rute" });
  await setCoordinate(planner, "Asal", { latitude: -6.21412, longitude: 106.68299 });
  const firstRoute = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/routing" && response.request().method() === "POST";
  });
  await setCoordinate(planner, "Tujuan", { latitude: -6.218, longitude: 106.687 });
  assert.equal((await firstRoute).status(), 200);
  await waitForRoutable(page, "walking");
  evidence.checks.walking = "PASS";

  for (const [label, mode] of [["Motor", "motorcycle"], ["Mobil", "car"]]) {
    const routeResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      let body;
      try { body = response.request().postDataJSON(); } catch { return false; }
      return url.pathname === "/api/routing" && body?.mode === mode;
    });
    await page.locator('[data-testid="routing-result"]').getByRole("button", { name: new RegExp(`^${label}`) }).click();
    assert.equal((await routeResponse).status(), 200);
    await waitForRoutable(page, mode);
    evidence.checks[mode] = "PASS";
  }
  assert.equal(await page.locator('[data-testid="routing-result"]').count(), 1);
  evidence.checks.routingResultCount = 1;
  const mapRoute = await page.evaluate(() => {
    const map = window.__getraMapLibreInstance;
    const source = map?.getSource("walking-route");
    return { map: Boolean(map), source: Boolean(source) };
  });
  assert(mapRoute.map && mapRoute.source);
  evidence.checks.mapRoute = "PASS";
  await page.screenshot({ path: resolve(output, "shared-mode-route.png"), fullPage: true });
  evidence.screenshots.push("shared-mode-route.png");

  const accessToken = await readAccessToken(page);
  assert(accessToken, "AUTH_ACCESS_TOKEN_MISSING");
  const areaResult = await page.evaluate(async ({ token }) => {
    const merchantResponse = await fetch(
      "/api/merchants/canonical?q=MIRA%20KANTIN&scope=GLOBAL&limit=5&offset=0",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const merchantBody = await merchantResponse.json().catch(() => null);
    const merchant = merchantBody?.data?.merchants?.find(
      (candidate) => candidate.name === "MIRA KANTIN",
    ) ?? merchantBody?.data?.merchants?.[0];
    if (!merchant || !Number.isFinite(merchant.latitude) || !Number.isFinite(merchant.longitude)) {
      return { status: merchantResponse.status, fixtureLocationMissing: true };
    }

    const response = await fetch("/api/spatial/service-area", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin: { latitude: merchant.latitude, longitude: merchant.longitude },
        max_minutes: 10,
      }),
    });
    const body = await response.json().catch(() => null);
    return {
      status: response.status,
      serviceAreaStatus: body?.data?.status,
      geometryType: body?.data?.geometry?.type,
      edgeCount: body?.data?.reachable_edge_count,
    };
  }, { token: accessToken });
  assert.equal(areaResult.fixtureLocationMissing, undefined);
  assert.equal(areaResult.status, 200);
  assert.equal(areaResult.serviceAreaStatus, "READY");
  assert.equal(areaResult.geometryType, "MultiLineString");
  assert(areaResult.edgeCount > 0);
  evidence.checks.serviceArea = "PASS";
  evidence.checks.serviceAreaGeometry = areaResult.geometryType;

  for (const path of ["/umkm", "/umkm/advertising"]) {
    const response = await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
    assert.equal(response?.status(), 200);
    await page.locator("main").waitFor();
  }
  evidence.checks.umkm = "PASS";
  evidence.checks.promotion = "PASS";
  await context.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  observe(adminPage, "admin");
  await login(adminPage, "ADMIN");
  const adminResponse = await adminPage.goto(`${origin}/admin/umkm`, { waitUntil: "domcontentloaded" });
  assert.equal(adminResponse?.status(), 200);
  await adminPage.locator("main").waitFor();
  assert.equal(await adminPage.getByText(/Gagal memuat|Terjadi kesalahan/i).count(), 0);
  evidence.checks.admin = "PASS";
  await adminContext.close();

  const apiOrigins = [...new Set(evidence.apiDestinations.map((item) => item.origin))];
  assert.deepEqual(apiOrigins, [origin]);
  assert.equal(
    evidence.apiDestinations.some((item) => /localhost:8080|127\.0\.0\.1:8080/.test(item.origin)),
    false,
  );
  evidence.checks.browserApiOrigins = apiOrigins;
  evidence.checks.localhost8080Fallback = "NONE";

  assert.equal(evidence.checks.search, "PASS", evidence.checks.search);
  assert.equal(evidence.checks.ai, "PASS", evidence.checks.ai);

  const fatalErrors = evidence.browserErrors.filter((message) =>
    /TypeError|Cannot read properties|React|routing/i.test(message),
  );
  assert.deepEqual(fatalErrors, [], `FATAL_BROWSER_ERRORS: ${fatalErrors.join(" | ")}`);
  evidence.checks.fatalBrowserError = "NONE";
  evidence.status = "PASS";
} catch (error) {
  evidence.error = error instanceof Error ? error.stack || error.message : String(error);
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  await browser.close();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}
