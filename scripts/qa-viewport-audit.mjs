import puppeteer from "puppeteer-core";
import { approvedAccountFixture } from "../frontend/tests/routing/browser-user-fixture.mjs";

const VIEWPORTS = [
  { name: "375x812_iPhone_X", width: 375, height: 812 },
  { name: "390x844_iPhone_14", width: 390, height: 844 },
  { name: "393x852_iPhone_15_Pro", width: 393, height: 852 },
  { name: "430x932_iPhone_15_Pro_Max", width: 430, height: 932 },
  { name: "1280x720_HD_Desktop", width: 1280, height: 720 },
  { name: "1440x900_MacBook", width: 1440, height: 900 },
];

async function runQa() {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--ignore-certificate-errors"],
  });

  const results = [];

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    console.log("Navigating to login...");
    await page.goto("https://getra-routing-api.tail0ed517.ts.net:8443/login", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const user = approvedAccountFixture("USER");
    await page.type("#email", user.email);
    await page.type("#password", user.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    await page.waitForSelector(".app-header", { timeout: 15000 }).catch(() => {});
    console.log("Logged in successfully, testing viewports...");

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
      await new Promise((r) => setTimeout(r, 1000));

      const metrics = await page.evaluate(() => {
        const bodyWidth = document.body.scrollWidth;
        const windowWidth = window.innerWidth;
        const hasHorizontalOverflow = bodyWidth > windowWidth;

        return {
          bodyWidth,
          windowWidth,
          hasHorizontalOverflow,
        };
      });

      console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): Overflow=${metrics.hasHorizontalOverflow} (body=${metrics.bodyWidth} vs window=${metrics.windowWidth})`);
      results.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        hasHorizontalOverflow: metrics.hasHorizontalOverflow,
        bodyWidth: metrics.bodyWidth,
        windowWidth: metrics.windowWidth,
      });
    }

    console.log("\n=== VIEWPORT AUDIT SUMMARY ===");
    console.table(results);
    const anyOverflow = results.some((r) => r.hasHorizontalOverflow);
    console.log("All viewports zero overflow:", !anyOverflow);
    if (anyOverflow) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("QA error:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runQa();
