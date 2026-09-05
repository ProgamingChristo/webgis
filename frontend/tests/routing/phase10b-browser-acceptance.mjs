// Opt-in: simulated device GPS, real USER authentication and real public routing only.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { ordinaryUserFixture } from "./browser-user-fixture.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GETRA_PLAYWRIGHT_MODULE || "playwright");
const api = "https://getra-routing-api.tail0ed517.ts.net";
const origin = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3003";
const output = resolve("outputs/phase10b");
mkdirSync(output, { recursive: true });
const evidence = { started: new Date().toISOString(), checks: {}, routes: [], simulatedGPS: true, physicalTravel: false };
const p1 = { latitude: -6.2151, longitude: 106.6842 };
const p2 = { latitude: -6.2161, longitude: 106.6852 };
const b = { latitude: -6.218, longitude: 106.687 };
const a = { latitude: -6.21412, longitude: 106.68299 };
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  const watchers = new Map(); let next = 1;
  const gps = { point: null, code: null, created: 0, cleared: 0,
    emit() { for (const { ok, fail } of watchers.values()) {
      if (gps.code) fail({ code: gps.code });
      else if (gps.point) ok({ coords: { ...gps.point, accuracy: 5 }, timestamp: Date.now() });
    } },
    set(point) { gps.point = point; gps.code = null; gps.emit(); },
    error(code) { gps.code = code; gps.emit(); },
    stats() { return { active: watchers.size, created: gps.created, cleared: gps.cleared }; },
  };
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    watchPosition(ok, fail) { const id = next++; watchers.set(id, { ok, fail }); gps.created++; setTimeout(() => gps.emit(), 0); return id; },
    clearWatch(id) { if (watchers.delete(id)) gps.cleared++; },
    getCurrentPosition(ok, fail) { if (gps.code) fail({ code: gps.code }); else if (gps.point) ok({ coords: { ...gps.point, accuracy: 5 }, timestamp: Date.now() }); },
  } });
  window.__journeyGPS = gps;
  setInterval(() => gps.emit(), 3000);
});
const page = await context.newPage(); page.setDefaultTimeout(35_000);
const requests = [], responses = [];
page.on("request", (r) => { if (r.url() === `${api}/api/routing` && r.method() === "POST") requests.push(r.postDataJSON()); });
page.on("response", async (r) => {
  if (r.url() !== `${api}/api/routing` || r.request().method() !== "POST") return;
  try { responses.push({ request: r.request().postDataJSON(), http: r.status(), data: (await r.json()).data }); } catch { /* Aborted requests have no readable body. */ }
});
const planner = page.getByRole("region", { name: "Perencana rute" });
const gps = (p) => page.evaluate((point) => window.__journeyGPS.set(point), p);
const state = (s) => page.waitForFunction((s) => document.querySelector('[data-journey-state]')?.dataset.journeyState === s, s);
const gpsStats = () => page.evaluate(() => window.__journeyGPS.stats());
async function coordinate(label, point) {
  const summary = planner.locator("summary").filter({ hasText: `Koordinat ${label.toLowerCase()}` });
  if (!(await summary.evaluate((el) => el.parentElement.open))) await summary.click();
  await planner.getByLabel(`Latitude ${label}`, { exact: true }).fill(String(point.latitude));
  await planner.getByLabel(`Longitude ${label}`, { exact: true }).fill(String(point.longitude));
  await planner.getByRole("button", { name: `Terapkan koordinat ${label.toLowerCase()}` }).click();
}
async function mapState(action = "state") {
  return page.evaluate((action) => {
    const element = document.querySelector(".map-canvas");
    const key = Object.keys(element).find((k) => k.startsWith("__reactFiber$"));
    let fiber = element[key], map;
    while (fiber && !map) {
      let h = fiber.memoizedState;
      while (h && !map) { const c = h.memoizedState?.current; if (c?.getSource && c?.project) map = c; h = h.next; }
      fiber = fiber.return;
    }
    if (!map) throw new Error("MAP_MISSING");
    if (action === "manual") { map.fire("dragstart", { originalEvent: {} }); map.panBy([70, 0], { duration: 0 }); }
    const coords = map.getSource("walking-route")?.serialize().data?.features?.[0]?.geometry?.coordinates || [];
    const canvas = map.getCanvas();
    const gps = window.__journeyGPS.point;
    const projectedGPS = gps ? map.project([gps.longitude, gps.latitude]) : null;
    const basemap = document.querySelector('.basemap-switcher').getBoundingClientRect();
    const mapRect = map.getContainer().getBoundingClientRect();
    return { points: coords.length, center: map.getCenter().toArray(), bounds: map.getBounds().toArray(),
      gpsVisible: projectedGPS && projectedGPS.x > 0 && projectedGPS.y > 0 && projectedGPS.x < map.getContainer().clientWidth && projectedGPS.y < map.getContainer().clientHeight,
      gpsClearOfBasemap: projectedGPS && mapRect.top + projectedGPS.y + 24 < basemap.top,
      sourceCount: Object.keys(map.getStyle().sources).filter((s) => s === "walking-route").length,
      layerCount: map.getStyle().layers.filter((l) => l.source === "walking-route").length,
      currentMarkers: document.querySelectorAll(".user-location-anchor").length,
      originMarkers: document.querySelectorAll('[aria-label^="Asal A"]').length,
      destinationMarkers: document.querySelectorAll('[aria-label^="Tujuan B"]').length,
      canvas: { width: canvas.width, height: canvas.height, webgl: Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")) },
      order: coords.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] > 105 && p[1] < 0),
    };
  }, action);
}
async function accepted(name, mode, point, since, arrived = false) {
  await state(arrived ? "ARRIVED" : "ACTIVE");
  let r;
  for (let i = 0; i < 150; i++) {
    r = responses.slice(since).findLast((r) => r.data?.mode === mode && r.data.route_status === "ROUTABLE" &&
      r.request.origin.latitude === point.latitude && r.request.origin.longitude === point.longitude);
    if (r) break; await page.waitForTimeout(100);
  }
  assert(r, `REAL_RESPONSE_REQUIRED_${name}`); assert.equal(r.http, 200);
  assert.deepEqual(r.request.destination, b);
  assert(r.data.distance_meters > 0 && r.data.duration_seconds > 0);
  assert.equal(r.data.geometry.type, "LineString");
  let map;
  for (let i = 0; i < 100; i++) { map = await mapState(); if (map.points === r.data.geometry.coordinates.length) break; await page.waitForTimeout(100); }
  assert.equal(map.points, r.data.geometry.coordinates.length); assert(map.points > 1 && map.order && map.canvas.webgl);
  assert.equal(map.sourceCount, 1); assert.equal(map.layerCount, 2);
  assert.equal(map.currentMarkers, 1); assert.equal(map.originMarkers, 0); assert.equal(map.destinationMarkers, 1);
  const text = await planner.getByTestId("routing-result").innerText();
  const distance = r.data.distance_meters >= 1000 ? `${(r.data.distance_meters / 1000).toFixed(1)} km` : `${Math.round(r.data.distance_meters)} m`;
  assert(text.includes(distance)); assert(text.includes(`${Math.max(1, Math.ceil(r.data.duration_seconds / 60))} menit`));
  const record = { name, mode, origin: point, destination: b, distance: r.data.distance_meters, duration: r.data.duration_seconds, points: map.points,
    maneuvers: r.data.maneuvers.length, http: r.http };
  evidence.routes.push(record); console.log(JSON.stringify(record));
  return r.data;
}
async function preview() {
  await page.waitForFunction(() => document.querySelector('[data-routing-state]')?.dataset.routingState === "ROUTABLE");
  await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).waitFor();
}
async function stop() {
  await planner.getByRole("button", { name: "Akhiri Perjalanan", exact: true }).click(); await state("STOPPED");
  assert.equal((await gpsStats()).active, 0); await preview();
}
try {
  assert.equal((await context.request.get(`${api}/api/health`)).status(), 200);
  await page.goto(`${origin}/login`);
  const fixture = ordinaryUserFixture();
  await page.getByLabel("Email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click(); await page.waitForURL("**/app", { timeout: 45000 });
  await planner.waitFor();
  await coordinate("Asal", a); await coordinate("Tujuan", b); await preview();
  evidence.checks.authAndPreview = "PASS";
  await gps(p1); let since = responses.length;
  await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).click();
  await accepted("P1", "walking", p1, since); assert.equal((await gpsStats()).active, 1);
  const beforeFlood = requests.length;
  for (let i = 0; i < 20; i++) await gps(p1);
  assert.equal(requests.length, beforeFlood); evidence.checks.noGPSFlood = "PASS";
  since = responses.length; await gps(p2); await accepted("P2", "walking", p2, since);
  evidence.checks.realMovementReroute = "PASS";
  for (const [mode, label] of [["motorcycle", "Motor"], ["car", "Mobil"]]) {
    since = responses.length; await planner.getByRole("button", { name: label, exact: true }).click();
    await accepted(`active-${mode}`, mode, p2, since);
  }
  evidence.checks.activeModeIsolation = "PASS";
  await page.waitForTimeout(800); await mapState("manual");
  await page.waitForTimeout(100); const camera = (await mapState()).center;
  await gps({ latitude: p2.latitude + 0.00001, longitude: p2.longitude }); await page.waitForTimeout(800);
  assert.deepEqual((await mapState()).center, camera);
  assert.equal(await page.locator('[data-journey-following]').getAttribute('data-journey-following'), 'false');
  await planner.getByRole("button", { name: "Fokuskan Lokasi", exact: true }).click(); await page.waitForTimeout(800);
  const centered = (await mapState()).center; assert(Math.abs(centered[0] - p2.longitude) < 0.0001);
  evidence.checks.cameraFollowAndOverride = "PASS";
  const count = requests.length;
  await page.locator('.basemap-switcher button').filter({ hasText: 'Light' }).click(); await page.waitForTimeout(2000);
  assert.equal(requests.length, count); assert.equal((await mapState()).layerCount, 2);
  evidence.checks.styleReload = "PASS";
  await planner.scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(output, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await planner.getByRole("button", { name: "Fokuskan Lokasi", exact: true }).click();
  await page.waitForTimeout(1000);
  await planner.scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(output, "mobile-controls.png"), fullPage: false });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator(".map-panel").scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(output, "mobile-map.png"), fullPage: false });
  evidence.mobileMap = await mapState();
  assert(evidence.mobileMap.gpsVisible, "MOBILE_GPS_MUST_BE_VISIBLE");
  assert(evidence.mobileMap.gpsClearOfBasemap, "MOBILE_GPS_MUST_NOT_OVERLAP_BASEMAP");
  evidence.checks.mobile = "PASS";
  // GPS failures only: successful provider responses are never mocked.
  for (const code of [2, 3]) {
    await page.evaluate((code) => window.__journeyGPS.error(code), code); await state("ERROR");
    assert.equal(await planner.getByTestId("routing-result").count(), 0); assert.equal((await mapState()).points, 0);
    since = responses.length; await gps(p2); await accepted(`GPS-recovery-${code}`, "car", p2, since);
  }
  evidence.checks.gpsLoss = "PASS";
  await stop(); const afterStop = requests.length; await gps(p1); await page.waitForTimeout(1500);
  assert.equal(requests.length, afterStop); evidence.checks.stop = "PASS";
  await page.evaluate(() => window.__journeyGPS.error(1));
  const deniedRequests = requests.length;
  await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).click(); await state("ERROR");
  assert((await planner.innerText()).includes("Izin lokasi diperlukan"));
  assert.equal(requests.length, deniedRequests); assert.equal((await gpsStats()).active, 0);
  assert.equal((await mapState()).currentMarkers, 0); evidence.checks.permissionDenied = "PASS";
  await stop(); await page.setViewportSize({ width: 1440, height: 1000 });
  await planner.getByRole("button", { name: "Jalan kaki", exact: true }).click(); await preview();
  // Hold an actual P1 response while a newer P2 response is accepted.
  let release, fetched;
  const gate = new Promise((r) => { release = r; });
  const ready = new Promise((r) => { fetched = r; });
  let held = false;
  const delay = async (route) => {
    const q = route.request().postDataJSON();
    if (!held && q.origin.latitude === p1.latitude && q.mode === "walking") {
      held = true; const response = await route.fetch(); fetched(); await gate;
      await route.fulfill({ response }).catch(() => {});
    } else await route.continue();
  };
  await page.route(`${api}/api/routing`, delay); await gps(p1);
  await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).click(); await ready;
  since = responses.length; await gps(p2); const winner = await accepted("race-P2", "walking", p2, since);
  release(); await page.waitForTimeout(1000); await page.unroute(`${api}/api/routing`, delay);
  assert.equal((await mapState()).points, winner.geometry.coordinates.length); evidence.checks.realResponseRace = "PASS";
  await stop();
  // A device fixture near B is still accepted only with a real, short network route.
  await gps({ latitude: -6.21795, longitude: 106.68695 }); since = responses.length;
  await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).click();
  await accepted("arrival", "walking", { latitude: -6.21795, longitude: 106.68695 }, since, true);
  assert.equal((await gpsStats()).active, 0);
  assert((await planner.innerText()).includes("Anda telah tiba di tujuan.")); evidence.checks.arrival = "PASS";
  await planner.getByRole("button", { name: "Kembali ke perencana" }).click(); await preview();
  evidence.checks.previewAfterJourney = "PASS";
  // Unmount cleanup while watch is active, without logging out or exposing a session.
  await gps(p1); since = responses.length;
  await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).click(); await accepted("before-unmount", "walking", p1, since);
  let finishPending, pendingReady;
  const pendingGate = new Promise((r) => { finishPending = r; });
  const pendingFetched = new Promise((r) => { pendingReady = r; });
  let pendingHeld = false;
  const pendingDelay = async (route) => {
    if (!pendingHeld && route.request().postDataJSON().origin.latitude === p1.latitude) {
      pendingHeld = true; const response = await route.fetch(); pendingReady(); await pendingGate;
      await route.fulfill({ response }).catch(() => {});
    } else await route.continue();
  };
  await page.route(`${api}/api/routing`, pendingDelay);
  await page.waitForTimeout(1100); await planner.getByRole("button", { name: "Perbarui rute", exact: true }).click();
  await pendingFetched; await state("REROUTING"); await stop(); finishPending();
  await page.waitForTimeout(500); await page.unroute(`${api}/api/routing`, pendingDelay);
  assert.equal(await page.locator('[data-journey-state]').getAttribute('data-journey-state'), 'STOPPED');
  const stoppedCount = requests.length; await gps(p2); await page.waitForTimeout(1200);
  assert.equal(requests.length, stoppedCount); evidence.checks.stopDuringPendingRealResponse = "PASS";
  await gps(p1); since = responses.length;
  await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).click(); await accepted("unmount", "walking", p1, since);
  await page.getByRole("link", { name: "Community", exact: true }).first().click();
  await page.waitForURL("**/community");
  assert.equal((await gpsStats()).active, 0); evidence.checks.unmountWatchCleanup = "PASS";
  assert.equal((await context.request.get(`${api}/api/health`)).status(), 200);
  evidence.status = "PASS";
} catch (error) {
  evidence.status = "FAIL"; evidence.error = error instanceof Error ? error.message : "UNKNOWN";
  await page.screenshot({ path: resolve(output, "failure.png"), fullPage: true }).catch(() => {});
  console.error(evidence.error); process.exitCode = 1;
} finally {
  evidence.finished = new Date().toISOString();
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ status: evidence.status, checks: evidence.checks }));
  await browser.close();
}
