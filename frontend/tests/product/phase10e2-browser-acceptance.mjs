// Opt-in visual QA. GPS is synthetic; all successful routes come from the real backend.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ordinaryUserFixture } from "../routing/browser-user-fixture.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GETRA_PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.GETRA_FRONTEND_ORIGIN || "https://getra-routing-api.tail0ed517.ts.net:8443";
const api = process.env.GETRA_BACKEND_ORIGIN || "https://getra-routing-api.tail0ed517.ts.net";
const localTransport = process.env.GETRA_LOCAL_FRONTEND_TRANSPORT;
const isLocalQa = ["localhost", "127.0.0.1"].includes(new URL(origin).hostname);
const output = resolve(localTransport ? "outputs/phase10e2-local" : "outputs/phase10e2");
mkdirSync(output, { recursive: true });
const evidence = { started: new Date().toISOString(), frontendTransport: isLocalQa ? "LOCAL_QA" : "PUBLIC_HTTPS",
  simulatedGPS: true, physicalTravel: false, routes: [], checks: {} };
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 },
  permissions: ["geolocation"], geolocation: { latitude: -6.2151, longitude: 106.6842, accuracy: 5 } });
await context.addInitScript(() => {
  let sequence = 0;
  const watchers = new Map();
  const emit = (callback) => callback({ coords: { latitude: -6.2151, longitude: 106.6842, accuracy: 5 }, timestamp: Date.now() });
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    watchPosition(callback) { const id = ++sequence; watchers.set(id, callback); setTimeout(() => emit(callback), 0); return id; },
    clearWatch(id) { watchers.delete(id); },
    getCurrentPosition(callback) { emit(callback); },
  } });
  setInterval(() => watchers.forEach(emit), 3000);
});
if (localTransport) {
  // Only frontend documents/assets use the local build. API requests remain normal browser HTTPS.
  await context.route(origin + "/**", async (route) => {
    const response = await route.fetch({ url: route.request().url().replace(origin, localTransport) });
    await route.fulfill({ response });
  });
}
const page = await context.newPage();
page.setDefaultTimeout(45000);
const responses = [];
page.on("response", async (response) => {
  if (response.url() !== api + "/api/routing" || response.request().method() !== "POST") return;
  try { const body = await response.json(); responses.push({ request: response.request().postDataJSON(), status: response.status(), data: body.data }); }
  catch { /* Superseded transport. */ }
});
async function shot(name) {
  await page.screenshot({ path: resolve(output, name + ".png") });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "NO_HORIZONTAL_OVERFLOW");
}
async function coordinate(label, point) {
  const planner = page.getByRole("region", { name: "Perencana rute" });
  const summary = planner.locator("summary").filter({ hasText: "Koordinat " + label.toLowerCase() });
  if (!(await summary.evaluate((el) => el.parentElement.open))) await summary.click();
  await planner.getByLabel("Latitude " + label, { exact: true }).fill(String(point.latitude));
  await planner.getByLabel("Longitude " + label, { exact: true }).fill(String(point.longitude));
  await planner.getByRole("button", { name: "Terapkan koordinat " + label.toLowerCase() }).click();
}
async function ready(mode) {
  await page.waitForFunction(() => document.querySelector("[data-routing-state]")?.dataset.routingState === "ROUTABLE");
  const live = responses.findLast((r) => r.request.mode === mode && r.data?.route_status === "ROUTABLE");
  assert(live && live.status === 200, "REAL_BACKEND_RESULT");
  evidence.routes.push({ mode, candidates: live.data.route_candidates?.map((c) => ({
    id: c.route_id, category: c.route_category, distance: c.distance_meters, duration: c.duration_seconds,
    nearby_umkm_count: c.nearby_umkm_count, points: c.geometry.coordinates.length,
  })) });
  return live.data;
}
async function mapData() {
  return page.locator(".map-canvas").evaluate((element) => {
    const key = Object.keys(element).find((k) => k.startsWith("__reactFiber"));
    let fiber = element[key];
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook) {
        const map = hook.memoizedState?.current;
        if (map && typeof map.getSource === "function" && typeof map.project === "function") {
          const feature = map.getSource("walking-route")?.serialize().data?.features?.[0];
          const alternatives = map.getSource("route-alternatives")?.serialize().data;
          return { geometry: feature?.geometry, alternatives };
        }
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    throw new Error("MAP_NOT_FOUND");
  });
}
try {
  const user = ordinaryUserFixture();
  await page.goto(origin + "/login");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app");
  evidence.checks.login = "PASS";
  const planner = page.getByRole("region", { name: "Perencana rute" });
  // Dynamic user entry; these coordinates are test inputs only.
  await coordinate("Asal", { latitude: -6.2414, longitude: 106.6281 });
  await coordinate("Tujuan", { latitude: -6.1754, longitude: 106.8272 });
  for (const [mode, label] of [["walking", "Jalan kaki"], ["motorcycle", "Motor"], ["car", "Mobil"]]) {
    await planner.getByRole("button", { name: label, exact: true }).click();
    const result = await ready(mode);
    await planner.getByRole("button", { name: "Lihat rute", exact: true }).click();
    const sheet = page.getByRole("region", { name: "Pilihan rute" });
    await page.locator(".map-panel").scrollIntoViewIfNeeded();
    for (const candidate of result.route_candidates) {
      const cards = sheet.locator("button[aria-pressed]").filter({ has: page.locator("strong") });
      const index = result.route_candidates.indexOf(candidate);
      await cards.nth(index).click();
      await page.waitForTimeout(250);
      assert(JSON.stringify((await mapData()).geometry) === JSON.stringify(candidate.geometry), "SELECTED_PROVIDER_GEOMETRY");
      assert((await cards.nth(index).innerText()).includes(Math.max(1, Math.ceil(candidate.duration_seconds / 60)) + " menit"));
      await shot(mode + "-candidate-" + index);
    }
    await sheet.getByRole("button", { name: "Tutup pilihan rute" }).click();
    await shot(mode + "-collapsed");
  }
  evidence.checks.modesAndCandidateSelection = "PASS";
  await page.setViewportSize({ width: 1440, height: 1000 });
  await planner.getByRole("button", { name: "Lihat rute", exact: true }).click();
  await shot("desktop-route-options");
  await page.getByRole("button", { name: "Tutup pilihan rute" }).click();
  await coordinate("Asal", { latitude: -6.21412, longitude: 106.68299 });
  await coordinate("Tujuan", { latitude: -6.218, longitude: 106.687 });
  await planner.getByRole("button", { name: "Jalan kaki", exact: true }).click();
  await ready("walking");
  await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).click();
  const active = page.getByRole("region", { name: "Navigasi aktif" });
  await page.waitForFunction(() => document.querySelector('[data-journey-state="ACTIVE"]'));
  await page.locator(".map-panel").scrollIntoViewIfNeeded();
  await shot("desktop-active");
  await page.setViewportSize({ width: 390, height: 844 });
  await active.getByRole("button", { name: "Fokuskan Lokasi" }).click();
  await page.waitForTimeout(1000);
  await page.locator(".map-panel").scrollIntoViewIfNeeded();
  await shot("mobile-active");
  const next = active.getByRole("region", { name: "Petunjuk berikutnya" });
  await next.waitFor();
  const maneuverBox = await next.boundingBox();
  const metricsBox = await active.getByTestId("routing-result").boundingBox();
  assert(maneuverBox.y + maneuverBox.height + 100 < metricsBox.y, "MAP_GAP_BETWEEN_NAVIGATION_PANELS");
  await active.locator("summary").click();
  await shot("mobile-directions");
  await active.locator("summary").click();
  await active.getByRole("button", { name: "Akhiri Perjalanan" }).click();
  await planner.waitFor({ state: "visible" });
  evidence.checks.activeMapLayoutAndStop = "PASS";
  evidence.status = "PASS";
} catch (error) {
  evidence.status = "FAIL";
  evidence.error = error.message;
  await shot("failure").catch(() => {});
  process.exitCode = 1;
} finally {
  evidence.finished = new Date().toISOString();
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ status: evidence.status, checks: evidence.checks, error: evidence.error }));
  await browser.close();
}
