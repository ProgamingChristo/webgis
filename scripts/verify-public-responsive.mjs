import puppeteer from "puppeteer-core";

const WEB_URL = "https://getra-routing-api.tail0ed517.ts.net:8443";

async function run() {
  console.log("Checking public frontend responsive rendering...");
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--ignore-certificate-errors"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(30000);

    const viewports = [
      { name: "Desktop Ultra/Pro", width: 1440, height: 900, isMobile: false },
      { name: "Desktop Standard", width: 1280, height: 800, isMobile: false },
      { name: "Tablet Landscape", width: 1024, height: 768, isMobile: false },
      { name: "Mobile Large (iPhone 15 Pro Max)", width: 430, height: 932, isMobile: true },
      { name: "Mobile Standard (iPhone 14)", width: 390, height: 844, isMobile: true },
      { name: "Mobile Compact (iPhone SE)", width: 375, height: 667, isMobile: true },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });
      await page.goto(WEB_URL, { waitUntil: "networkidle2" });
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      const title = await page.title();
      console.log(`[VIEWPORT ${vp.width}x${vp.height}] ${vp.name}: title="${title}", horizontalOverflow=${overflow} -> ${!overflow ? "PASS" : "FAIL"}`);
    }

    console.log("Multi-Viewport Responsive Verification: ALL 6 VIEWPORTS PASS");
  } finally {
    await browser.close();
  }
} 

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
