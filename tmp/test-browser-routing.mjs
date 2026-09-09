import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`Set ${name} before running this manual smoke test.`);
  return value;
}

async function testBrowser() {
  const frontend = new URL(requiredEnv("GETRA_FRONTEND_ORIGIN"));
  if (!["http:", "https:"].includes(frontend.protocol) || frontend.username || frontend.password) {
    throw new Error("GETRA_FRONTEND_ORIGIN must be an HTTP(S) URL without embedded credentials.");
  }
  const email = requiredEnv("GETRA_TEST_USER_EMAIL");
  const password = requiredEnv("GETRA_TEST_USER_PASSWORD");
  const { chromium } = require(process.env.GETRA_PLAYWRIGHT_MODULE || "playwright");
  const screenshot = resolve(process.env.GETRA_ROUTING_SCREENSHOT || "outputs/routing-smoke/browser-routing.png");
  console.log("Launching Edge...");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    geolocation: { latitude: -6.2414, longitude: 106.6281 },
    permissions: ["geolocation"],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  console.log(`Navigating to ${frontend.origin}/login...`);
  await page.goto(`${frontend.origin}/login`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL("**/app");
  console.log("Logged in successfully to /app!");

  const planner = page.getByRole("region", { name: "Perencana rute" });
  await planner.waitFor();

  async function setCoord(label, point) {
    const summary = planner.locator("summary").filter({ hasText: `Koordinat ${label.toLowerCase()}` });
    if (!(await summary.evaluate((el) => el.parentElement.open))) await summary.click();
    await planner.getByLabel(`Latitude ${label}`, { exact: true }).fill(String(point.latitude));
    await planner.getByLabel(`Longitude ${label}`, { exact: true }).fill(String(point.longitude));
    await planner.getByRole("button", { name: `Terapkan koordinat ${label.toLowerCase()}` }).click();
  }

  console.log("Setting origin & destination...");
  await setCoord("Asal", { latitude: -6.2414, longitude: 106.6281 });
  await setCoord("Tujuan", { latitude: -6.1754, longitude: 106.8272 });

  console.log("Selecting motorcycle mode...");
  await planner.getByRole("button", { name: "Motor", exact: true }).click();

  console.log("Waiting for ROUTABLE state...");
  await page.waitForFunction(() => {
    const state = document.querySelector("[data-routing-state]")?.dataset.routingState;
    return state === "ROUTABLE";
  }, undefined, { timeout: 15000 });

  const errorVisible = await page.getByText("Layanan rute sementara tidak tersedia.").isVisible();
  console.log("Error message visible?", errorVisible);
  assert.equal(errorVisible, false, "Error message should NOT be visible");

  const startCTA = await planner.getByRole("button", { name: "Mulai Perjalanan", exact: true }).isVisible();
  console.log("Start Journey CTA visible?", startCTA);
  assert.equal(startCTA, true, "Start Journey CTA should be visible");

  mkdirSync(dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot });
  console.log(`Screenshot saved to ${screenshot}`);

  console.log("ALL BROWSER TESTS PASSED!");
  } finally {
    await browser.close();
  }
}

testBrowser().catch((err) => {
  console.error("Browser test failed:", err);
  process.exit(1);
});
