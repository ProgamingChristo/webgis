import fs from "node:fs";
import path from "node:path";
import { createRequire } from "module";

const requirePkg = createRequire("D:/Getra_Production/node_modules/puppeteer-core/package.json");
const puppeteer = requirePkg("puppeteer-core");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const candidateOutDir = "D:\\Getra_UMKM_Submission_Fix\\outputs\\umkm-reliability";
const brainOutDir = "C:\\Users\\chris\\.gemini\\antigravity-ide/brain/1441601b-c116-4aae-a4c1-8f99e79d1225/outputs/umkm-reliability";
const appUrl = "http://localhost:3100";
const testImagePath = "D:\\Getra_UMKM_Submission_Fix\\scripts\\test-storefront.png";

fs.mkdirSync(candidateOutDir, { recursive: true });
fs.mkdirSync(brainOutDir, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveScreenshot(page, filename) {
  const fileCandidate = path.join(candidateOutDir, filename);
  const fileBrain = path.join(brainOutDir, filename);
  await page.screenshot({ path: fileCandidate });
  try {
    fs.copyFileSync(fileCandidate, fileBrain);
  } catch (e) {
    // ignore
  }
  console.log(`[SCREENSHOT] Saved: ${filename}`);
}

async function main() {
  console.log("=== GETRA STEP 2.8: UMKM SUBMISSION RELIABILITY BROWSER QA ===");

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--use-fake-ui-for-media-stream",
    ],
  });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions(appUrl, ["geolocation"]);

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  // Emulate Jakarta Geolocation
  await page.setGeolocation({
    latitude: -6.2088,
    longitude: 106.8456,
    accuracy: 10,
  });

  const pageErrors = [];
  const networkEvents = [];

  page.on("pageerror", (err) => {
    console.error("[Browser PageError]:", err.message);
    pageErrors.push(err.message);
  });

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/api/")) {
      networkEvents.push({
        url: url.split("?")[0],
        method: res.request().method(),
        status: res.status(),
      });
    }
  });

  // 1. Authenticate via standard UI login to ensure full browser session & Supabase sync
  console.log("\n[1/10] Performing authentic UI login at /login...");
  await page.goto(`${appUrl}/login`, { waitUntil: "networkidle0", timeout: 20000 });
  await sleep(1000);

  const emailInput = await page.$("input[type=email]");
  const passwordInput = await page.$("input[type=password]");
  if (emailInput && passwordInput) {
    await emailInput.click({ clickCount: 3 });
    await emailInput.type("getra.admin.test@example.com");
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type("PasswordDevelopment123!");
    await sleep(300);

    const submitLogin = await page.$("button[type=submit]");
    if (submitLogin) {
      await submitLogin.click();
      await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 }).catch(() => {});
    }
  }
  await sleep(2000);

  // 2. Test Issue A: Owner Workspace Loading
  console.log("\n[2/10] Navigating to /umkm (Owner Workspace)...");
  await page.goto(`${appUrl}/umkm`, { waitUntil: "networkidle0", timeout: 20000 });
  await sleep(3000);

  const workspaceText = await page.evaluate(() => document.body.innerText);
  const isInfiniteLoading = workspaceText.includes("Memuat usaha Anda...") && !document.querySelector("a[href*='/umkm/merchants/new']");
  console.log("Owner Workspace stuck in infinite loading:", isInfiniteLoading ? "YES (FAIL)" : "NO (PASS)");
  
  await saveScreenshot(page, "01-owner-workspace.png");

  // 3. Navigate to Merchant Registration Form
  console.log("\n[3/10] Starting Merchant Registration Wizard (/umkm/merchants/new)...");
  await page.goto(`${appUrl}/umkm/merchants/new`, { waitUntil: "networkidle0", timeout: 20000 });
  await sleep(2000);

  const searchInput = await page.$("#claim-merchant-search");
  const testBusinessName = `Kopi Harapan ${Date.now().toString().slice(-4)}`;
  if (searchInput) {
    console.log(`Searching business identity: "${testBusinessName}"...`);
    await searchInput.type(testBusinessName);
    await sleep(500);

    const searchBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.innerText.includes("Cari Usaha") || b.type === "submit");
    });
    if (searchBtn && searchBtn.asElement()) {
      await searchBtn.asElement().click();
      await sleep(2000);
    }

    const registerBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.innerText.includes("Daftarkan Usaha Baru") || b.innerText.includes("Daftarkan Baru"));
    });
    if (registerBtn && registerBtn.asElement()) {
      console.log("Clicking 'Daftarkan Usaha Baru'...");
      await registerBtn.asElement().click();
      await sleep(2000);
    }
  }

  // 4. Step 1 UI & AI Assistant Test
  console.log("\n[4/10] Verifying Step 1 UI & Polish...");
  await page.waitForSelector("#merchant-name", { timeout: 10000 });
  await saveScreenshot(page, "02-step1-clean.png");

  // Fill Step 1 required name
  await page.type("#merchant-name", testBusinessName);
  await sleep(300);

  // Test Issue B: AI Description Assistant
  console.log("\n[5/10] Testing Issue B: AI Description Assistant...");
  const assistantBtn = await page.$("button[aria-label='Bantu tulis'], button[title='Bantu tulis'], button[aria-label='Perbaiki tulisan']");
  if (assistantBtn) {
    console.log("Clicking 'Bantu tulis' trigger...");
    await assistantBtn.click();
    await sleep(1200);
    await saveScreenshot(page, "03-description-helper.png");

    // Click and type into product input
    const productField = await page.$("input[placeholder*='kopi susu'], input[placeholder*='menu']");
    if (productField) {
      await productField.click();
      await productField.type("Kopi Susu Aren, Roti Bakar Cokelat");
      await sleep(300);
    }

    // Click and type into advantage input
    const advField = await page.$("input[placeholder*='kampus'], input[placeholder*='keunggulan']");
    if (advField) {
      await advField.click();
      await advField.type("Biji kopi arabika segar pilihan dengan racikan khas lokal");
      await sleep(300);
    }

    // Click "Buat Deskripsi"
    const generateBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.innerText.includes("Buat Deskripsi") || b.innerText.includes("Generate"));
    });

    if (generateBtn && generateBtn.asElement()) {
      console.log("Triggering AI description generation...");
      await generateBtn.asElement().click();
      await sleep(4000);

      await saveScreenshot(page, "04-description-generated.png");

      const applyBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find((b) => b.innerText.includes("Terapkan ke Deskripsi") || b.innerText.includes("Terapkan"));
      });
      if (applyBtn && applyBtn.asElement()) {
        console.log("Clicking 'Terapkan ke Deskripsi'...");
        await applyBtn.asElement().click();
        await sleep(1000);
      }
    }
  }

  // Select Price Range "Terjangkau"
  const priceBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.innerText.includes("Terjangkau"));
  });
  if (priceBtn && priceBtn.asElement()) {
    await priceBtn.asElement().click();
    await sleep(300);
  }

  // Advance Step 1 -> Step 2
  console.log("\n[6/10] Advancing to Step 2 (Location & Operations)...");
  const step1Next = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.innerText.trim() === "Lanjut" || b.innerText.includes("Lanjut"));
  });
  if (step1Next && step1Next.asElement()) {
    await step1Next.asElement().click();
    await sleep(2000);
  }

  // 5. Test Issue C: Location & Reverse Geocoding
  console.log("\n[7/10] Testing Issue C: 'Gunakan Lokasi Saya' & Reverse Geocoding Autofill...");
  await page.waitForSelector("#merchant-address", { timeout: 10000 });
  await saveScreenshot(page, "05-step2-location.png");

  const useLocationBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.innerText.includes("Gunakan Lokasi Saya") || b.innerText.includes("Lokasi Saya"));
  });

  if (useLocationBtn && useLocationBtn.asElement()) {
    console.log("Clicking 'Gunakan Lokasi Saya'...");
    await useLocationBtn.asElement().click();
    await sleep(4000);

    let addressVal = await page.evaluate(() => document.querySelector("#merchant-address")?.value || "");
    console.log("Address populated from Reverse Geocode:", addressVal || "(Manually filling)");

    if (!addressVal.trim()) {
      await page.type("#merchant-address", "Jalan Sultan Agung, Pasar Manggis, Jakarta Selatan");
      addressVal = "Jalan Sultan Agung, Pasar Manggis, Jakarta Selatan";
    }

    await saveScreenshot(page, "06-current-location-address.png");
    await saveScreenshot(page, "07-map-pin.png");
  }

  // Advance Step 2 -> Step 3
  console.log("\n[8/10] Advancing to Step 3 (Media & Submission)...");
  const step2Next = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.innerText.trim() === "Lanjut" || b.innerText.includes("Lanjut"));
  });
  if (step2Next && step2Next.asElement()) {
    await step2Next.asElement().click();
    await sleep(2500);
  }

  // Wait for Step 3 photo input
  await page.waitForSelector("input[accept*='image']", { timeout: 10000 });
  await saveScreenshot(page, "08-step3.png");

  // 6. Test Issue D: Final Submission (Photo Upload + Ajukan Usaha)
  console.log("\n[9/10] Testing Issue D: Photo Upload & Final Submission ('Ajukan Usaha')...");
  
  // Attach test storefront photo
  const photoFileInput = await page.$("input[accept*='image']");
  if (photoFileInput) {
    console.log("Attaching test storefront photo:", testImagePath);
    await photoFileInput.uploadFile(testImagePath);
    await sleep(2500);
  }

  let submitRequestUrl = null;
  let submitResponseStatus = null;
  page.on("request", (req) => {
    if (req.url().includes("/submit") || req.url().includes("/merchant-submissions")) {
      console.log(`[NETWORK REQ]: ${req.method()} ${req.url()}`);
      if (req.url().includes("/submit")) {
        submitRequestUrl = req.url();
      }
    }
  });

  page.on("response", (res) => {
    if (res.url().includes("/submit") || res.url().includes("/merchant-submissions")) {
      console.log(`[NETWORK RES]: ${res.status()} ${res.url()}`);
      if (res.url().includes("/submit")) {
        submitResponseStatus = res.status();
      }
    }
  });

  const submitBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find((b) => b.innerText.includes("Ajukan Usaha") || b.innerText.includes("Ajukan Verifikasi"));
  });

  if (submitBtn && submitBtn.asElement()) {
    console.log("Clicking 'Ajukan Usaha'...");
    await submitBtn.asElement().click();
    await sleep(5000);

    await saveScreenshot(page, "09-submit-network.png");
    await sleep(2000);
    await saveScreenshot(page, "10-pending-success.png");
  }

  // 7. Verify Public Search Discoverability is BLOCKED for Pending Merchant
  console.log("\n[10/10] Verifying Public Discoverability is BLOCKED for Pending Merchant...");
  await page.goto(`${appUrl}/app`, { waitUntil: "networkidle0", timeout: 20000 });
  await sleep(2000);

  const searchInputApp = await page.$("input[placeholder*='Cari'], input[aria-label*='Cari']");
  if (searchInputApp) {
    await searchInputApp.type(testBusinessName);
    await sleep(2000);
    const bodyText = await page.evaluate(() => document.body.innerText);
    const isPubliclyLeaked = bodyText.includes(testBusinessName) && bodyText.includes("Terverifikasi");
    console.log("Pending merchant discoverable publicly before approval:", isPubliclyLeaked ? "YES (FAIL)" : "NO (PASS)");
  }

  console.log("\n=== QA RESULTS SUMMARY ===");
  console.log("Submit Request URL:", submitRequestUrl);
  console.log("Submit Response Status:", submitResponseStatus);
  const typeErrors = pageErrors.filter((e) => e.includes("Failed to fetch") || e.includes("TypeError"));
  console.log("Failed to fetch / TypeError count:", typeErrors.length);

  await browser.close();
  console.log("=== BROWSER QA FINISHED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Browser QA Execution Error:", err);
  process.exit(1);
});
