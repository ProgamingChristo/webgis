// Opt-in: disposable Community records and real public routing; never physical GPS evidence.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { approvedAccountFixture } from "../routing/browser-user-fixture.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GETRA_PLAYWRIGHT_MODULE || "playwright");
const frontend = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3003";
const backend = "https://getra-routing-api.tail0ed517.ts.net";
const output = resolve("outputs/phase10e");
mkdirSync(output, { recursive: true });
const evidence = { started: new Date().toISOString(), checks: {}, community: {}, routing: {}, simulatedGPS: false, physicalTravel: false };
const browser = await chromium.launch({ channel: "msedge", headless: true });

async function login(fixture, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  await page.goto(`${frontend}/login`);
  await page.getByLabel("Email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app");
  return { context, page };
}

async function createPost(page, content) {
  await page.goto(`${frontend}/community`);
  await page.getByLabel("Tulis informasi lokal").fill(content);
  const responsePromise = page.waitForResponse((response) => response.url() === `${backend}/api/community/posts` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Posting", exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const body = await response.json();
  await page.getByRole("article").filter({ hasText: content }).waitFor();
  return body.data.id;
}

async function deleteThroughUi(page, content) {
  const card = page.getByRole("article").filter({ hasText: content });
  await card.getByLabel("Opsi postingan").click();
  await card.getByRole("button", { name: "Hapus postingan" }).click();
  const dialog = page.getByRole("dialog", { name: "Hapus postingan ini?" });
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Batal" }).click();
  await card.waitFor();
  await card.getByLabel("Opsi postingan").click();
  await card.getByRole("button", { name: "Hapus postingan" }).click();
  const deleteResponse = page.waitForResponse((response) => response.url().includes("/api/community/posts/") && response.request().method() === "DELETE");
  await page.getByRole("dialog", { name: "Hapus postingan ini?" }).getByRole("button", { name: "Hapus", exact: true }).click();
  assert.equal((await deleteResponse).status(), 200);
  await assert.rejects(card.waitFor({ state: "visible", timeout: 1_000 }));
}

async function authenticatedStatus(page, path, method) {
  return page.evaluate(async ({ backend, path, method }) => {
    let token = null;
    for (const value of Object.values(localStorage)) {
      try {
        const parsed = JSON.parse(value);
        token ||= parsed?.access_token ?? parsed?.currentSession?.access_token ?? null;
      } catch { /* Non-session browser data. */ }
    }
    if (!token) throw new Error("BROWSER_SESSION_REQUIRED");
    return (await fetch(`${backend}${path}`, { method, headers: { Authorization: `Bearer ${token}` } })).status;
  }, { backend, path, method });
}

async function coordinate(planner, label, point) {
  const summary = planner.locator("summary").filter({ hasText: `Koordinat ${label.toLowerCase()}` });
  if (!(await summary.evaluate((element) => element.parentElement.open))) await summary.click();
  await planner.getByLabel(`Latitude ${label}`, { exact: true }).fill(String(point.latitude));
  await planner.getByLabel(`Longitude ${label}`, { exact: true }).fill(String(point.longitude));
  await planner.getByRole("button", { name: `Terapkan koordinat ${label.toLowerCase()}` }).click();
}

try {
  const user1 = approvedAccountFixture("USER", 0);
  const user2 = approvedAccountFixture("USER", 1);
  const admin = approvedAccountFixture("ADMIN", 0);
  const first = await login(user1);
  const marker = `Phase 10E disposable ${Date.now()}`;
  const ownContent = `${marker} owner delete`;
  const adminContent = `${marker} admin delete`;
  const ownId = await createPost(first.page, ownContent);
  await deleteThroughUi(first.page, ownContent);
  assert.equal(await authenticatedStatus(first.page, `/api/community/posts/${ownId}`, "GET"), 404);
  evidence.community.ownerDelete = "PASS";
  evidence.community.deletedDetail = "NOT_FOUND";
  const adminDeleteId = await createPost(first.page, adminContent);
  await first.context.close();

  const second = await login(user2, { width: 390, height: 844 });
  await second.page.goto(`${frontend}/community`);
  const foreignCard = second.page.getByRole("article").filter({ hasText: adminContent });
  await foreignCard.waitFor();
  assert.equal(await foreignCard.getByLabel("Opsi postingan").count(), 0);
  assert.equal(await authenticatedStatus(second.page, `/api/community/posts/${adminDeleteId}`, "DELETE"), 403);
  evidence.community.otherUserDenial = "PASS";
  evidence.community.mobileAuthorization = "PASS";
  await second.context.close();

  const moderator = await login(admin);
  await moderator.page.goto(`${frontend}/community`);
  await deleteThroughUi(moderator.page, adminContent);
  assert.equal(await authenticatedStatus(moderator.page, `/api/community/posts/${adminDeleteId}`, "GET"), 404);
  evidence.community.adminDelete = "PASS";
  await moderator.context.close();

  const routingUser = await login(user1);
  const page = routingUser.page;
  const responses = [];
  page.on("response", async (response) => {
    if (response.url() !== `${backend}/api/routing` || response.request().method() !== "POST") return;
    try {
      const body = await response.json();
      responses.push({ status: response.status(), request: response.request().postDataJSON(), data: body.data, bytes: Buffer.byteLength(JSON.stringify(body)) });
    } catch { /* Superseded requests can be aborted. */ }
  });
  await page.goto(`${frontend}/app`);
  const planner = page.getByRole("region", { name: "Perencana rute" });
  await coordinate(planner, "Asal", { latitude: -6.2414, longitude: 106.6281 });
  await coordinate(planner, "Tujuan", { latitude: -6.1754, longitude: 106.8272 });
  await planner.getByRole("button", { name: "Mobil", exact: true }).click();
  const started = Date.now();
  await page.waitForFunction(() => document.querySelector('[data-routing-state]')?.dataset.routingState === "ROUTABLE");
  const live = responses.findLast((item) => item.request.mode === "car" && item.data?.route_status === "ROUTABLE");
  assert(live && live.status === 200);
  assert(live.data.route_candidates.length > 1, "GENUINE_PROVIDER_ALTERNATIVE_REQUIRED");
  assert(live.data.route_candidates.every((candidate) => candidate.geometry.type === "LineString" && candidate.geometry.coordinates.length > 1));
  await planner.locator('[data-sheet-open] > button').click();
  const sheet = planner.getByRole("region", { name: "Pilihan rute" });
  await sheet.waitFor();
  const alternative = sheet.getByRole("button", { name: /Alternatif|Lewat area UMKM/ }).last();
  await alternative.click();
  assert.equal(await alternative.getAttribute("aria-pressed"), "true");
  const umkmButton = sheet.getByRole("button", { name: "Lewat area UMKM", exact: true });
  if (live.data.umkm_preference_available) {
    assert.equal(await umkmButton.isEnabled(), true);
    await umkmButton.click();
    await page.waitForResponse((response) => response.url() === `${backend}/api/routing` && response.request().postDataJSON()?.route_preference === "UMKM" && response.status() === 200);
    evidence.routing.umkmPreference = "AVAILABLE_AND_SELECTED";
  } else {
    assert.equal(await umkmButton.isDisabled(), true);
    await sheet.getByText("Belum ada alternatif lewat area UMKM untuk rute ini.").waitFor();
    evidence.routing.umkmPreference = "TRUTHFUL_NOT_AVAILABLE";
  }
  await sheet.getByRole("button", { name: "Mulai Perjalanan", exact: true }).waitFor();
  await page.screenshot({ path: resolve(output, "multi-route-desktop.png"), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await sheet.scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: resolve(output, "multi-route-mobile.png"), fullPage: false });
  evidence.routing = { ...evidence.routing, mode: "car", candidateCount: live.data.route_candidates.length,
    selectedRouteId: live.data.selected_route_id, enrichmentStatus: live.data.umkm_enrichment_status,
    nearbyCounts: live.data.route_candidates.map((candidate) => candidate.nearby_umkm_count),
    latencyMs: Date.now() - started, responseBytes: live.bytes, source: "PUBLIC_GETRA_BACKEND" };
  evidence.checks.community = "PASS";
  evidence.checks.multiRoute = "PASS";
  evidence.checks.responsiveRouteSheet = "PASS";
  evidence.status = "PASS";
  await routingUser.context.close();
} catch (error) {
  evidence.status = "FAIL";
  evidence.error = error instanceof Error ? error.message : "UNKNOWN";
  process.exitCode = 1;
} finally {
  evidence.finished = new Date().toISOString();
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ status: evidence.status, checks: evidence.checks, community: evidence.community, routing: evidence.routing }));
  await browser.close();
}
