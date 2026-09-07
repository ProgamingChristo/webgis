// Opt-in browser diagnostic. Records routing availability without credentials or session data.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ordinaryUserFixture } from "./browser-user-fixture.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GETRA_PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3040";
const browserHostResolverRules = process.env.GETRA_BROWSER_HOST_RESOLVER_RULES;
const expectedState = process.env.GETRA_EXPECTED_ROUTING_STATE || "ROUTABLE";
const diagnosticOrigin = {
  latitude: Number(process.env.GETRA_DIAGNOSTIC_ORIGIN_LATITUDE ?? -6.2414),
  longitude: Number(process.env.GETRA_DIAGNOSTIC_ORIGIN_LONGITUDE ?? 106.6281),
};
const diagnosticDestination = {
  latitude: Number(process.env.GETRA_DIAGNOSTIC_DESTINATION_LATITUDE ?? -6.1754),
  longitude: Number(process.env.GETRA_DIAGNOSTIC_DESTINATION_LONGITUDE ?? 106.8272),
};
const output = resolve("outputs/phase12a2");
mkdirSync(output, { recursive: true });

const evidence = {
  started: new Date().toISOString(),
  frontendOrigin: origin,
  physicalTravel: false,
  requests: [],
  checks: {},
};
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  ...(browserHostResolverRules
    ? { args: [`--host-resolver-rules=${browserHostResolverRules}`] }
    : {}),
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(45_000);

page.on("response", async (response) => {
  const url = new URL(response.url());
  if (url.pathname !== "/api/routing" || response.request().method() !== "POST") return;
  const record = { origin: url.origin, status: response.status() };
  try {
    const body = await response.json();
    record.success = body?.success;
    record.routeStatus = body?.data?.route_status;
    record.reasonCode = body?.data?.reason_code;
    record.mode = body?.data?.mode;
    record.distanceMeters = body?.data?.distance_meters;
    record.durationSeconds = body?.data?.duration_seconds;
    record.candidateCount = body?.data?.route_candidates?.length ?? 0;
  } catch {
    record.response = "NON_JSON_OR_UNAVAILABLE";
  }
  evidence.requests.push(record);
});

async function setCoordinate(planner, label, point) {
  const summary = planner.locator("summary").filter({ hasText: `Koordinat ${label.toLowerCase()}` });
  if (!(await summary.evaluate((element) => element.parentElement.open))) await summary.click();
  await planner.getByLabel(`Latitude ${label}`, { exact: true }).fill(String(point.latitude));
  await planner.getByLabel(`Longitude ${label}`, { exact: true }).fill(String(point.longitude));
  await planner.getByRole("button", { name: `Terapkan koordinat ${label.toLowerCase()}` }).click();
}

try {
  const user = ordinaryUserFixture();
  await page.goto(`${origin}/login`);
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app");
  evidence.checks.login = "PASS";

  const planner = page.getByRole("region", { name: "Perencana rute" });
  await setCoordinate(planner, "Asal", diagnosticOrigin);
  await setCoordinate(planner, "Tujuan", diagnosticDestination);
  await planner.getByRole("button", { name: "Motor", exact: true }).click();
  await page.waitForFunction(() => {
    const state = document.querySelector("[data-routing-state]")?.dataset.routingState;
    return state && state !== "LOADING";
  });
  const state = await page.locator("[data-routing-state]").getAttribute("data-routing-state");
  evidence.checks.finalRoutingState = state;
  assert.equal(state, expectedState);
  const request = evidence.requests.findLast((item) => item.mode === "motorcycle");
  assert(request, "ROUTING_RESPONSE_REQUIRED");
  assert.equal(request.status, 200);
  assert.equal(request.routeStatus, expectedState);
  if (expectedState === "ROUTABLE") {
    assert(request.distanceMeters > 0 && request.durationSeconds > 0);
    evidence.checks.motorcycle = "PASS";
  } else {
    assert.equal(request.reasonCode, "ROUTING_PROVIDER_UNREACHABLE");
    evidence.checks.providerUnavailable = "PASS";
  }
  evidence.status = "PASS";
} catch (error) {
  evidence.status = "FAIL";
  evidence.error = error.message;
  await page.screenshot({ path: resolve(output, "failure.png") }).catch(() => {});
  process.exitCode = 1;
} finally {
  evidence.finished = new Date().toISOString();
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ status: evidence.status, checks: evidence.checks, requests: evidence.requests, error: evidence.error }));
  await browser.close();
}
