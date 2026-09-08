// Phase 12A.2.4 local-only browser acceptance. GPS is simulated only for machine QA.
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

const origin = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3080";
const output = resolve("outputs/phase12a24");
mkdirSync(output, { recursive: true });

const evidence = {
  started: new Date().toISOString(),
  localOwnerUrl: origin,
  simulatedGps: true,
  physicalGpsAcceptance: "PENDING",
  checks: {},
  routes: {},
  screenshots: [],
  browserErrors: [],
};

const installGps = () => {
  const watchers = new Map();
  let nextId = 1;
  const gps = {
    sample: null,
    errorCode: null,
    lastOptions: null,
    created: 0,
    cleared: 0,
    emit() {
      for (const { success, failure } of watchers.values()) {
        if (gps.errorCode !== null) failure?.({ code: gps.errorCode });
        else if (gps.sample) success({
          coords: {
            latitude: gps.sample.latitude,
            longitude: gps.sample.longitude,
            accuracy: gps.sample.accuracy,
          },
          timestamp: Date.now(),
        });
      }
    },
    set(point, accuracy) {
      gps.sample = { ...point, accuracy };
      gps.errorCode = null;
      gps.emit();
    },
    error(code) {
      gps.errorCode = code;
      gps.emit();
    },
    stats() {
      return { active: watchers.size, created: gps.created, cleared: gps.cleared, options: gps.lastOptions };
    },
  };
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      watchPosition(success, failure, options) {
        const id = nextId++;
        watchers.set(id, { success, failure });
        gps.created += 1;
        gps.lastOptions = options;
        setTimeout(() => gps.emit(), 0);
        return id;
      },
      clearWatch(id) {
        if (watchers.delete(id)) gps.cleared += 1;
      },
    },
  });
  window.__phase12a24Gps = gps;
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

