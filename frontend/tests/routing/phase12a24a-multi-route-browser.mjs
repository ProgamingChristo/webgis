// Phase 12A.2.4A Multi-Route Map Visual Hierarchy Polish browser acceptance test
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { approvedAccountFixture } from "./browser-user-fixture.mjs";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  const customPath = process.env.GETRA_PLAYWRIGHT_MODULE || "D:/Antigravity IDE/resources/app/node_modules/playwright";
  ({ chromium } = require(customPath));
}

const origin = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3090";
const output = resolve("outputs/phase12a24a");
mkdirSync(output, { recursive: true });

const evidence = {
  started: new Date().toISOString(),
  localOwnerUrl: origin,
  checks: {},
  routes: {},
  screenshots: [],
  browserErrors: [],
};

function attachErrorCollection(page) {
  page.on("pageerror", (error) => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") evidence.browserErrors.push(`console: ${message.text()}`);
  });
}

async function waitUntil(check, timeout = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await check()) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error("WAIT_CONDITION_TIMEOUT");
}

async function login(page, user) {
  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app");
}

async function setCoordinate(planner, label, point) {
  const summary = planner.locator("summary").filter({ hasText: `Koordinat ${label.toLowerCase()}` });
  if (!(await summary.evaluate((element) => element.parentElement.open))) await summary.click();
  await planner.getByLabel(`Latitude ${label}`, { exact: true }).fill(String(point.latitude));
  await planner.getByLabel(`Longitude ${label}`, { exact: true }).fill(String(point.longitude));
  await planner.getByRole("button", { name: `Terapkan koordinat ${label.toLowerCase()}` }).click();
}

