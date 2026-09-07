// Opt-in real staging acceptance. Never persist sessions or capture login screenshots.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const ts = require(resolve("node_modules/typescript/lib/typescript.js"));
const { chromium } = require(process.env.GETRA_PLAYWRIGHT_MODULE || "playwright");
const api = "https://getra-routing-api.tail0ed517.ts.net";
const frontend = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3001";
const output = resolve("outputs/phase10");
mkdirSync(output, { recursive: true });
const evidence = { started: new Date().toISOString(), frontend, api, routes: [], checks: {} };
const fixtureSource = execFileSync("git", ["show", "b3fded2cc23885b890fb7fbb30f99cdd7e6befbe:backend/scripts/api-smoke-test.ts"], { encoding: "utf8" });
const source = ts.createSourceFile("fixture.ts", fixtureSource, ts.ScriptTarget.Latest, true);
const declarations = new Map();
function collect(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node.initializer);
  ts.forEachChild(node, collect);
}
collect(source);
function literal(node) {
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map((p) => [p.name.text, literal(p.initializer)]));
  if (ts.isIdentifier(node) && declarations.has(node.text)) return literal(declarations.get(node.text));
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken) return process.env.GETRA_TEST_USER_PASSWORD || literal(node.right);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  throw new Error("UNSUPPORTED_FIXTURE_LITERAL");
}
const fixture = literal(declarations.get("stableUsers")).find((u) => u.expectedAccountRole === "USER");
assert(fixture, "ORDINARY_USER_FIXTURE_REQUIRED");
const password = literal(declarations.get("TEST_PASSWORD"));
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(25000);
const requests = [];
const responses = [];
page.on("request", (r) => { if (r.url() === `${api}/api/routing` && r.method() === "POST") requests.push(r.postDataJSON()); });
page.on("response", async (r) => {
  if (r.url() === `${api}/api/routing` && r.request().method() === "POST") {
    try { responses.push({ request: r.request().postDataJSON(), http: r.status(), body: await r.json() }); } catch { /* Aborted superseded requests have no readable response. */ }
  }
});
const planner = page.getByRole("region", { name: "Perencana rute" });