async function setGps(page, point, accuracy) {
  await page.evaluate(({ nextPoint, nextAccuracy }) => {
    window.__phase12a24Gps.set(nextPoint, nextAccuracy);
  }, { nextPoint: point, nextAccuracy: accuracy });
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
  await context.addInitScript(installGps);
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
      // An aborted superseded request may have no readable body.
    }
  });

  await login(page, user);
  evidence.checks.login = "PASS";

  const runOffset = (Date.now() % 3) * 0.00002;
  const a = { latitude: -6.2414 + runOffset, longitude: 106.6281 + runOffset };
  const b = { latitude: -6.1754 + runOffset, longitude: 106.8272 + runOffset };
  const moved = { latitude: a.latitude + 0.001, longitude: a.longitude + 0.001 };
  const planner = page.getByRole("region", { name: "Perencana rute" });
  await setCoordinate(planner, "Asal", a);
  await setCoordinate(planner, "Tujuan", b);
  await page.waitForFunction(() => document.querySelector("[data-routing-state]")?.dataset.routingState === "ROUTABLE");
  await waitUntil(() => routingResponses.some((response) => response.data.mode === "walking"));

  async function selectMode(label, mode) {
    const previousCount = routingResponses.length;
    await planner.getByRole("button", { name: label, exact: true }).click();
    await waitUntil(() => routingResponses.length > previousCount && routingResponses.at(-1)?.data.mode === mode);
    await page.waitForFunction((expected) => {
      const pressed = document.querySelector(`[aria-label="Moda perjalanan"] button[aria-pressed="true"] span`);
      return pressed?.textContent === expected;
    }, label);
    const response = routingResponses.at(-1);
    assert.equal(response.status, 200);
    assert.equal(response.data.route_status, "ROUTABLE");
    assert(response.data.distance_meters > 0 && response.data.duration_seconds > 0);
    assert.equal(response.data.geometry?.type, "LineString");
    evidence.routes[mode] = routeSummary(response);
  }

  evidence.routes.walking = routeSummary(routingResponses.findLast((response) => response.data.mode === "walking"));
  await selectMode("Mobil", "car");
  await selectMode("Motor", "motorcycle");
  evidence.checks.threeModes = "PASS";

  const motorResponse = routingResponses.at(-1);
  const candidates = motorResponse.data.route_candidates ?? [];
  assert(candidates.length >= 3, "THREE_REAL_PROVIDER_CANDIDATES_REQUIRED_FOR_TEST_ROUTE");
  assert(candidates.every((candidate) => candidate.geometry?.type === "LineString" && candidate.geometry.coordinates.length >= 2));

  const candidateList = page.getByRole("group", { name: "Daftar opsi rute" });
  const cards = candidateList.locator("button[data-route-id]");
  const labels = page.locator(".route-map-label");
  await cards.first().waitFor();
  await labels.first().waitFor();
  assert.equal(await cards.count(), candidates.length);
  assert.equal(await labels.count(), candidates.length);
  assert.equal(Number(await page.locator("[data-route-candidate-count]").getAttribute("data-route-candidate-count")), candidates.length);
  evidence.checks.allProviderCandidatesVisible = "PASS";

  const selectedLabelCount = await page.locator(".route-map-label[data-route-selected='true']").count();
  assert.equal(selectedLabelCount, 1);
  await page.mouse.move(1, 1);
  await page.waitForTimeout(500);
  const styleHierarchy = await page.evaluate(() => {
    const selected = document.querySelector(".route-map-label[data-route-selected='true'] .route-map-label__surface");
    const alternatives = Array.from(
      document.querySelectorAll(".route-map-label[data-route-selected='false'] .route-map-label__surface"),
    );
    const alternative = alternatives.find((label) => !label.matches(":hover")) ?? alternatives[0];
    const selectedCard = document.querySelector("[aria-label='Daftar opsi rute'] button[aria-pressed='true']");
    const alternativeCard = document.querySelector("[aria-label='Daftar opsi rute'] button[aria-pressed='false']");
    if (!selected || !alternative || !selectedCard || !alternativeCard) return null;
    const matchingRules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSStyleRule && rule.selectorText?.includes("route-map-label--alternative")) {
            matchingRules.push(rule.cssText);
          }
        }
      } catch {
        // Cross-origin stylesheets are irrelevant to this same-origin application rule.
      }
    }
    return {
      selectedLabelClass: selected.className,
      alternativeLabelClass: alternative.className,
      selectedLabelOpacity: Number(getComputedStyle(selected).opacity),
      alternativeLabelOpacity: Number(getComputedStyle(alternative).opacity),
      alternativeLabelHovered: alternative.matches(":hover"),
      selectedLabelTransform: getComputedStyle(selected).transform,
      alternativeLabelTransform: getComputedStyle(alternative).transform,
      matchingRules,
      selectedCardOpacity: Number(getComputedStyle(selectedCard).opacity),
      alternativeCardOpacity: Number(getComputedStyle(alternativeCard).opacity),
      selectedBorderWidth: Number.parseFloat(getComputedStyle(selectedCard).borderLeftWidth),
      alternativeBorderWidth: Number.parseFloat(getComputedStyle(alternativeCard).borderLeftWidth),
    };
  });
  assert(styleHierarchy);
  evidence.routeStyle = styleHierarchy;
  assert(styleHierarchy.selectedLabelOpacity > styleHierarchy.alternativeLabelOpacity);
  assert(styleHierarchy.selectedCardOpacity > styleHierarchy.alternativeCardOpacity);
  assert(styleHierarchy.selectedBorderWidth > styleHierarchy.alternativeBorderWidth);
  evidence.checks.selectedRouteDominant = "PASS";

  await page.screenshot({ path: resolve(output, "01_desktop_three_routes.png") });
  evidence.screenshots.push("01_desktop_three_routes.png");
  await candidateList.screenshot({ path: resolve(output, "02_route_cards.png") });
  evidence.screenshots.push("02_route_cards.png");

  const mapAlternative = page.locator(".route-map-label[data-route-selected='false']").first();
  const mapSelectedRouteId = await mapAlternative.getAttribute("data-route-id");
  await mapAlternative.click();
  await page.waitForFunction((routeId) => document.querySelector(`button[data-route-id="${routeId}"]`)?.getAttribute("aria-pressed") === "true", mapSelectedRouteId);
  evidence.checks.mapLabelToCardSelection = "PASS";

  const cardTarget = cards.filter({ hasNot: page.locator("[aria-label='Dipilih']") }).last();
  const cardSelectedRouteId = await cardTarget.getAttribute("data-route-id");
  await cardTarget.click();
  await page.waitForFunction((routeId) => document.querySelector(`.route-map-label[data-route-id="${routeId}"]`)?.getAttribute("data-route-selected") === "true", cardSelectedRouteId);
  evidence.checks.cardToMapSelection = "PASS";
  await page.screenshot({ path: resolve(output, "03_alternative_selected.png") });
  evidence.screenshots.push("03_alternative_selected.png");

  const directions = page.locator("details").filter({ hasText: /Lihat petunjuk/i }).first();
  assert.equal(await directions.evaluate((element) => element.open), false);
  evidence.checks.directionsCollapsed = "PASS";

  await setGps(page, a, 120);
  const start = page.getByRole("button", { name: "Mulai Perjalanan", exact: true });
  assert(await start.isVisible());
  await start.click();
  const journey = page.getByRole("region", { name: "Navigasi aktif" });
  await journey.waitFor();
  await page.waitForFunction(() => document.querySelector("[data-gps-state]")?.getAttribute("data-gps-state") === "GPS_DEGRADED");
  assert((await journey.innerText()).includes("GPS lemah"));
  evidence.checks.gpsRequestingToDegraded = "PASS";
  await page.screenshot({ path: resolve(output, "04_gps_degraded_acquisition.png") });
  evidence.screenshots.push("04_gps_degraded_acquisition.png");

  const beforeGood = routingResponses.length;
  await setGps(page, a, 45);
  await waitUntil(() => routingResponses.length > beforeGood, 25_000);
  await page.waitForFunction(() => {
    const region = document.querySelector("[data-gps-state]");
    return region?.getAttribute("data-gps-state") === "GPS_GOOD" && region?.getAttribute("data-journey-state") === "ACTIVE";
  });
  const gpsStats = await page.evaluate(() => window.__phase12a24Gps.stats());
  assert.deepEqual(gpsStats.options, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  assert.equal(gpsStats.created, 1);
  evidence.checks.highAccuracyWatch = "PASS";
  evidence.checks.goodGpsStartsBackendRoute = "PASS";

  const statusPanel = page.locator("[data-navigation-metrics]");
  const nextManeuver = page.getByRole("region", { name: "Navigasi aktif" }).locator("section").first();
  assert(await nextManeuver.isVisible());
  assert(await statusPanel.isVisible());
  evidence.checks.activeNavigationComposition = "PASS";
  await page.screenshot({ path: resolve(output, "05_active_gps_good.png") });
  evidence.screenshots.push("05_active_gps_good.png");

  const metricText = await statusPanel.innerText();
  await setGps(page, moved, 80);
  await page.waitForTimeout(300);
  assert.equal(await journey.getAttribute("data-gps-state"), "GPS_GOOD");
  assert((await statusPanel.innerText()).includes(metricText.match(/\d+(?:[.,]\d+)?\s*(?:m|km)/i)?.[0] ?? ""));
  evidence.checks.singleBadFixNoReset = "PASS";

  await setGps(page, moved, 80);
  await page.waitForFunction(() => document.querySelector("[data-gps-state]")?.getAttribute("data-gps-state") === "GPS_DEGRADED");
  assert(await page.locator("[data-navigation-metrics][data-testid='routing-result']").isVisible());
  evidence.checks.sustainedBadFixDegraded = "PASS";
  evidence.checks.lastBackendRouteRetained = "PASS";
  await page.screenshot({ path: resolve(output, "06_active_temporary_degradation.png") });
  evidence.screenshots.push("06_active_temporary_degradation.png");

  const beforeRecovery = routingResponses.length;
  await setGps(page, moved, 20);
  await waitUntil(() => routingResponses.length > beforeRecovery, 25_000);
  await page.waitForFunction(() => {
    const region = document.querySelector("[data-gps-state]");
    return region?.getAttribute("data-gps-state") === "GPS_GOOD" && region?.getAttribute("data-journey-state") === "ACTIVE";
  });
  const recoveryRequest = routingResponses.at(-1).request;
  assert(Math.abs(recoveryRequest.origin.latitude - moved.latitude) < 0.000001);
  assert(Math.abs(recoveryRequest.origin.longitude - moved.longitude) < 0.000001);
  evidence.checks.automaticGpsRecovery = "PASS";
  evidence.checks.recoveryUsesAcceptedRealFix = "PASS";

  const mapCanvas = page.locator(".map-canvas");
  const mapBox = await mapCanvas.boundingBox();
  assert(mapBox);
  await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(mapBox.x + mapBox.width / 2 + 80, mapBox.y + mapBox.height / 2 + 30, { steps: 5 });
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector("[data-journey-following]")?.getAttribute("data-journey-following") === "false");
  await page.getByRole("button", { name: "Fokuskan Lokasi" }).click();
  await page.waitForFunction(() => document.querySelector("[data-journey-following]")?.getAttribute("data-journey-following") === "true");
  evidence.checks.cameraOverrideAndFocus = "PASS";

  const activeDirections = journey.locator("details").filter({ hasText: /Lihat petunjuk/i });
  assert(await activeDirections.isVisible());
  assert.equal(await activeDirections.evaluate((element) => element.open), false);
  evidence.checks.fullDirectionsSecondary = "PASS";

  await page.getByRole("button", { name: "Akhiri Perjalanan", exact: true }).click();
  await planner.waitFor();
  const stoppedGpsStats = await page.evaluate(() => window.__phase12a24Gps.stats());
  assert.equal(stoppedGpsStats.active, 0);
  evidence.checks.stopCleansWatch = "PASS";
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobileContext.addInitScript(installGps);
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
  const openSheet = mobilePage.locator("button[aria-controls='route-choice-sheet']");
  await openSheet.click();
  const mobileSheet = mobilePage.locator("#route-choice-sheet");
  await mobileSheet.waitFor();
  assert(await mobileSheet.getByRole("button", { name: "Mulai Perjalanan", exact: true }).isVisible());
  await mobilePage.screenshot({ path: resolve(output, "07_mobile_route_sheet.png") });
  evidence.screenshots.push("07_mobile_route_sheet.png");

  await setGps(mobilePage, a, 18);
  await mobileSheet.getByRole("button", { name: "Mulai Perjalanan", exact: true }).click();
  const mobileJourney = mobilePage.getByRole("region", { name: "Navigasi aktif" });
  await mobileJourney.waitFor();
  await mobilePage.waitForFunction(() => {
    const region = document.querySelector("[data-gps-state]");
    return region?.getAttribute("data-gps-state") === "GPS_GOOD" && region?.getAttribute("data-journey-state") === "ACTIVE";
  });
  const mobileLayout = await mobilePage.evaluate(() => {
    const top = document.querySelector("[aria-label='Petunjuk berikutnya']")?.getBoundingClientRect();
    const bottom = document.querySelector("[data-navigation-metrics]")?.getBoundingClientRect();
    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      panelsOverlap: Boolean(top && bottom && top.bottom > bottom.top),
      topVisible: Boolean(top && top.top >= 0 && top.bottom <= window.innerHeight),
      bottomVisible: Boolean(bottom && bottom.top >= 0 && bottom.bottom <= window.innerHeight),
    };
  });
  assert.equal(mobileLayout.horizontalOverflow, false);
  assert.equal(mobileLayout.panelsOverlap, false);
  assert.equal(mobileLayout.topVisible, true);
  assert.equal(mobileLayout.bottomVisible, true);
  for (const name of ["Fokuskan Lokasi", "Perbarui rute", "Akhiri Perjalanan"]) {
    assert(await mobilePage.getByRole("button", { name }).isVisible(), `${name} must remain visible on mobile`);
  }
  evidence.checks.mobileActiveNavigation = "PASS";
  evidence.mobileLayout = mobileLayout;
  await mobilePage.screenshot({ path: resolve(output, "08_mobile_active_navigation.png") });
  evidence.screenshots.push("08_mobile_active_navigation.png");
  await mobilePage.getByRole("button", { name: "Akhiri Perjalanan", exact: true }).click();
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
