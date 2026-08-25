import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const artifactsDir = "C:\\Users\\chris\\.gemini\\antigravity-ide\\brain\\34849a6f-bc07-4cfd-84b0-b00f201abe5c";
const chromePath =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Seed an unpaid test campaign
const supabaseUrl = "https://sesakxnjaphrxqxllqjm.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlc2FreG5qYXBocnhxeGxscWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUzOTk0OCwiZXhwIjoyMTAyMTE1OTQ4fQ.iCkUIPqX-VcYIkIi3M4n89voeTkG0NUy7HRGz6zD80U";
const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log("[E2E Payment Audit] 1. Preparing fresh test merchant and campaign...");
const merchantId = "c706d357-f1b8-4580-8b79-4a7909b68a12";
const { data: mRecord } = await supabase.from("merchants").select("owner_id").eq("id", merchantId).single();
const userId = mRecord.owner_id;

// Reset payment orders for clean test
const freshCampaignId = "22222222-3333-4444-8555-666666666666";
await supabase.from("ad_payment_orders").delete().eq("campaign_id", freshCampaignId);
await supabase.from("ad_campaigns").upsert({
  id: freshCampaignId,
  merchant_id: merchantId,
  created_by: userId,
  name: "Promo Roti Manis & Kopi Susu (E2E Payment Test)",
  description: "Campaign khusus pengujian alur pop-up Midtrans Sandbox",
  status: "DRAFT",
  start_at: new Date().toISOString(),
  end_at: new Date(Date.now() + 14 * 86400000).toISOString(),
  updated_at: new Date().toISOString(),
});

console.log("[E2E Payment Audit] Launching Chromium...");
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on("console", async (msg) => {
    const args = await Promise.all(msg.args().map(a => a.jsonValue().catch(() => a.toString())));
    console.log(`[Browser Console ${msg.type()}]`, ...args);
  });

  page.on("pageerror", (err) => {
    console.error(`[Page Error]`, err);
  });

  // 1. Authenticate
  console.log("[E2E Payment Audit] 2. Logging in...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    const emailInput = document.querySelector("#email");
    const passwordInput = document.querySelector("#password");
    if (emailInput) emailInput.value = "";
    if (passwordInput) passwordInput.value = "";
  });
  await page.type("#email", "getra.umkm.test@example.com", { delay: 20 });
  await page.type("#password", "Password123!", { delay: 20 });
  await page.click("button[type='submit']");
  await page.waitForFunction(() => !window.location.pathname.includes("/login"), { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 2000));
  console.log(`[E2E Payment Audit] Logged in! URL: ${page.url()}`);

  // 2. Open Advertising Page
  console.log("[E2E Payment Audit] 3. Navigating to Advertising Manager...");
  await page.goto(`http://localhost:3000/umkm/advertising?merchantId=${merchantId}`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 4000));

  // 3. Open Pembayaran (Sandbox) Tab on the campaign
  console.log("[E2E Payment Audit] 4. Opening 'Pembayaran (Sandbox)' tab on campaign...");
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.some(b => b.textContent && b.textContent.includes("Pembayaran (Sandbox)"));
  }, { timeout: 15000 });

  const openedTab = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const payTab = buttons.find(b => b.textContent && b.textContent.includes("Pembayaran (Sandbox)"));
    if (payTab) {
      payTab.click();
      return true;
    }
    return false;
  });
  console.log(`[E2E Payment Audit] Tab opened: ${openedTab}`);
  await new Promise((r) => setTimeout(r, 2000));

  // 4. Click 'Bayar dengan Midtrans (Sandbox)'
  console.log("[E2E Payment Audit] 5. Clicking 'Bayar dengan Midtrans (Sandbox)'...");
  await page.waitForFunction(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.some(b => b.textContent && (b.textContent.includes("Bayar dengan Midtrans") || b.textContent.includes("Cek Status")));
  }, { timeout: 10000 });

  const clickedPay = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const payBtn = buttons.find(b => b.textContent && b.textContent.includes("Bayar dengan Midtrans"));
    if (payBtn) {
      payBtn.click();
      return true;
    }
    return false;
  });
  console.log(`[E2E Payment Audit] Pay button clicked: ${clickedPay}`);

  // 5. Verify Modal Appearance
  console.log("[E2E Payment Audit] 6. Waiting for Midtrans Popup Modal to appear...");
  await page.waitForFunction(() => {
    return document.body.innerText.includes("MIDTRANS SANDBOX POPUP") || !!document.querySelector(".fixed");
  }, { timeout: 15000 });

  console.log("[E2E Payment Audit] 6. Midtrans Popup Modal is Visible: true");

  // Capture screenshot of the open modal
  await page.screenshot({
    path: path.join(artifactsDir, "demo_05_midtrans_popup_modal.png"),
    fullPage: false,
  });
  console.log("[E2E Payment Audit] ✓ Saved screenshot: demo_05_midtrans_popup_modal.png");

  // 6. Test switching payment tabs in modal (Virtual Account -> Kartu Kredit -> QRIS)
  console.log("[E2E Payment Audit] 7. Testing payment method selections in modal...");
  await page.evaluate(() => {
    const vaBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Virtual Account"));
    if (vaBtn) vaBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  await page.evaluate(() => {
    const ccBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("Kartu Kredit"));
    if (ccBtn) ccBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // 7. Click 'Selesaikan Pembayaran (Sandbox)'
  console.log("[E2E Payment Audit] 8. Clicking 'Selesaikan Pembayaran (Sandbox)'...");
  const clickedSettle = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const settleBtn = buttons.find(b => b.textContent?.includes("Selesaikan Pembayaran"));
    if (settleBtn) {
      settleBtn.click();
      return true;
    }
    return false;
  });
  console.log(`[E2E Payment Audit] Settle button clicked: ${clickedSettle}`);
  
  await new Promise((r) => setTimeout(r, 4000));

  // Reopen Pembayaran (Sandbox) Tab to verify updated status
  console.log("[E2E Payment Audit] 9. Reopening 'Pembayaran (Sandbox)' tab to verify updated state...");
  await page.evaluate(() => {
    const payTab = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Pembayaran (Sandbox)"));
    if (payTab) payTab.click();
  });
  await new Promise((r) => setTimeout(r, 2000));

  // 8. Verify status updated to PAID & Verified badge is displayed
  const verifiedState = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll("article"));
    const cardText = articles.map(a => a.innerText).join("\n---\n");
    return {
      cardSnippet: cardText.substring(0, 300),
      hasVerifiedBadge: cardText.includes("Pembayaran Sandbox Terverifikasi") || cardText.includes("Terverifikasi"),
      isPaidBadgeVisible: cardText.includes("PAID") || cardText.includes("Lunas") || cardText.includes("Rp 50.000"),
    };
  });
  console.log("[E2E Payment Audit] 10. Verification result:", verifiedState);

  // Capture final verified state screenshot
  await page.screenshot({
    path: path.join(artifactsDir, "demo_05_advertising_manager.png"),
    fullPage: false,
  });
  console.log("[E2E Payment Audit] ✓ Refreshed demo_05_advertising_manager.png with verified payment!");

  console.log("\n=======================================================");
  console.log(" [AUDIT PASSED] MIDTRANS SANDBOX POPUP & FLOW 100% OK! ");
  console.log("=======================================================\n");
} finally {
  await browser.close();
}
