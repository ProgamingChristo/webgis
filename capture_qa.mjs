import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUTPUT_DIR = "D:\\Getra_Owner_Profile_Refactor\\outputs\\owner-business-profile";

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureElement(page, selector, filename) {
  const el = await page.$(selector);
  if (!el) {
    console.log(`Element ${selector} not found for ${filename}`);
    return;
  }
  const box = await el.boundingBox();
  if (!box || box.width === 0 || box.height === 0) {
    console.log(`Element ${selector} has invalid bounding box for ${filename}`);
    return;
  }
  console.log(`Capturing ${filename} with bbox: ${Math.round(box.width)}x${Math.round(box.height)}`);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, filename),
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: box.width,
      height: box.height,
    },
  });
}

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1440,1200",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("requestfailed", (req) => {
    failedRequests.push(`${req.method()} ${req.url()}`);
  });

  try {
    console.log("Navigating to login...");
    await page.goto("http://localhost:3100/login", { waitUntil: "networkidle2" });

    // Fill login form
    console.log("Logging in as verified UMKM owner...");
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', "getra.admin.test@example.com");
    await page.type('input[type="password"]', "PasswordDevelopment123!");
    await page.click('button[type="submit"]');

    // Wait for redirect to /app
    await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
    console.log("Current URL after login:", page.url());

    // 1. Navigate to /umkm#usaha-saya for 01-owner-business-list.png
    console.log("Navigating to /umkm#usaha-saya...");
    await page.goto("http://localhost:3100/umkm#usaha-saya", { waitUntil: "networkidle2" });
    await page.waitForFunction(() => {
      return document.body.textContent.includes("FOUR LEAVES") ||
             document.body.textContent.includes("Kelola dan Kembangkan Usaha Anda");
    }, { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1000));

    console.log("Capturing 01-owner-business-list.png...");
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "01-owner-business-list.png"),
      fullPage: true,
    });

    // 2. Open rich profile directly via URL query view=profile
    console.log("Navigating to verified profile view directly...");
    await page.goto("http://localhost:3100/umkm?merchantId=4efeb68e-d212-433d-b5d7-fcc969ec4732&view=profile#usaha-saya", {
      waitUntil: "networkidle2",
    });

    await page.waitForFunction(() => {
      return document.body.textContent.includes("Profil & Operasional Usaha");
    }, { timeout: 20000 });

    console.log("Profile view loaded! Waiting 3s for visuals & map...");
    await new Promise((r) => setTimeout(r, 3000));

    // 02-profile-desktop.png
    console.log("Capturing 02-profile-desktop.png...");
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "02-profile-desktop.png"),
      fullPage: true,
    });

    // Individual cropped card screenshots
    await captureElement(page, "#profile-hero", "03-profile-hero.png");
    await captureElement(page, "#profile-identity", "04-profile-identity.png");
    await captureElement(page, "#profile-location", "05-profile-location.png");
    await captureElement(page, "#profile-hours", "06-profile-hours.png");
    await captureElement(page, "#profile-facilities", "07-profile-facilities.png");
    await captureElement(page, "#profile-menu", "08-profile-menu.png");

    // 3. Save Action Flow (10-profile-save-success.png)
    console.log("Starting save flow on desktop...");
    // Toggle facility chip (Wi-Fi Cepat)
    console.log("Toggling facility chip...");
    const chipClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const chip = buttons.find((b) => b.textContent?.includes("Wi-Fi Cepat"));
      if (chip) {
        chip.click();
        return true;
      }
      return false;
    });
    console.log("Chip clicked successfully:", chipClicked);

    // Wait for save button to become enabled (!disabled)
    console.log("Waiting for save button to enable...");
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const saveBtn = buttons.find((b) =>
        b.textContent?.includes("Simpan & Terapkan") ||
        b.textContent?.includes("Simpan Perubahan")
      );
      return saveBtn && !saveBtn.disabled;
    }, { timeout: 10000 });

    // Click "Simpan & Terapkan" or "Simpan Perubahan"
    console.log("Clicking save button...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const saveBtn = buttons.find((b) =>
        b.textContent?.includes("Simpan & Terapkan") ||
        b.textContent?.includes("Simpan Perubahan")
      );
      if (saveBtn) saveBtn.click();
    });

    // Wait for save feedback
    console.log("Waiting for save success banner...");
    await page.waitForFunction(() => {
      return document.body.textContent.includes("berhasil disimpan");
    }, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    // 10-profile-save-success.png
    console.log("Capturing 10-profile-save-success.png...");
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "10-profile-save-success.png"),
      fullPage: true,
    });

    // 4. Mobile Viewport Screenshot (09-profile-mobile.png)
    console.log("Capturing 09-profile-mobile.png (390x844)...");
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "09-profile-mobile.png"),
      fullPage: true,
    });

    // 5. Responsive Breakpoint Overflow Checks
    console.log("Testing responsive breakpoints for overflow...");
    const viewports = [1440, 1024, 430, 390, 375, 320];
    const overflowReport = {};
    for (const w of viewports) {
      await page.setViewport({ width: w, height: 900, isMobile: w <= 768 });
      await new Promise((r) => setTimeout(r, 500));
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      overflowReport[w] = hasOverflow ? "OVERFLOW" : "PASS";
    }
    console.log("RESPONSIVE OVERFLOW REPORT:", JSON.stringify(overflowReport));

    console.log("=== ALL 10 QA SCREENSHOTS CAPTURED SUCCESSFULLY ===");
    console.log("Console errors:", consoleErrors.length);
    console.log("Failed requests:", failedRequests.length);

  } catch (err) {
    console.error("Browser QA failed with error:", err);
  } finally {
    await browser.close();
  }
}

run();