// Inspect the actual mounted MapLibre instance via React's test-only fiber reference.
async function inspectMap(action, value) {
  return page.evaluate(({ action, value }) => {
    const element = document.querySelector(".map-canvas");
    const key = element && Object.keys(element).find((k) => k.startsWith("__reactFiber$"));
    let fiber = key ? element[key] : null;
    let map;
    while (fiber && !map) {
      let hook = fiber.memoizedState;
      while (hook && !map) {
        const current = hook.memoizedState?.current;
        if (current && typeof current.getSource === "function" && typeof current.project === "function") map = current;
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    if (!map) throw new Error("MAP_INSTANCE_MISSING");
    if (action === "pan") { map.panBy([24, 0], { duration: 0 }); return true; }
    if (action === "focus") { map.jumpTo({ center: [value.longitude, value.latitude], zoom: 17 }); return true; }
    if (action === "project") { const p = map.project([value.longitude, value.latitude]); return { x: p.x, y: p.y }; }
    const data = map.getSource("walking-route")?.serialize().data;
    const coordinates = data?.features?.[0]?.geometry?.coordinates || [];
    const canvas = map.getCanvas();
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const style = map.getStyle();
    return { points: coordinates.length, sourceCount: Object.keys(style?.sources || {}).filter((s) => s === "walking-route").length,
      layerCount: (style?.layers || []).filter((l) => l.source === "walking-route").length,
      loaded: map.isStyleLoaded(), webgl: Boolean(gl), width: canvas.width, height: canvas.height,
      inBounds: coordinates.every((p) => map.getBounds().contains(p)),
      endpoints: document.querySelectorAll('[role="img"][aria-label^="Asal A"], [role="img"][aria-label^="Tujuan B"]').length,
      coordinateOrder: coordinates.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] > 105 && p[1] < 0),
    };
  }, { action, value });
}
async function coordinate(label, point) {
  const summary = planner.locator("summary").filter({ hasText: `Koordinat ${label.toLowerCase()}` });
  if (!(await summary.evaluate((el) => el.parentElement.open))) await summary.click();
  await planner.getByLabel(`Latitude ${label}`, { exact: true }).fill(String(point.latitude));
  await planner.getByLabel(`Longitude ${label}`, { exact: true }).fill(String(point.longitude));
  await planner.getByRole("button", { name: `Terapkan koordinat ${label.toLowerCase()}` }).click();
}
async function accepted(name, mode, since) {
  await page.waitForFunction(() => document.querySelector('[data-routing-state]')?.dataset.routingState === "ROUTABLE");
  let response;
  for (let i = 0; i < 100; i++) {
    response = responses.slice(since).findLast((r) => r.body.data?.mode === mode && r.body.data?.route_status === "ROUTABLE");
    if (response) break;
    await page.waitForTimeout(200);
  }
  assert(response, `REAL_RESPONSE_REQUIRED_${name}`);
  const d = response.body.data;
  assert.equal(response.http, 200);
  assert(d.distance_meters > 0 && d.duration_seconds > 0 && d.geometry?.type === "LineString" && d.geometry.coordinates.length > 1, "INVALID_ROUTE");
  let map;
  for (let i = 0; i < 100; i++) {
    map = await inspectMap("state");
    if (map.points === d.geometry.coordinates.length) break;
    await page.waitForTimeout(200);
  }
  assert.equal(map.points, d.geometry.coordinates.length, "MAP_SOURCE_POINT_COUNT");
  assert.equal(map.sourceCount, 1); assert.equal(map.layerCount, 2);
  assert.equal(map.endpoints, 2, "ENDPOINT_MARKERS_REQUIRED");
  assert(map.webgl && map.coordinateOrder, "MAP_RENDER_OR_ORDER_FAILED");
  const summary = await planner.getByTestId("routing-result").innerText();
  const distance = d.distance_meters >= 1000 ? `${(d.distance_meters / 1000).toFixed(1)} km` : `${Math.round(d.distance_meters)} m`;
  assert(summary.includes(distance) && summary.includes(`${Math.max(1, Math.ceil(d.duration_seconds / 60))} menit`), "SUMMARY_NOT_PROVIDER_DERIVED");
  const record = { name, mode, origin: response.request.origin, destination: response.request.destination,
    http: response.http, route_status: d.route_status, distance_meters: d.distance_meters, duration_seconds: d.duration_seconds, points: d.geometry.coordinates.length };
  evidence.routes.push(record); console.log(JSON.stringify(record));
  return record;
}
async function mode(label, value, name) {
  const since = responses.length;
  await planner.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(150);
  return accepted(name, value, since);
}
async function pick(target, point) {
  await inspectMap("focus", point);
  await page.waitForTimeout(300);
  await planner.getByRole("button", { name: `Pilih ${target} di peta`, exact: true }).click();
  const position = await inspectMap("project", point);
  const nextRequest = page.waitForRequest((r) => r.url() === `${api}/api/routing` && r.method() === "POST");
  await page.locator(".map-canvas").click({ position });
  await nextRequest;
  await page.waitForTimeout(100);
}

