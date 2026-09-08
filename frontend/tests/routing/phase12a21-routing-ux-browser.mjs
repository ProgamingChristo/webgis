// Phase 12A.2.1 Maps-Like Routing UX Finalization Browser QA & Screenshot Suite
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

const origin = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3050";
const output = resolve("outputs/phase12a21");
mkdirSync(output, { recursive: true });

const evidence = {
  started: new Date().toISOString(),
  localOwnerUrl: origin,
  checks: {},
  routes: {},
  screenshots: [],
};

const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    geolocation: { latitude: -6.2414, longitude: 106.6281 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);

  // Monitor API responses
  const routingResponses = [];
  page.on("response", async (res) => {
    const url = new URL(res.url());
    if (url.pathname.includes("/api/routing") && res.request().method() === "POST") {
      try {
        const body = await res.json();
        routingResponses.push({
          status: res.status(),
          mode: body?.data?.mode,
          routeStatus: body?.data?.route_status,
          candidates: body?.data?.route_candidates ?? [],
          raw: body?.data,
        });
      } catch {}
    }
  });

  // Step 1: Login
  console.log("[QA] 1. Logging in...");
  const user = approvedAccountFixture("USER");
  await page.goto(`${origin}/login`);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app");
  evidence.checks.login = "PASS";
  console.log("[QA] Login successful.");

  // Helper to set coordinate
  async function setCoordinate(planner, label, point) {
    const summary = planner.locator("summary").filter({ hasText: `Koordinat ${label.toLowerCase()}` });
    if (!(await summary.evaluate((el) => el.parentElement.open))) await summary.click();
    await planner.getByLabel(`Latitude ${label}`, { exact: true }).fill(String(point.latitude));
    await planner.getByLabel(`Longitude ${label}`, { exact: true }).fill(String(point.longitude));
    await planner.getByRole("button", { name: `Terapkan koordinat ${label.toLowerCase()}` }).click();
  }

  // Step 2: Route Planning - select A and B (route with multiple alternatives)
  console.log("[QA] 2. Setting up origin & destination...");
  const planner = page.getByRole("region", { name: "Perencana rute" });
  await setCoordinate(planner, "Asal", { latitude: -6.2414, longitude: 106.6281 });
  await setCoordinate(planner, "Tujuan", { latitude: -6.1754, longitude: 106.8272 });

  // Choose Motorcycle / Motor mode (known to produce 3 candidate routes)
  console.log("[QA] 3. Selecting motorcycle mode...");
  await planner.getByRole("button", { name: "Motor", exact: true }).click();

  // Wait for route computation
  await page.waitForFunction(() => {
    const state = document.querySelector("[data-routing-state]")?.dataset.routingState;
    return state === "ROUTABLE";
  });

  const latestRoute = routingResponses.findLast((r) => r.routeStatus === "ROUTABLE");
  assert(latestRoute, "ROUTING_RESPONSE_REQUIRED");
  const candidates = latestRoute.candidates;
  console.log(`[QA] Candidate count: ${candidates.length}`);
  assert(candidates.length >= 2, "AT_LEAST_2_CANDIDATES_REQUIRED");
  evidence.checks.multipleCandidates = "PASS";
  evidence.routes.candidateCount = candidates.length;

  // Verify route candidate cards appear directly in the left panel
  const candidateList = page.locator("[role='group'][aria-label='Daftar opsi rute']");
  await candidateList.waitFor();
  const cards = candidateList.locator("button[aria-pressed]");
  const cardCount = await cards.count();
  console.log(`[QA] UI candidate card count: ${cardCount}`);
  assert(cardCount >= 2, "UI_CANDIDATE_CARDS_REQUIRED");
  evidence.checks.routeCards = "PASS";

  // Verify fastest card badge and candidate texts
  const cardTexts = await Promise.all((await cards.all()).map((c) => c.innerText()));
  console.log("[QA] Card texts:", cardTexts);
  const hasFastestCard = cardTexts.some((t) => t.toLowerCase().includes("rute tercepat") || t.toLowerCase().includes("tercepat"));
  assert(hasFastestCard, "FASTEST_CARD_BADGE_REQUIRED");
  evidence.checks.fastestCard = "PASS";

  const hasAlternativeCard = cardTexts.some((t) => t.toLowerCase().includes("alternatif") || t.toLowerCase().includes("umkm"));
  assert(hasAlternativeCard, "ALTERNATIVE_CARD_REQUIRED");
  evidence.checks.alternativeCard = "PASS";

  // Verify route labels on map
  const mapLabels = page.locator(".route-map-label");
  await mapLabels.first().waitFor();
  const labelCount = await mapLabels.count();
  console.log(`[QA] Map route label count: ${labelCount}`);
  assert(labelCount >= 2, "MAP_ROUTE_LABELS_REQUIRED");
  evidence.checks.mapRouteLabels = "PASS";

  // Capture Screenshot 1: Desktop route planner with >=2 real alternatives
  await page.screenshot({ path: resolve(output, "01_desktop_route_planner_multi.png") });
  evidence.screenshots.push("01_desktop_route_planner_multi.png");

  // Capture Screenshot 2: Close-up of route cards
  await candidateList.screenshot({ path: resolve(output, "02_route_cards_detail.png") });
  evidence.screenshots.push("02_route_cards_detail.png");

  // Capture Screenshot 3: Route labels on map
  const mapPanel = page.locator(".map-panel");
  await mapPanel.screenshot({ path: resolve(output, "03_map_route_labels.png") });
  evidence.screenshots.push("03_map_route_labels.png");

  // Step 3: Select Alternative Card
  console.log("[QA] 4. Selecting alternative route card...");
  const altCard = cards.nth(1);
  await altCard.click();
  await page.waitForFunction(() => {
    const pressed = document.querySelectorAll("[role='group'][aria-label='Daftar opsi rute'] button[aria-pressed='true']");
    return pressed.length === 1;
  });
  assert.equal(await altCard.getAttribute("aria-pressed"), "true");
  evidence.checks.alternativeSelection = "PASS";

  // Capture Screenshot 4: Alternative route selected
  await page.screenshot({ path: resolve(output, "04_alternative_selected.png") });
  evidence.screenshots.push("04_alternative_selected.png");

  // Verify Start Journey CTA is prominent and visible
  const startBtn = page.getByRole("button", { name: "Mulai Perjalanan", exact: true });
  await startBtn.waitFor();
  assert(await startBtn.isVisible());
  evidence.checks.startJourneyCTA = "PASS";

  // Capture Screenshot 5: Start Journey CTA
  await page.screenshot({ path: resolve(output, "05_start_journey_cta.png") });
  evidence.screenshots.push("05_start_journey_cta.png");

  // Verify Directions Collapsed by default
  const directionsDetails = page.locator("details").filter({ hasText: /petunjuk/i });
  await directionsDetails.waitFor();
  const isOpenByDefault = await directionsDetails.evaluate((el) => el.open);
  assert.equal(isOpenByDefault, false, "DIRECTIONS_MUST_BE_COLLAPSED_BY_DEFAULT");
  evidence.checks.directionsDefaultCollapsed = "PASS";

  // Capture Screenshot 6: Directions collapsed
  await directionsDetails.screenshot({ path: resolve(output, "06_directions_collapsed.png") });
  evidence.screenshots.push("06_directions_collapsed.png");

  // Expand directions
  console.log("[QA] 5. Expanding directions...");
  const directionsSummary = directionsDetails.locator("summary");
  await directionsSummary.click();
  const isOpenAfterClick = await directionsDetails.evaluate((el) => el.open);
  assert.equal(isOpenAfterClick, true, "DIRECTIONS_EXPANDED");
  evidence.checks.directionsExpand = "PASS";

  // Capture Screenshot 7: Directions expanded
  await directionsDetails.screenshot({ path: resolve(output, "07_directions_expanded.png") });
  evidence.screenshots.push("07_directions_expanded.png");

  // Collapse back
  await directionsSummary.click();

  // Step 4: Click Mulai Perjalanan -> Active Navigation Mode
  console.log("[QA] 6. Starting journey (Mulai Perjalanan)...");
  await startBtn.click();

  // Wait for Active Journey transition
  const nextManeuver = page.locator("[class*='nextManeuver']");
  await nextManeuver.waitFor({ timeout: 15_000 });
  assert(await nextManeuver.isVisible(), "NEXT_MANEUVER_MUST_BE_VISIBLE");
  evidence.checks.activeNavigation = "PASS";

  const remainingMetrics = page.locator("[class*='journeyStatusPanel']");
  await remainingMetrics.waitFor();
  assert(await remainingMetrics.isVisible(), "REMAINING_METRICS_MUST_BE_VISIBLE");
  evidence.checks.remainingMetrics = "PASS";

  // Capture Screenshot 8: Active navigation top maneuver card
  await nextManeuver.screenshot({ path: resolve(output, "08_active_navigation_top_maneuver.png") });
  evidence.screenshots.push("08_active_navigation_top_maneuver.png");

  // Capture Screenshot 9: Active navigation remaining metrics bottom panel
  await remainingMetrics.screenshot({ path: resolve(output, "09_active_navigation_remaining_metrics.png") });
  evidence.screenshots.push("09_active_navigation_remaining_metrics.png");

  // Stop journey
  const stopBtn = page.getByRole("button", { name: /Akhiri|Stop/i });
  if (await stopBtn.isVisible()) {
    await stopBtn.click();
  }

  // Step 5: Mobile Viewport Bottom Sheet Test
  console.log("[QA] 7. Testing mobile viewport bottom sheet...");
  await context.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  mobilePage.setDefaultTimeout(45_000);

  await mobilePage.goto(`${origin}/login`);
  await mobilePage.getByLabel("Email", { exact: true }).fill(user.email);
  await mobilePage.getByLabel("Password", { exact: true }).fill(user.password);
  await mobilePage.getByRole("button", { name: "Masuk", exact: true }).click();
  await mobilePage.waitForURL("**/app");

  const mobilePlanner = mobilePage.getByRole("region", { name: "Perencana rute" });
  await setCoordinate(mobilePlanner, "Asal", { latitude: -6.2414, longitude: 106.6281 });
  await setCoordinate(mobilePlanner, "Tujuan", { latitude: -6.1754, longitude: 106.8272 });
  await mobilePlanner.getByRole("button", { name: "Motor", exact: true }).click();

  await mobilePage.waitForFunction(() => {
    const state = document.querySelector("[data-routing-state]")?.dataset.routingState;
    return state === "ROUTABLE";
  });

  // Check mobile bottom sheet
  const openBtn = mobilePage.locator("button[aria-controls='route-choice-sheet']");
  if (await openBtn.isVisible()) {
    await openBtn.click();
  }
  const mobileSheet = mobilePage.locator("#route-choice-sheet");
  await mobileSheet.waitFor();
  assert(await mobileSheet.isVisible(), "MOBILE_BOTTOM_SHEET_VISIBLE");
  evidence.checks.mobileBottomSheet = "PASS";

  // Capture Screenshot 10: Mobile bottom-sheet route selection
  await mobilePage.screenshot({ path: resolve(output, "10_mobile_bottom_sheet.png") });
  evidence.screenshots.push("10_mobile_bottom_sheet.png");

  evidence.status = "PASS";
  console.log("[QA] All 10 checks and screenshots passed successfully!");
} catch (error) {
  console.error("[QA ERROR]", error);
  evidence.status = "FAIL";
  evidence.error = error instanceof Error ? error.stack || error.message : String(error);
  process.exitCode = 1;
} finally {
  evidence.finished = new Date().toISOString();
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log("[QA SUMMARY]", JSON.stringify(evidence, null, 2));
  await browser.close();
}
