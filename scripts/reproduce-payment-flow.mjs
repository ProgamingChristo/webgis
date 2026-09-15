import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

async function reproduce() {
  console.log("=== Reproducing Midtrans Payment Flow ===");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--ignore-certificate-errors",
      "--window-size=1280,800",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const networkLogs = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/") || req.url().includes("midtrans")) {
      networkLogs.push({
        type: "REQUEST",
        method: req.method(),
        url: req.url(),
        postData: req.postData() || undefined,
      });
    }
  });

  page.on("response", async (res) => {
    if (res.url().includes("/api/") || res.url().includes("midtrans")) {
      let body = "";
      try {
        body = await res.text();
      } catch (e) {
        body = "[Cannot read body]";
      }
      networkLogs.push({
        type: "RESPONSE",
        status: res.status(),
        url: res.url(),
        body: body.substring(0, 400),
      });
    }
  });

  page.on("console", (msg) => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  try {
    // 1. Login
    console.log("1. Navigating to login page...");
    await page.goto("https://getra-routing-api.tail0ed517.ts.net:8443/login", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    console.log("2. Logging in as UMKM owner...");
    await page.type('input[type="email"]', "qa_user_1789373472055@getra.local");
    await page.type('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');

    console.log("3. Waiting for auth transition...");
    await page.waitForFunction(() => !window.location.pathname.includes("/login"), { timeout: 15000 });
    console.log("3. Logged in! Current URL:", page.url());

    // 2. Go to /umkm/advertising
    console.log("4. Navigating to /umkm/advertising...");
    await page.goto("https://getra-routing-api.tail0ed517.ts.net:8443/umkm/advertising", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for data load
    await new Promise((r) => setTimeout(r, 4000));

    const pageText = await page.evaluate(() => document.body.innerText);
    console.log("5. Page text preview:\n", pageText.substring(0, 600));

    const outDir = path.resolve(process.cwd(), "outputs/midtrans-ai-final");
    fs.mkdirSync(outDir, { recursive: true });
    await page.screenshot({ path: path.join(outDir, "01-payment-before.png") });
    console.log("6. Saved initial screenshot to 01-payment-before.png");

    // Look for buttons
    const buttons = await page.$$eval("button", (btns) =>
      btns.map((b, idx) => ({ idx, text: b.innerText.trim(), disabled: b.disabled }))
    );
    console.log("7. Buttons found on page:", buttons);

    // Look for a button containing 'Bayar' or 'Promosi' or 'Simpan draf'
    const payBtn = buttons.find(
      (b) =>
        b.text.includes("Bayar dengan Midtrans") ||
        b.text.includes("Bayar") ||
        b.text.includes("Simpan draf")
    );

    if (payBtn) {
      console.log(`8. Clicking button [${payBtn.idx}]: "${payBtn.text}"...`);
      const btnEls = await page.$$("button");
      await btnEls[payBtn.idx].click();

      // Wait 5 seconds
      await new Promise((r) => setTimeout(r, 5000));

      const afterText = await page.evaluate(() => document.body.innerText);
      console.log("9. Page text after click:\n", afterText.substring(0, 800));

      await page.screenshot({ path: path.join(outDir, "02-payment-after-click.png") });
      console.log("10. Saved after-click screenshot to 02-payment-after-click.png");
    }

    console.log("\n=== Captured Network Logs ===");
    console.log(JSON.stringify(networkLogs, null, 2));

    fs.writeFileSync(
      path.join(outDir, "midtrans-network-trace.json"),
      JSON.stringify(networkLogs, null, 2)
    );
  } catch (err) {
    console.error("Error during reproduction:", err);
  } finally {
    await browser.close();
    console.log("=== Reproduction script completed ===");
  }
}

reproduce().catch(console.error);