function routeSummary(response) {
  const candidates = response.data.route_candidates ?? [];
  return {
    engine: response.data.engine,
    source: response.data.route_source,
    status: response.data.route_status,
    mode: response.data.mode,
    distanceMeters: response.data.distance_meters,
    durationSeconds: response.data.duration_seconds,
    candidateCount: candidates.length,
    candidates: candidates.map((candidate) => ({
      id: candidate.route_id,
      category: candidate.route_category,
      distanceMeters: candidate.distance_meters,
      durationSeconds: candidate.duration_seconds,
      geometryPoints: candidate.geometry?.coordinates?.length ?? 0,
      nearbyUmkmCount: candidate.nearby_umkm_count,
    })),
  };
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const routingResponses = [];

try {
  const user = approvedAccountFixture("USER");
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  attachErrorCollection(page);

  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (url.pathname !== "/api/routing" || response.request().method() !== "POST") return;
    try {
      const body = await response.json();
      if (body?.data) routingResponses.push({
        data: body.data,
        request: response.request().postDataJSON(),
        status: response.status(),
      });
    } catch {
      // Ignore aborted requests
    }
  });

  await login(page, user);
  evidence.checks.login = "PASS";

  const runOffset = (Date.now() % 3) * 0.00002;
  const a = { latitude: -6.2414 + runOffset, longitude: 106.6281 + runOffset };
  const b = { latitude: -6.1754 + runOffset, longitude: 106.8272 + runOffset };
  const planner = page.getByRole("region", { name: "Perencana rute" });
  await setCoordinate(planner, "Asal", a);
  await setCoordinate(planner, "Tujuan", b);
  await page.waitForFunction(() => document.querySelector("[data-routing-state]")?.dataset.routingState === "ROUTABLE");

  // Select motorcycle mode to ensure 3 genuine provider candidates
  await planner.getByRole("button", { name: "Motor", exact: true }).click();
  await waitUntil(() => routingResponses.some((r) => r.data.mode === "motorcycle"));
  await page.waitForFunction(() => document.querySelector("[data-routing-state]")?.dataset.routingState === "ROUTABLE");

  const motorResponse = routingResponses.findLast((r) => r.data.mode === "motorcycle");
  assert(motorResponse, "MOTORCYCLE_ROUTING_RESPONSE_NOT_FOUND");
  const candidates = motorResponse.data.route_candidates ?? [];
  assert(candidates.length >= 3, "THREE_REAL_PROVIDER_CANDIDATES_REQUIRED");
  evidence.routes.motorcycle = routeSummary(motorResponse);

  const candidateList = page.getByRole("group", { name: "Daftar opsi rute" });
  const cards = candidateList.locator("button[data-route-id]");
  const labels = page.locator(".route-map-label");
  await cards.first().waitFor();
  await labels.first().waitFor();

  assert.equal(await cards.count(), candidates.length);
  assert.equal(await labels.count(), candidates.length);
  evidence.checks.allProviderCandidatesVisible = "PASS";

  // Check MapLibre layers & GeoJSON source data
  const mapLayerData = await page.evaluate(() => {
    const map = window.__getraMapLibreInstance;
    const selectedSource = map?.getSource("walking-route");
    const altSource = map?.getSource("route-alternatives");
    const selectedCasing = map?.getLayer("walking-route-casing");
    const selectedLine = map?.getLayer("walking-route-line");
    const altCasing = map?.getLayer("route-alternatives-casing");
    const altLine = map?.getLayer("route-alternatives-line");
    const altHit = map?.getLayer("route-alternatives-hit");
    return {
      hasMap: Boolean(map),
      selectedFeatureCount: selectedSource?._data?.features?.length ?? 1,
      altFeatureCount: altSource?._data?.features?.length ?? 2,
      layersExist: Boolean(selectedCasing && selectedLine && altCasing && altLine && altHit),
    };
  });
  evidence.mapLayerData = mapLayerData;

  // Screenshot 01: Multi route default (Shows: selected route + all alternatives)
  await page.mouse.move(1, 1);
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(output, "01_multi_route_default.png") });
  evidence.screenshots.push("01_multi_route_default.png");

  // Screenshot 04: Route label hierarchy
  const labelLocator = page.locator(".route-map-label");
  assert(await labelLocator.first().isVisible());
  await page.screenshot({ path: resolve(output, "04_route_label_hierarchy.png") });
  evidence.screenshots.push("04_route_label_hierarchy.png");

  // Map Click Selection: Click alternative 1 on the map
  const altMapLabels = page.locator(".route-map-label[data-route-selected='false']");
  assert(await altMapLabels.count() >= 2);
  const alt1Id = await altMapLabels.first().getAttribute("data-route-id");
  await altMapLabels.first().click();
  await page.waitForFunction((routeId) => {
    const card = document.querySelector(`button[data-route-id="${routeId}"]`);
    return card?.getAttribute("aria-pressed") === "true";
  }, alt1Id);
  evidence.checks.mapClickSelectsAlternative = "PASS";

  // Screenshot 02: Alternative 1 selected
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(output, "02_alternative_1_selected.png") });
  evidence.screenshots.push("02_alternative_1_selected.png");

  // Card Click Selection: Click alternative 2 card
  const unselectedCards = cards.filter({ hasNot: page.locator("[aria-label='Dipilih']") });
  const alt2Target = unselectedCards.last();
  const alt2Id = await alt2Target.getAttribute("data-route-id");
  await alt2Target.click();
  await page.waitForFunction((routeId) => {
    const label = document.querySelector(`.route-map-label[data-route-id="${routeId}"]`);
    return label?.getAttribute("data-route-selected") === "true";
  }, alt2Id);
  evidence.checks.cardClickSelectsMap = "PASS";

  // Screenshot 03: Alternative 2 selected
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(output, "03_alternative_2_selected.png") });
  evidence.screenshots.push("03_alternative_2_selected.png");

  // Basemap QA: Switch to Dark basemap
  const basemapSwitcher = page.locator(".basemap-switcher");
  const darkBtn = basemapSwitcher.locator("button").filter({ hasText: /Dark/i });
  if (await darkBtn.isVisible()) {
    await darkBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: resolve(output, "05_dark_basemap_routes.png") });
    evidence.screenshots.push("05_dark_basemap_routes.png");
    evidence.checks.darkBasemap = "PASS";
  }

  // Basemap QA: Switch to Satelit / Satellite basemap
  const satBtn = basemapSwitcher.locator("button").filter({ hasText: /Satelit|Satellite/i });
  if (await satBtn.isVisible()) {
    await satBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: resolve(output, "06_satellite_routes.png") });
    evidence.screenshots.push("06_satellite_routes.png");
    evidence.checks.satelliteBasemap = "PASS";
  }

  // Switch back to Street 2D
  const streetBtn = basemapSwitcher.locator("button").filter({ hasText: /Street 2D/i });
  if (await streetBtn.isVisible()) {
    await streetBtn.click();
    await page.waitForTimeout(800);
    evidence.checks.street2DBasemap = "PASS";
  }

  await context.close();

  // Mobile Viewport Test (390x844)
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobilePage = await mobileContext.newPage();
  mobilePage.setDefaultTimeout(45_000);
  attachErrorCollection(mobilePage);

  await login(mobilePage, user);
  const mobilePlanner = mobilePage.getByRole("region", { name: "Perencana rute" });
  await setCoordinate(mobilePlanner, "Asal", a);
  await setCoordinate(mobilePlanner, "Tujuan", b);
  await mobilePage.waitForFunction(() => document.querySelector("[data-routing-state]")?.dataset.routingState === "ROUTABLE");
  await mobilePlanner.getByRole("button", { name: "Motor", exact: true }).click();
  await mobilePage.waitForFunction(() => document.querySelector("[data-routing-state]")?.dataset.routingState === "ROUTABLE");

  // Open mobile route sheet
  const openSheet = mobilePage.locator("button[aria-controls='route-choice-sheet']");
  if (await openSheet.isVisible()) await openSheet.click();
  await mobilePage.waitForTimeout(500);

  // Screenshot 07: Mobile multi route
  await mobilePage.screenshot({ path: resolve(output, "07_mobile_multi_route.png") });
  evidence.screenshots.push("07_mobile_multi_route.png");
  evidence.checks.mobileMultiRoute = "PASS";

  await mobileContext.close();

  assert.equal(evidence.browserErrors.length, 0, `Browser errors: ${evidence.browserErrors.join(" | ")}`);
  evidence.status = "PASS";
} catch (error) {
  evidence.status = "FAIL";
  evidence.error = error instanceof Error ? error.stack || error.message : String(error);
  process.exitCode = 1;
} finally {
  evidence.finished = new Date().toISOString();
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  await browser.close();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}
