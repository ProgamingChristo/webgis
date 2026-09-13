import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  args: ["--no-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200 });

page.on("console", (m) => console.log("BROWSER CONSOLE:", m.text()));
page.on("pageerror", (e) => console.log("BROWSER ERROR:", e.message));
page.on("requestfailed", (r) => console.log("REQUEST FAILED:", r.method(), r.url(), r.failure()?.errorText));
page.on("response", (r) => {
  if (r.url().includes("/profile")) {
    console.log("PROFILE RESPONSE:", r.status(), r.request().method(), r.url());
  }
});

await page.goto("http://localhost:3100/login", { waitUntil: "networkidle2" });
await page.type('input[type="email"]', "getra.admin.test@example.com");
await page.type('input[type="password"]', "PasswordDevelopment123!");
await page.click('button[type="submit"]');
await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});

console.log("Logged in, navigating to profile...");
await page.goto("http://localhost:3100/umkm?merchantId=4efeb68e-d212-433d-b5d7-fcc969ec4732&view=profile#usaha-saya", { waitUntil: "networkidle2" });
await page.waitForSelector("#profile-hero", { timeout: 15000 });
console.log("Profile loaded. Checking dirty state before edit...");

// Find a facility button
const clicked = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const chip = buttons.find((b) => b.textContent?.includes("Wi-Fi Cepat"));
  if (chip) {
    chip.click();
    return true;
  }
  return false;
});
console.log("Clicked Wi-Fi Cepat chip:", clicked);

await new Promise((r) => setTimeout(r, 1000));

// Check if Save button is enabled
const saveBtnState = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const saveBtn = buttons.find((b) =>
    b.textContent?.includes("Simpan & Terapkan") ||
    b.textContent?.includes("Simpan Perubahan")
  );
  return {
    found: !!saveBtn,
    text: saveBtn?.textContent?.trim(),
    disabled: saveBtn?.disabled,
  };
});
console.log("Save button state:", saveBtnState);

// Click save button
await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const saveBtn = buttons.find((b) =>
    b.textContent?.includes("Simpan & Terapkan") ||
    b.textContent?.includes("Simpan Perubahan")
  );
  if (saveBtn) saveBtn.click();
});

console.log("Waiting 3 seconds after save click...");
await new Promise((r) => setTimeout(r, 3000));

const statusText = await page.evaluate(() => {
  const alerts = Array.from(document.querySelectorAll('[role="status"], [role="alert"]')).map((el) => el.textContent);
  return {
    alerts,
    bodySnippet: document.body.innerText.substring(0, 400),
  };
});
console.log("STATUS AFTER SAVE:", JSON.stringify(statusText, null, 2));

await browser.close();
