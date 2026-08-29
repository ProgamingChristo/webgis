import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.GETRA_API_URL || "http://localhost:8080";
const chromePath = process.env.GETRA_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const evidenceDir = path.resolve("docs/refinement/data-architecture/phase-12/browser-evidence");
const forbiddenTerms = ["x-api-key", "SUPABASE_SERVICE_ROLE_KEY", "MAPID_API_KEY", "/web/competition/"];

async function login(page) {
  await page.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator("#email").fill(process.env.GETRA_TEST_USER_EMAIL || "getra.admin.test@example.com");
  await page.locator("#password").fill(process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!");
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }),
    page.locator("button[type=submit]").click(),
  ]);
  await page.waitForFunction(() => location.pathname === "/app", { timeout: 30_000 });
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox", "--disable-setuid-sandbox"],
  });

  const evidence = {
    generated_at: new Date().toISOString(),
    api: [],
    browser_requests: [],
    console_errors: [],
    failed_requests: [],
    property: {},
    merchant_media: {},
    security: {},
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    page.on("console", (message) => {
      if (message.type() === "error") evidence.console_errors.push(message.text());
    });
    page.on("pageerror", (error) => evidence.console_errors.push(error.message));
    page.on("request", (request) => evidence.browser_requests.push(sanitizeUrl(request.url())));
    page.on("requestfailed", (request) => {
      if (request.failure()?.errorText !== "net::ERR_ABORTED") {
        evidence.failed_requests.push({ url: sanitizeUrl(request.url()), error: request.failure()?.errorText });
      }
    });
    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api/business-space/") || url.includes("/api/merchants/canonical")) {
        const text = await response.text().catch(() => "");
        evidence.api.push({
          endpoint: sanitizeEndpoint(url),
          method: response.request().method(),
          status: response.status(),
          bytes: Buffer.byteLength(text),
          safe: !forbiddenTerms.some((term) => text.includes(term)),
        });
      }
    });

    await login(page);
    await page.waitForSelector(".map-canvas canvas", { timeout: 45_000 });
    await page.waitForSelector(".primary-map-mode", { timeout: 45_000 });

    await page.evaluate(() => {
      [...document.querySelectorAll(".primary-map-mode__button")]
        .find((button) => button.textContent?.includes("Business Space"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForSelector(".property-search-panel", { timeout: 20_000 });
    await page.locator(".property-search-panel input[type='search']").fill("ruko");
    await selectByText(page, ".property-filter-grid select", "Jakarta Selatan", 0);
    await selectByText(page, ".property-filter-grid select", "Disewa", 2);
    await page.locator(".property-filter-grid input").fill("ruko");
    await page.evaluate(() => {
      [...document.querySelectorAll(".property-search-button")]
        .find((button) => button.textContent?.includes("Cari Properti"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForFunction(() => Number(document.querySelector(".map-shell")?.getAttribute("data-property-count") ?? 0) > 0, { timeout: 45_000 });
    await page.waitForSelector(".property-result-row, .empty-state", { timeout: 45_000 });
    const propertyRows = await page.$$(".property-result-row");
    if (propertyRows[0]) {
      await propertyRows[0].click();
      await page.waitForSelector(".detail-title .source-stamp", { timeout: 20_000 });
      await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("property observation detail"), { timeout: 20_000 });
    }
    await page.screenshot({ path: path.join(evidenceDir, "property-business-space-flow.png"), fullPage: true });
    evidence.property = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const shell = document.querySelector(".map-shell");
      return {
        entry_visible: Boolean(document.querySelector(".primary-map-mode__button")),
        search_visible: Boolean(document.querySelector(".property-search-panel input[type='search']")),
        region_filter_visible: [...document.querySelectorAll(".property-filter-grid label")].some((label) => label.textContent?.includes("Wilayah")),
        transaction_filter_visible: [...document.querySelectorAll(".property-filter-grid label")].some((label) => label.textContent?.includes("Jenis")),
        category_filter_visible: [...document.querySelectorAll(".property-filter-grid label")].some((label) => label.textContent?.includes("Kategori Properti")),
        result_rows: document.querySelectorAll(".property-result-row").length,
        map_property_count: Number(shell?.getAttribute("data-property-count") ?? 0),
        detail_source_specific: text.includes("property observation detail") && text.includes("properti go"),
        has_analysis_cta: text.includes("analisis lokasi usaha"),
        no_availability_overclaim: !/available now|tersedia sekarang|still for rent|still for sale/.test(text),
      };
    });

    await page.evaluate(() => {
      [...document.querySelectorAll(".primary-map-mode__button")]
        .find((button) => button.textContent?.trim() === "Merchant")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForSelector("#global-search-query", { timeout: 20_000 });
    const targetMerchant = await page.evaluate(async (baseUrl) => {
      let token = null;
      for (const key of Object.keys(localStorage)) {
        try {
          const value = JSON.parse(localStorage.getItem(key) ?? "null");
          token = value?.access_token ?? value?.currentSession?.access_token ?? null;
          if (token) break;
        } catch {
          // Ignore unrelated localStorage values.
        }
      }
      const params = new URLSearchParams({
        west: "106.68",
        south: "-6.38",
        east: "107.05",
        north: "-6.05",
        limit: "100",
        offset: "0",
      });
      const response = await fetch(`${baseUrl}/api/merchants/canonical?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await response.json();
      const merchants = body.data?.merchants ?? [];
      return merchants.find((merchant) =>
        (merchant.sources?.includes("MENU_GO") || String(merchant.source).includes("MENU_GO")) &&
        (merchant.photo || merchant.menuPhotos?.length || merchant.menu || merchant.observedPrice)
      ) ?? merchants.find((merchant) =>
        merchant.sources?.includes("MENU_GO") || String(merchant.source).includes("MENU_GO")
      ) ?? null;
    }, apiUrl);
    if (targetMerchant?.name) {
      if (targetMerchant.city) {
        await page.waitForFunction((city) => {
          return [...document.querySelectorAll(".global-search__region-option")]
            .some((label) => label.textContent?.toLowerCase().includes(String(city).toLowerCase()));
        }, { timeout: 45_000 }, targetMerchant.city);
        await page.evaluate((city) => {
          const option = [...document.querySelectorAll(".global-search__region-option")]
            .find((label) => label.textContent?.toLowerCase().includes(String(city).toLowerCase()));
          const input = option?.querySelector("input");
          if (input instanceof HTMLInputElement && !input.checked) {
            input.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          }
        }, targetMerchant.city);
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      await page.locator("#global-search-query").fill(targetMerchant.name);
      await page.keyboard.press("Enter");
      await page.waitForFunction((name) => {
        return [...document.querySelectorAll(".result-row:not(.property-result-row)")]
          .some((node) => node.textContent?.toLowerCase().includes(String(name).toLowerCase()));
      }, { timeout: 45_000 }, targetMerchant.name);
    } else {
      await page.locator("#global-search-query").fill("");
    }
    await page.waitForFunction(() => Number(document.querySelector(".map-shell")?.getAttribute("data-merchant-count") ?? 0) > 0, { timeout: 45_000 });
    const merchantRows = await page.$$(".result-row:not(.property-result-row)");
    const selectedByName = targetMerchant?.name ? await page.evaluate((name) => {
      const row = [...document.querySelectorAll(".result-row:not(.property-result-row)")]
        .find((node) => node.textContent?.toLowerCase().includes(String(name).toLowerCase()));
      if (!row) return false;
      row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return true;
    }, targetMerchant.name) : false;
    if (!selectedByName && merchantRows[0]) {
      await merchantRows[0].click();
    }
    await page.waitForSelector(".detail-title h3", { timeout: 20_000 });
    await page.screenshot({ path: path.join(evidenceDir, "merchant-menu-go-media-flow.png"), fullPage: true });
    evidence.merchant_media = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return {
        one_merchant_selection: document.querySelectorAll(".map-marker--selected").length <= 1,
        source_wording_visible: text.includes("sumber data:"),
        menu_go_provenance_visible: text.includes("menu_go") || text.includes("menu go"),
        place_photo_rendered: document.querySelectorAll(".media-gallery img[alt='Foto tempat merchant']").length > 0,
        menu_photo_rendered: document.querySelectorAll(".media-gallery img[alt^='Foto menu merchant']").length > 0,
        main_menu_visible: text.includes("menu utama"),
        observed_price_safe: text.includes("harga observasi") && !text.includes("harga saat ini"),
        no_raw_source_payload: !/raw_payload|checksum|service_role|x-api-key/.test(text),
        missing_fields_not_dash_dominated: [...document.querySelectorAll(".right-panel .evidence-list dd")]
          .every((node) => node.textContent?.trim() !== "-"),
      };
    });
    evidence.merchant_media.target = targetMerchant ? {
      has_menu_go: Boolean(targetMerchant.sources?.includes("MENU_GO") || String(targetMerchant.source).includes("MENU_GO")),
      has_place_photo_source: Boolean(targetMerchant.photo),
      has_menu_photo_source: Boolean(targetMerchant.menuPhotos?.length),
      has_main_menu_source: Boolean(targetMerchant.menu),
      has_observed_price_source: Boolean(targetMerchant.observedPrice),
    } : null;

    evidence.security = {
      browser_called_mapid_mission: evidence.browser_requests.some((url) => url.includes("/web/competition/")),
      response_safe: evidence.api.every((item) => item.safe),
      business_space_getra_api_seen: evidence.api.some((item) => item.endpoint.startsWith("/api/business-space/candidates")),
      canonical_getra_api_seen: evidence.api.some((item) => item.endpoint.startsWith("/api/merchants/canonical")),
    };
  } finally {
    await writeFile(path.join(evidenceDir, "phase12-residual-closure-evidence.json"), JSON.stringify(evidence, null, 2));
    await browser.close().catch(() => undefined);
  }

  console.log(JSON.stringify({
    evidence: path.join(evidenceDir, "phase12-residual-closure-evidence.json"),
    property: evidence.property,
    merchant_media: evidence.merchant_media,
    security: evidence.security,
    console_errors: evidence.console_errors.length,
    failed_requests: evidence.failed_requests.length,
  }, null, 2));
}

async function selectByText(page, selector, label, index = 0) {
  await page.evaluate(({ selectorValue, labelValue, indexValue }) => {
    const select = document.querySelectorAll(selectorValue)[indexValue];
    if (!(select instanceof HTMLSelectElement)) return;
    const option = [...select.options].find((item) => item.textContent?.trim() === labelValue);
    if (!option) return;
    select.value = option.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, { selectorValue: selector, labelValue: label, indexValue: index });
}

function sanitizeEndpoint(url) {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search ? "?[redacted]" : ""}`;
}

function sanitizeUrl(url) {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}${parsed.search ? "?[redacted]" : ""}`;
}

await main();
