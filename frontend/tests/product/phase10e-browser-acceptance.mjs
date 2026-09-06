// Opt-in: disposable Community records and real public routing; never physical GPS evidence.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { approvedAccountFixture } from "../routing/browser-user-fixture.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.GETRA_PLAYWRIGHT_MODULE || "playwright");
const frontend = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3003";
const backend = process.env.GETRA_BACKEND_ORIGIN || "https://getra-routing-api.tail0ed517.ts.net";
const backendSource = ["localhost", "127.0.0.1"].includes(new URL(backend).hostname)
  ? "REAL_GETRA_BACKEND_LOCAL_GATEWAY"
  : "PUBLIC_GETRA_BACKEND";
const output = resolve("outputs/phase10e3");
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
  await page.waitForURL((url) => ["/app", "/onboarding"].includes(url.pathname));
  return { context, page };
}

async function createPost(page, content) {
  if (!page.url().endsWith("/community")) await openCommunity(page);
  await page.getByLabel("Tulis informasi lokal").fill(content);
  const responsePromise = page.waitForResponse((response) => response.url() === `${backend}/api/community/posts` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Posting", exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const body = await response.json();
  const card = page.getByRole("article").filter({ hasText: content });
  try {
    await card.waitFor({ timeout: 3_000 });
  } catch {
    await page.reload();
    await card.waitFor();
  }
  return body.data.id;
}

async function openCommunity(page) {
  if (page.viewportSize().width < 1024) {
    await page.getByRole("button", { name: "Buka menu GETRA" }).click();
    await page.getByRole("dialog", { name: "Menu GETRA" }).getByRole("link", { name: "Community", exact: true }).click();
  } else {
    await page.getByRole("navigation", { name: "Navigasi utama GETRA" }).getByRole("link", { name: "Community", exact: true }).click();
  }
  await page.getByRole("region", { name: "Feed Community" }).waitFor();
}

async function deleteThroughUi(page, content, label, moderation = false) {
  const card = page.getByRole("article").filter({ hasText: content });
  const action = card.getByRole("button", { name: "Hapus", exact: true });
  await action.waitFor();
  await page.screenshot({ path: resolve(output, label + "-delete-action.png") });
  await action.click();
  const dialogName = moderation ? "Hapus postingan sebagai admin?" : "Hapus postingan?";
  const dialog = page.getByRole("dialog", { name: dialogName });
  await dialog.waitFor();
  await page.screenshot({ path: resolve(output, label + "-delete-confirmation.png") });
  await dialog.getByRole("button", { name: "Batal" }).click();
  await card.waitFor();
  await action.click();
  const deleteResponse = page.waitForResponse((response) => response.url().includes("/api/community/posts/") && response.request().method() === "DELETE");
  await page.getByRole("dialog", { name: dialogName }).getByRole("button", { name: "Hapus", exact: true }).click();
  assert.equal((await deleteResponse).status(), 200);
  await card.waitFor({ state: "hidden", timeout: 5_000 });
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
  const user2 = approvedAccountFixture("USER", 2);
  const admin = approvedAccountFixture("ADMIN", 0);
  const first = await login(user1);
  for (const postId of (process.env.GETRA_DISPOSABLE_CLEANUP_IDS || "").split(",").filter(Boolean)) {
    const cleanupStatus = await authenticatedStatus(first.page, `/api/community/posts/${postId}`, "DELETE");
    assert([200, 404].includes(cleanupStatus));
  }
  const marker = `Phase 10E disposable ${Date.now()}`;
  const ownContent = `${marker} owner delete`;
  const adminContent = `${marker} admin delete`;
  const ownId = await createPost(first.page, ownContent);
  const ownCard = first.page.getByRole("article").filter({ hasText: ownContent });
  const ownAuthorHref = await ownCard.locator('a[href^="/community/users/"]').first().getAttribute("href");
  const feedCards = first.page.getByRole("article");
  let foreignCardIndex = -1;
  for (let index = 0; index < await feedCards.count(); index += 1) {
    const authorHref = await feedCards.nth(index).locator('a[href^="/community/users/"]').first().getAttribute("href").catch(() => null);
    if (authorHref && authorHref !== ownAuthorHref) { foreignCardIndex = index; break; }
  }
  assert(foreignCardIndex >= 0, "VISIBLE_FOREIGN_POST_REQUIRED");
  const visibleForeignCard = feedCards.nth(foreignCardIndex);
  assert.equal(await visibleForeignCard.getByRole("button", { name: "Hapus", exact: true }).count(), 0);
  await visibleForeignCard.scrollIntoViewIfNeeded();
  await visibleForeignCard.screenshot({ path: resolve(output, "other-user-no-delete.png") });
  evidence.community.otherUserUi = "DELETE_ACTION_HIDDEN";
  await deleteThroughUi(first.page, ownContent, "owner");
  assert.equal(await authenticatedStatus(first.page, `/api/community/posts/${ownId}`, "GET"), 404);
  evidence.community.ownerDelete = "PASS";
  evidence.community.deletedDetail = "NOT_FOUND";
  const adminDeleteId = await createPost(first.page, adminContent);
  await first.context.close();

  const second = await login(user2, { width: 390, height: 844 });
  if (!second.page.url().includes("/onboarding")) await openCommunity(second.page);
  const foreignCard = second.page.getByRole("article").filter({ hasText: adminContent });
  await second.page.waitForTimeout(2_000);
  const foreignPostVisible = await foreignCard.isVisible().catch(() => false);
  if (foreignPostVisible) {
    assert.equal(await foreignCard.getByRole("button", { name: "Hapus", exact: true }).count(), 0);
    await second.page.screenshot({ path: resolve(output, "other-user-no-delete.png") });
  }
  assert.equal(await authenticatedStatus(second.page, `/api/community/posts/${adminDeleteId}`, "DELETE"), 403);
  evidence.community.otherUserDenial = "PASS";
  evidence.community.secondaryFixtureUi = foreignPostVisible ? "DELETE_ACTION_HIDDEN" : "FIXTURE_NOT_ONBOARDED_POST_NOT_VISIBLE";
  evidence.community.mobileAuthorization = "SERVER_DENIAL_PASS";
  await second.context.close();

  const moderator = await login(admin, { width: 390, height: 844 });
  await openCommunity(moderator.page);
  const adminCard = moderator.page.getByRole("article").filter({ hasText: adminContent });
  await adminCard.getByRole("button", { name: "Hapus", exact: true }).waitFor();
  await moderator.page.screenshot({ path: resolve(output, "admin-feed-delete-action.png") });
  await adminCard.getByRole("link").filter({ hasText: adminContent }).click();
  await deleteThroughUi(moderator.page, adminContent, "admin-detail", true);
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
  await planner.getByRole("button", { name: "Lihat rute", exact: true }).click();
  const sheet = page.getByRole("region", { name: "Pilihan rute" });
  await sheet.waitFor();
  const alternative = sheet.getByRole("button", { name: /Alternatif|Lewat area UMKM/ }).last();
  await alternative.click();
  assert.equal(await alternative.getAttribute("aria-pressed"), "true", "ROUTE_CARD_SELECTION");
  const mapLabels = page.locator(".route-map-label");
  assert.equal(await mapLabels.count(), live.data.route_candidates.length);
  const clickableLabelIndex = await mapLabels.evaluateAll((labels) => labels.findIndex((label) => {
    const box = label.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit === label || label.contains(hit);
  }));
  assert(clickableLabelIndex >= 0, "VISIBLE_MAP_ROUTE_LABEL_REQUIRED");
  await mapLabels.nth(clickableLabelIndex).click();
  await page.waitForFunction((index) => document.querySelectorAll(".route-map-label")[index]?.getAttribute("aria-pressed") === "true", clickableLabelIndex);
  assert.equal(await mapLabels.nth(clickableLabelIndex).getAttribute("aria-pressed"), "true", "MAP_ROUTE_LABEL_SELECTION");
  const umkmButton = sheet.getByRole("button", { name: "Lewat area UMKM", exact: true });
  if (live.data.umkm_preference_available) {
    assert.equal(await umkmButton.isEnabled(), true);
    await umkmButton.click();
    await page.waitForResponse((response) => response.url() === `${backend}/api/routing` && response.request().postDataJSON()?.route_preference === "UMKM" && response.status() === 200);
    evidence.routing.umkmPreference = "AVAILABLE_AND_SELECTED";
  } else {
    assert.equal(await umkmButton.isDisabled(), true);
    await sheet.getByText("Belum ada alternatif lewat area UMKM untuk perjalanan ini.").waitFor();
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
    latencyMs: Date.now() - started, responseBytes: live.bytes, source: backendSource };
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
