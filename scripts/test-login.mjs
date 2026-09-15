import puppeteer from "puppeteer-core";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "https://getra-routing-api.tail0ed517.ts.net:8443";

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--ignore-certificate-errors"],
  });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("PAGE CONSOLE:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  console.log("Navigating to login...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#email", { timeout: 15000 });
  await page.type("#email", "qa_user_1789373472055@getra.local");
  await page.type("#password", "Password123!");
  console.log("Submitting form...");
  await page.click('button[type="submit"]');

  await new Promise((r) => setTimeout(r, 6000));
  console.log("Current URL after 6s:", page.url());
  const errMsg = await page.evaluate(() => {
    const errEl = document.querySelector('p[class*="error"]');
    return errEl ? errEl.innerText : null;
  });
  console.log("Error message displayed:", errMsg);

  await browser.close();
}

test().catch(console.error);
