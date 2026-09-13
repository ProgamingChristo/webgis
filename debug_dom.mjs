import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});

const page = await browser.newPage();
page.on("requestfailed", (r) => console.log("REQUEST FAILED:", r.method(), r.url(), r.failure()?.errorText));
page.on("response", (r) => {
  if (r.status() >= 400) {
    console.log("BAD RESPONSE:", r.status(), r.request().method(), r.url());
  }
});

await page.goto("http://localhost:3100/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "getra.admin.test@example.com");
await page.type('input[type="password"]', "PasswordDevelopment123!");
await page.click('button[type="submit"]');
await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});

console.log("Logged in, going to UMKM profile...");
await page.goto("http://localhost:3100/umkm?merchantId=4efeb68e-d212-433d-b5d7-fcc969ec4732&view=profile#usaha-saya", { waitUntil: "networkidle2" });

console.log("Waiting for #profile-hero...");
await page.waitForSelector("#profile-hero", { timeout: 15000 });
console.log("SUCCESS! #profile-hero found!");

const res = await page.evaluate(() => {
  return {
    hero: !!document.querySelector("#profile-hero"),
    identity: !!document.querySelector("#profile-identity"),
    location: !!document.querySelector("#profile-location"),
    hours: !!document.querySelector("#profile-hours"),
    facilities: !!document.querySelector("#profile-facilities"),
    menu: !!document.querySelector("#profile-menu"),
    legality: !!document.querySelector("#profile-legality"),
  };
});

console.log("ALL SELECTORS CHECK:", JSON.stringify(res, null, 2));
await browser.close();
