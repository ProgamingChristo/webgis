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
  ({ chromium } = require(process.env.GETRA_PLAYWRIGHT_MODULE || "D:/Antigravity IDE/resources/app/node_modules/playwright"));
}

const origin = process.env.GETRA_FRONTEND_ORIGIN || "http://localhost:3080";
const merchantId = "4efeb68e-d212-433d-b5d7-fcc969ec4732";
const output = resolve("outputs/four-leaves-production");
mkdirSync(output, { recursive: true });
const evidence = { origin, merchantId, checks: {}, browserErrors: [], screenshots: [] };

const installGps = () => {
  const point = { latitude: -6.1754, longitude: 106.8272, accuracy: 18 };
  const position = () => ({
    coords: { ...point, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: Date.now(),
  });
  let nextWatch = 1;
  const timers = new Map();
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: {
    getCurrentPosition(success) { setTimeout(() => success(position()), 0); },
    watchPosition(success) {
      const id = nextWatch++;
      const timer = setInterval(() => success(position()), 1_000);
      timers.set(id, timer);
      setTimeout(() => success(position()), 0);
      return id;
    },
    clearWatch(id) { clearInterval(timers.get(id)); timers.delete(id); },
  } });
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await context.addInitScript(installGps);
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  evidence.routeAttempts = [];
  page.on("response", async (response) => {
    if (new URL(response.url()).pathname !== "/api/routing") return;
    let body = null;
    try { body = await response.json(); } catch { /* aborted response */ }
    evidence.routeAttempts.push({
      status: response.status(),
      request: response.request().postDataJSON(),
      routeStatus: body?.data?.route_status ?? null,
      errorCode: body?.error?.code ?? null,
    });
  });
  page.on("pageerror", (error) => evidence.browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") evidence.browserErrors.push(`console: ${message.text()}`);
  });

  const user = approvedAccountFixture("ADMIN");
  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel(/^(Password|Kata sandi)$/).fill(user.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app");

  const search = page.getByLabel("Cari tempat", { exact: true });
  // A partial term exercises the canonical merchant list instead of the
  // exact-place resolver, allowing both result-card and popup assertions.
  await search.fill("four");
  await page.waitForTimeout(300);
  await search.press("Enter");
  await page.waitForTimeout(8_000);
  evidence.searchDiagnostics = await page.evaluate(() => ({
    url: location.href,
    merchantIds: Array.from(document.querySelectorAll("[data-merchant-id]"))
      .map((node) => node.getAttribute("data-merchant-id")),
    status: document.querySelector("[aria-live='polite']")?.textContent?.trim() ?? null,
  }));
  const result = page.locator(`[data-merchant-id="${merchantId}"]`);
  await result.waitFor();
  assert.match(await result.innerText(), /Buka sekarang/);
  assert.match(await result.innerText(), /Sedang/);
  evidence.checks.publicStatusAndPrice = "PASS";

  await result.click();
  const popup = page.locator(".commuter-place-popup");
  await popup.waitFor();
  const popupBox = await popup.boundingBox();
  assert(popupBox && popupBox.width <= 224 && popupBox.height <= 300);
  assert.match(await popup.innerText(), /08:00-21:00 WIB/);
  evidence.popup = { width: popupBox.width, height: popupBox.height };
  evidence.checks.compactPopup = "PASS";
  await page.screenshot({ path: resolve(output, "01_four_leaves_compact_popup.png") });
  evidence.screenshots.push("01_four_leaves_compact_popup.png");

  await popup.getByRole("button", { name: "Rute ke sini", exact: true }).click();
  const planner = page.getByRole("region", { name: "Perencana rute" });
  await page.waitForFunction(() => document.querySelector("[data-routing-state]")?.getAttribute("data-routing-state") === "ROUTABLE");
  await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).click();
  const journey = page.getByRole("region", { name: "Navigasi aktif" });
  await journey.waitFor();
  await page.waitForFunction(() => document.querySelector("[data-journey-state]")?.getAttribute("data-journey-state") === "ACTIVE");

  const layout = await page.evaluate(() => {
    const workspace = document.querySelector(".workspace-grid[data-journey-open='true']")?.getBoundingClientRect();
    const panel = document.querySelector(".workspace-grid[data-journey-open='true'] > .map-panel")?.getBoundingClientRect();
    const canvas = document.querySelector(".map-canvas canvas")?.getBoundingClientRect();
    return {
      workspaceWidth: workspace?.width ?? 0,
      panelWidth: panel?.width ?? 0,
      panelLeft: panel?.left ?? -1,
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0,
    };
  });
  assert(layout.workspaceWidth > 0);
  assert(layout.panelWidth >= layout.workspaceWidth * 0.98);
  assert(layout.panelLeft >= 0 && layout.panelLeft < 5);
  assert(layout.canvasWidth > 1_000 && layout.canvasHeight > 600);
  evidence.layout = layout;
  evidence.checks.fourLeavesJourneyMapVisible = "PASS";
  await page.screenshot({ path: resolve(output, "02_four_leaves_active_journey.png") });
  evidence.screenshots.push("02_four_leaves_active_journey.png");

  await page.getByRole("button", { name: "Akhiri Perjalanan", exact: true }).click();
  assert.equal(evidence.browserErrors.length, 0, evidence.browserErrors.join(" | "));
  evidence.status = "PASS";
  await context.close();
} catch (error) {
  evidence.status = "FAIL";
  evidence.error = error instanceof Error ? error.stack || error.message : String(error);
  process.exitCode = 1;
} finally {
  writeFileSync(resolve(output, "evidence.json"), JSON.stringify(evidence, null, 2));
  await browser.close();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}