try {
  const health = await context.request.get(`${api}/api/health`);
  assert.equal(health.status(), 200, "STAGING_COMPUTE_OFFLINE");
  evidence.checks.publicHealth = "PASS";
  await page.goto(`${frontend}/login`);
  await page.getByLabel("Email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app", { timeout: 45000 });
  await planner.waitFor({ state: "visible" });
  console.log("BROWSER_LOGIN=PASS");
  evidence.checks.browserAuth = "PASS";
  const a = { latitude: -6.214120, longitude: 106.682990 };
  const b = { latitude: -6.218000, longitude: 106.687000 };
  await coordinate("Asal", a);
  let since = responses.length;
  await coordinate("Tujuan", b);
  const walking = await accepted("regression-walking", "walking", since);
  await mode("Mobil", "car", "regression-car");
  await mode("Motor", "motorcycle", "regression-motorcycle");
  const repeated = await mode("Jalan kaki", "walking", "repeat-walking");
  assert.deepEqual(repeated.origin, walking.origin); assert.deepEqual(repeated.destination, walking.destination);
  assert.equal(repeated.distance_meters, walking.distance_meters);
  evidence.checks.modeIsolation = "PASS";
  await page.waitForTimeout(900);
  evidence.checks.cameraFit = (await inspectMap("state")).inBounds ? "PASS" : "FAIL";
  await planner.scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, "desktop.png"), fullPage: true });

  const pairs = [
    { mode: "walking", label: "Jalan kaki", a: { latitude: -6.2151, longitude: 106.6842 }, b: { latitude: -6.2168, longitude: 106.6861 } },
    { mode: "motorcycle", label: "Motor", a: { latitude: -6.2155, longitude: 106.6845 }, b: { latitude: -6.2172, longitude: 106.6863 } },
    { mode: "car", label: "Mobil", a: { latitude: -6.2157, longitude: 106.6847 }, b: { latitude: -6.2175, longitude: 106.6865 } },
  ];
  for (const [i, pair] of pairs.entries()) {
    if (i) await mode(pair.label, pair.mode, `mode-before-dynamic-${i + 1}`);
    since = responses.length;
    await pick("asal", pair.a);
    await accepted(`origin-reselect-${i + 1}`, pair.mode, since);
    await page.waitForTimeout(800);
    since = responses.length;
    await pick("tujuan", pair.b);
    await accepted(`dynamic-pair-${i + 1}`, pair.mode, since);
    await page.waitForTimeout(800);
  }
  evidence.checks.dynamicMapSelection = "PASS";
  // Controlled delayed real response, not a mock success or alternate routing engine.
  let delayedWalking = false;
  const delayed = async (route) => {
    if (!delayedWalking && route.request().postDataJSON().mode === "walking") {
      delayedWalking = true;
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({ response }).catch(() => {});
    } else await route.continue();
  };
  await page.route(`${api}/api/routing`, delayed);
  const walkingRequest = page.waitForRequest((r) => r.url() === `${api}/api/routing` && r.postDataJSON()?.mode === "walking");
  await planner.getByRole("button", { name: "Jalan kaki", exact: true }).click();
  await walkingRequest;
  assert.equal(await planner.getAttribute("data-routing-state"), "LOADING");
  await page.waitForTimeout(100);
  assert.equal((await inspectMap("state")).points, 0, "STALE_ROUTE_DURING_LOADING");
  const car = await mode("Mobil", "car", "race-car-wins");
  await page.waitForTimeout(1800);
  assert.equal(await planner.getByRole("button", { name: "Mobil", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal((await inspectMap("state")).points, car.points);
  evidence.checks.requestRace = "PASS";
  await page.unroute(`${api}/api/routing`, delayed);

  const baseline = responses.findLast((r) => r.body.data?.route_status === "ROUTABLE").body.data;
  const cases = [
    { name: "not-routable", state: "NOT_ROUTABLE", http: 200, body: { success: true, data: { ...baseline, route_status: "UNROUTABLE", reason_code: "NO_ROUTE_FOUND", geometry: null, distance_meters: null, duration_seconds: null } } },
    { name: "unavailable", state: "SERVICE_UNAVAILABLE", http: 200, body: { success: true, data: { ...baseline, route_status: "SERVICE_UNAVAILABLE", reason_code: "ROUTING_PROVIDER_UNREACHABLE", geometry: null, distance_meters: null, duration_seconds: null } } },
    { name: "timeout", state: "SERVICE_UNAVAILABLE", http: 200, body: { success: true, data: { ...baseline, route_status: "SERVICE_UNAVAILABLE", reason_code: "ROUTING_TIMEOUT", geometry: null, distance_meters: null, duration_seconds: null } } },
    { name: "invalid-geometry", state: "SERVICE_UNAVAILABLE", http: 200, body: { success: true, data: { ...baseline, geometry: { type: "LineString", coordinates: [] } } } },
    { name: "validation", state: "ERROR", http: 400, body: { success: false, error: { code: "SPATIAL_INVALID_COORDINATE" } } },
    { name: "auth", state: "ERROR", http: 401, body: { success: false, error: { code: "UNAUTHORIZED" } } },
  ];
  for (const test of cases) {
    const handler = (route) => route.fulfill({ status: test.http, contentType: "application/json", body: JSON.stringify(test.body) });
    await page.route(`${api}/api/routing`, handler);
    await planner.getByRole("button", { name: "Hitung Rute", exact: true }).click();
    await page.waitForFunction((state) => document.querySelector('[data-routing-state]')?.dataset.routingState === state, test.state);
    await page.waitForTimeout(100);
    assert.equal((await inspectMap("state")).points, 0, "FAILURE_LEFT_STALE_GEOMETRY");
    assert.equal(await planner.getByTestId("routing-result").count(), 0);
    if (test.name === "auth") assert.equal(await planner.getByRole("link", { name: "Masuk kembali" }).count(), 1);
    evidence.checks[`controlled-${test.name}`] = "PASS";
    await page.unroute(`${api}/api/routing`, handler);
  }
  since = responses.length;
  await planner.getByRole("button", { name: "Hitung Rute", exact: true }).click();
  await accepted("after-controlled-failures", "car", since);
  const routeBeforeStyle = await inspectMap("state");
  const requestsBeforeStyle = requests.length;
  await page.locator('.basemap-switcher button').filter({ hasText: /^Light/ }).click();
  await page.waitForTimeout(1000);
  for (let i = 0; i < 100; i++) {
    const state = await inspectMap("state");
    if (state.loaded && state.points === routeBeforeStyle.points && state.layerCount === 2) break;
    await page.waitForTimeout(200);
  }
  assert.equal((await inspectMap("state")).points, routeBeforeStyle.points, "STYLE_RELOAD_LOST_ROUTE");
  assert.equal((await inspectMap("state")).layerCount, 2);
  assert.equal(requests.length, requestsBeforeStyle, "BASEMAP_TRIGGERED_REROUTE");
  evidence.checks.styleReload = "PASS";
  await inspectMap("pan");
  await page.waitForTimeout(500);
  assert.equal(requests.length, requestsBeforeStyle, "PANNING_MOVED_ENDPOINT");
  evidence.checks.panDoesNotMoveEndpoints = "PASS";
  await page.setViewportSize({ width: 390, height: 844 });
  await mode("Jalan kaki", "walking", "mobile-walking");
  await page.waitForTimeout(1000);
  since = responses.length;
  await pick("asal", pairs[0].a);
  await accepted("mobile-origin-reselect", "walking", since);
  await page.waitForTimeout(800);
  since = responses.length;
  await pick("tujuan", pairs[0].b);
  await accepted("mobile-destination-reselect", "walking", since);
  await page.waitForTimeout(800);
  evidence.checks.mobileMapSelection = "PASS";
  assert((await inspectMap("state")).inBounds, "MOBILE_ROUTE_NOT_FRAMED");
  evidence.checks.mobileCameraFit = "PASS";
  await page.locator(".map-panel").scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(output, "mobile-map.png") });
  await planner.scrollIntoViewIfNeeded();
  await planner.screenshot({ path: resolve(output, "mobile-controls.png") });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!overflow, "MOBILE_HORIZONTAL_OVERFLOW");
  evidence.checks.mobileOverflow = "PASS";
  evidence.checks.finalMap = await inspectMap("state");
  const requestsBeforeReset = requests.length;
  await planner.getByRole("button", { name: "Reset", exact: true }).click();
  await page.waitForTimeout(400);
  assert.equal(await planner.getAttribute("data-routing-state"), "IDLE");
  assert.equal((await inspectMap("state")).points, 0);
  assert.equal((await inspectMap("state")).endpoints, 0);
  assert.equal(await planner.getByTestId("routing-result").count(), 0);
  assert.equal(await planner.getByRole("alert").count(), 0);
  assert.equal(requests.length, requestsBeforeReset);
  evidence.checks.reset = "PASS";
  evidence.finished = new Date().toISOString();
  evidence.status = "PASS";
} catch (error) {
  evidence.status = "FAIL";
  evidence.debug = { requests: requests.slice(-4), responses: responses.slice(-4).map((r) => ({ http: r.http, code: r.body.error?.code, status: r.body.data?.route_status, mode: r.body.data?.mode })) };
  evidence.failure = String(error.message).replace(/https?:\/\/\S+/g, "[url]").slice(0, 500);
  console.log("BROWSER_ACCEPTANCE_FAILED=" + evidence.failure);
  if (page.url().includes("/app")) await page.screenshot({ path: resolve(output, "failure.png"), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  await browser.close();
}
