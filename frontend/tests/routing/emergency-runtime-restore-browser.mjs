import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { approvedAccountFixture } from "./browser-user-fixture.mjs";

const require = createRequire(import.meta.url);
const playwrightPath = process.env.GETRA_PLAYWRIGHT_MODULE || "D:/Antigravity IDE/resources/app/node_modules/playwright";
const { chromium } = require(playwrightPath);
const origin = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3000";
const output = resolve("outputs/emergency-runtime-restore");
mkdirSync(output, { recursive: true });

const evidence = {
  origin,
  checks: {},
  routeResponses: [],
  browserErrors: [],
  warnings: [],
  screenshots: [],
};

function collectBrowserMessages(page, scope) {
  page.on("pageerror", (error) => evidence.browserErrors.push(`${scope}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") evidence.browserErrors.push(`${scope}: ${message.text()}`);
    if (message.type() === "warning") evidence.warnings.push(`${scope}: ${message.text()}`);
  });
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (url.pathname !== "/api/routing" || response.request().method() !== "POST") return;
    let body = null;
    try { body = await response.json(); } catch {}
    evidence.routeResponses.push({
      scope,
      status: response.status(),
      mode: response.request().postDataJSON()?.mode,
      routeStatus: body?.data?.route_status,
      distanceMeters: body?.data?.distance_meters,
      durationSeconds: body?.data?.duration_seconds,
      geometryType: body?.data?.geometry?.type,
      geometryPoints: body?.data?.geometry?.coordinates?.length ?? 0,
    });
  });
}

async function login(page, account) {
  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app", { timeout: 60_000 });
  await page.locator(".maplibregl-canvas").waitFor({ timeout: 60_000 });
}

async function setCoordinate(planner, label, point) {
  const summary = planner.locator("summary").filter({ hasText: `Koordinat ${label.toLowerCase()}` });
  if (!(await summary.evaluate((element) => element.parentElement.open))) await summary.click();
  await planner.getByLabel(`Latitude ${label}`, { exact: true }).fill(String(point.latitude));
  await planner.getByLabel(`Longitude ${label}`, { exact: true }).fill(String(point.longitude));
  await planner.getByRole("button", { name: `Terapkan koordinat ${label.toLowerCase()}` }).click();
}

async function assertMapRoute(page) {
  await page.waitForFunction(() => {
    const map = window.__getraMapLibreInstance;
    return Boolean(map?.getSource("walking-route") && map?.getLayer("walking-route-line"));
  }, null, { timeout: 20_000 });
  const mapState = await page.evaluate(() => {
    const map = window.__getraMapLibreInstance;
    return {
      map: Boolean(map),
      source: Boolean(map?.getSource("walking-route")),
      lineLayer: Boolean(map?.getLayer("walking-route-line")),
      casingLayer: Boolean(map?.getLayer("walking-route-casing")),
    };
  });
  assert(mapState.map, "MAP_INSTANCE_MISSING");
  assert(mapState.source, "ROUTE_SOURCE_MISSING");
  assert(mapState.lineLayer, "ROUTE_LINE_LAYER_MISSING");
  return mapState;
}

async function createContext(browser, viewport, mobile = false) {
  return browser.newContext({
    viewport,
    isMobile: mobile,
    hasTouch: mobile,
    permissions: ["geolocation"],
    geolocation: { latitude: -6.2088, longitude: 106.8456, accuracy: 15 },
  });
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const account = approvedAccountFixture("USER");
  const desktopContext = await createContext(browser, { width: 1440, height: 1000 });
  const desktop = await desktopContext.newPage();
  desktop.setDefaultTimeout(60_000);
  collectBrowserMessages(desktop, "desktop");
  await login(desktop, account);
  evidence.checks.appLoad = "PASS";
  evidence.checks.mapLoad = "PASS";
  await desktop.screenshot({ path: resolve(output, "01-healthy-app-map.png") });
  evidence.screenshots.push("01-healthy-app-map.png");

  const search = desktop.locator(".global-search");
  await search.getByLabel("Pencarian global", { exact: true }).fill("bakso");
  await search.getByRole("button", { name: "Cari", exact: true }).click();
  const firstMerchant = desktop.locator(".result-row").first();
  await firstMerchant.waitFor();
  assert.equal(await search.getByText("Jakarta Barat", { exact: true }).count(), 1);
  assert.equal(await search.getByText("Jakarta Pusat", { exact: true }).count(), 1);
  evidence.checks.regionDuplicates = "NONE";
  await firstMerchant.click();
  await desktop.getByRole("heading", { name: "Sumber data", exact: true }).waitFor();
  evidence.checks.merchantDetail = "PASS";
  evidence.checks.merchantSourceUndefinedSafe = "PASS";
  await desktop.screenshot({ path: resolve(output, "02-merchant-detail-route-cta.png") });
  evidence.screenshots.push("02-merchant-detail-route-cta.png");

  await desktop.getByTestId("merchant-route-cta").click();
  await desktop.waitForFunction(() => document.querySelector("[data-routing-state]")?.dataset.routingState === "ROUTABLE", null, { timeout: 90_000 });
  await desktop.waitForFunction(() => document.querySelectorAll('[data-testid="routing-result"]').length === 1, null, { timeout: 15_000 });
  assert.equal(await desktop.locator('[data-testid="routing-result"]').count(), 1);
  evidence.checks.desktopRoutingResultCount = 1;
  evidence.checks.oneTapRoute = "PASS";
  evidence.checks.desktopMapRoute = await assertMapRoute(desktop);
  const desktopRoute = evidence.routeResponses.findLast((item) => item.scope === "desktop");
  assert.equal(desktopRoute?.status, 200);
  assert.equal(desktopRoute?.routeStatus, "ROUTABLE");
  assert(desktopRoute.distanceMeters > 0 && desktopRoute.durationSeconds > 0);
  assert.equal(desktopRoute.geometryType, "LineString");
  await desktop.screenshot({ path: resolve(output, "03-successful-route-preview.png") });
  evidence.screenshots.push("03-successful-route-preview.png");

  const routeResult = desktop.locator('[data-testid="routing-result"]');
  for (const mode of ["Motor", "Mobil", "Jalan kaki"]) {
    const expected = mode === "Jalan kaki" ? "walking" : mode === "Motor" ? "motorcycle" : "car";
    const responsePromise = desktop.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/routing" &&
        response.request().method() === "POST" &&
        response.request().postDataJSON()?.mode === expected;
    });
    await routeResult.getByRole("button", { name: new RegExp(`^${mode}`) }).click();
    const response = await responsePromise;
    assert.equal(response.status(), 200);
    const body = await response.json();
    assert.equal(body?.data?.route_status, "ROUTABLE");
    assert(body.data.distance_meters > 0 && body.data.duration_seconds > 0);
  }
  await desktop.screenshot({ path: resolve(output, "04-route-linestring-map.png") });
  evidence.screenshots.push("04-route-linestring-map.png");

  await desktop.goto(`${origin}/umkm`, { waitUntil: "domcontentloaded" });
  await desktop.locator("main").waitFor();
  evidence.checks.umkm = "PASS";
  await desktop.screenshot({ path: resolve(output, "05-latest-umkm-ui.png"), fullPage: true });
  evidence.screenshots.push("05-latest-umkm-ui.png");

  const promotionResponse = await desktop.goto(`${origin}/umkm/advertising`, { waitUntil: "domcontentloaded" });
  assert.equal(promotionResponse?.status(), 200);
  await desktop.locator("main").waitFor();
  evidence.checks.promotion = "PASS";
  await desktopContext.close();

  const mobileContext = await createContext(browser, { width: 390, height: 844 }, true);
  const mobile = await mobileContext.newPage();
  mobile.setDefaultTimeout(60_000);
  collectBrowserMessages(mobile, "mobile");
  await login(mobile, account);
  const planner = mobile.getByRole("region", { name: "Perencana rute" });
  await setCoordinate(planner, "Asal", { latitude: -6.2414, longitude: 106.6281 });
  await setCoordinate(planner, "Tujuan", { latitude: -6.1754, longitude: 106.8272 });
  await mobile.waitForFunction(() => document.querySelector("[data-routing-state]")?.dataset.routingState === "ROUTABLE", null, { timeout: 90_000 });
  await mobile.waitForFunction(() => document.querySelectorAll('[data-testid="routing-result"]').length === 1, null, { timeout: 15_000 });
  assert.equal(await mobile.locator('[data-testid="routing-result"]').count(), 1);
  evidence.checks.mobileRoutingResultCount = 1;
  evidence.checks.mobileMapRoute = await assertMapRoute(mobile);
  await mobile.screenshot({ path: resolve(output, "06-mobile-single-route-result.png"), fullPage: true });
  evidence.screenshots.push("06-mobile-single-route-result.png");
  await mobileContext.close();

  const adminContext = await createContext(browser, { width: 1440, height: 1000 });
  const admin = await adminContext.newPage();
  admin.setDefaultTimeout(60_000);
  collectBrowserMessages(admin, "admin");
  await admin.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
  const adminAccount = approvedAccountFixture("ADMIN");
  await admin.getByLabel("Email", { exact: true }).fill(adminAccount.email);
  await admin.getByLabel("Kata sandi", { exact: true }).fill(adminAccount.password);
  await admin.getByRole("button", { name: "Masuk", exact: true }).click();
  await admin.waitForURL("**/app", { timeout: 60_000 });
  const adminResponse = await admin.goto(`${origin}/admin/umkm`, { waitUntil: "domcontentloaded" });
  assert.equal(adminResponse?.status(), 200);
  await admin.locator("main").waitFor();
  assert.equal(await admin.getByText(/Gagal memuat|Terjadi kesalahan/i).count(), 0);
  evidence.checks.adminUmkm = "PASS";
  await admin.screenshot({ path: resolve(output, "07-admin-umkm.png"), fullPage: true });
  evidence.screenshots.push("07-admin-umkm.png");
  await adminContext.close();

  const fatalErrors = evidence.browserErrors.filter((message) =>
    /TypeError|Cannot read properties|React|routing/i.test(message),
  );
  assert.deepEqual(fatalErrors, [], `FATAL_BROWSER_ERRORS: ${fatalErrors.join(" | ")}`);
  evidence.checks.fatalReactError = "NONE";
  evidence.checks.merchantSourceTypeError = "NONE";
  evidence.status = "PASS";
} catch (error) {
  evidence.status = "FAIL";
  evidence.error = error instanceof Error ? error.stack || error.message : String(error);
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  await browser.close();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}
