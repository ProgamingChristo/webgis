import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const artifactsDir = "C:\\Users\\chris\\.gemini\\antigravity-ide\\brain\\34849a6f-bc07-4cfd-84b0-b00f201abe5c";
const chromePath =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

console.log("[Demo Screenshots] Launching Chromium via puppeteer-core...");
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on("console", (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // 1. Capture Login Screen (Unauthenticated)
  console.log("[Demo Screenshots] 1. Capturing Login Screen...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({
    path: path.join(artifactsDir, "demo_02_login_screen.png"),
    fullPage: false,
  });
  console.log("[Demo Screenshots] ✓ Saved demo_02_login_screen.png");

  // 2. Perform Login with UMKM Test Account
  console.log("[Demo Screenshots] Performing login with getra.umkm.test@example.com...");
  await page.evaluate(() => {
    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#password");
    if (emailInput) emailInput.value = "";
    if (passwordInput) passwordInput.value = "";
  });
  await page.type("#email", "getra.umkm.test@example.com", { delay: 20 });
  await page.type("#password", "Password123!", { delay: 20 });
  
  await page.click("button[type='submit']");
  console.log("[Demo Screenshots] Clicked submit, waiting for auth redirect...");
  await page.waitForFunction(() => !window.location.pathname.includes("/login"), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 2000));
  console.log(`[Demo Screenshots] Current URL after login: ${page.url()}`);

  // 3. Capture Home / General WebGIS
  console.log("[Demo Screenshots] 2. Capturing Home / General WebGIS...");
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({
    path: path.join(artifactsDir, "demo_01_home_general_webgis.png"),
    fullPage: false,
  });
  console.log("[Demo Screenshots] ✓ Saved demo_01_home_general_webgis.png (URL: " + page.url() + ")");

  // 4. Capture UMKM Workspace
  console.log("[Demo Screenshots] 3. Capturing UMKM Workspace...");
  await page.goto("http://localhost:3000/umkm", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({
    path: path.join(artifactsDir, "demo_03_umkm_workspace.png"),
    fullPage: false,
  });
  console.log("[Demo Screenshots] ✓ Saved demo_03_umkm_workspace.png (URL: " + page.url() + ")");

  // 5. Capture Add UMKM & Location Picker
  console.log("[Demo Screenshots] 4. Capturing Add UMKM...");
  await page.goto("http://localhost:3000/umkm/merchants/new", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({
    path: path.join(artifactsDir, "demo_04_add_umkm_location_picker.png"),
    fullPage: false,
  });
  console.log("[Demo Screenshots] ✓ Saved demo_04_add_umkm_location_picker.png (URL: " + page.url() + ")");

  // 6. Capture Advertising Manager
  console.log("[Demo Screenshots] 5. Capturing Advertising Manager...");
  await page.goto("http://localhost:3000/umkm/advertising?merchantId=c706d357-f1b8-4580-8b79-4a7909b68a12", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({
    path: path.join(artifactsDir, "demo_05_advertising_manager.png"),
    fullPage: false,
  });
  console.log("[Demo Screenshots] ✓ Saved demo_05_advertising_manager.png (URL: " + page.url() + ")");

  // 7. Capture Campaign Analytics
  console.log("[Demo Screenshots] 6. Capturing Campaign Analytics...");
  await page.goto("http://localhost:3000/umkm/advertising/analytics?campaignId=11111111-2222-4333-8444-555555555555", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 4500));
  await page.screenshot({
    path: path.join(artifactsDir, "demo_06_campaign_analytics.png"),
    fullPage: false,
  });
  console.log("[Demo Screenshots] ✓ Saved demo_06_campaign_analytics.png (URL: " + page.url() + ")");

  console.log("\n[Demo Screenshots] ALL AUTHENTIC SCREENSHOTS SUCCESSFULLY CAPTURED!");
} finally {
  await browser.close();
}
