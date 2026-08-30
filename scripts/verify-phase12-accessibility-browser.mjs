import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const evidenceDir = path.resolve("docs/refinement/data-architecture/phase-12/browser-evidence");
const chromePath = process.env.GETRA_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const forbiddenTerms = [
  "x-api-key",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MAPID_API_KEY",
  "/web/competition/",
  "raw_payload",
];

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
    accessibility: {},
    security: {},
  };
  const responseTasks = [];

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
        evidence.failed_requests.push({
          error: request.failure()?.errorText,
          url: sanitizeUrl(request.url()),
        });
      }
    });
    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/accessibility/") || url.includes("/api/internal/routing/") || url.includes("/api/routing")) {
        responseTasks.push(
          response.text().catch(() => "").then((text) => {
            evidence.api.push({
              endpoint: sanitizeEndpoint(url),
              method: response.request().method(),
              safe: !forbiddenTerms.some((term) => text.includes(term)),
              status: response.status(),
            });
          }),
        );
      }
    });

    await login(page);
    await page.waitForSelector(".map-canvas canvas", { timeout: 45_000 });
    await page.waitForSelector(".primary-map-mode", { timeout: 45_000 });

    await page.evaluate(() => {
      [...document.querySelectorAll(".primary-map-mode__button")]
        .find((button) => button.textContent?.trim() === "Accessibility")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await page.waitForSelector(".accessibility-search-panel", { timeout: 20_000 });
    await page.waitForFunction(
      () => document.querySelector(".accessibility-summary, .accessibility-result-row, .accessibility-search-panel .route-message--error"),
      { timeout: 45_000 },
    );

    await page.evaluate(() => {
      const categorySelect = [...document.querySelectorAll(".accessibility-search-panel select")][1];
      if (categorySelect instanceof HTMLSelectElement) {
        categorySelect.value = "";
        categorySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await page.evaluate(() => {
      [...document.querySelectorAll(".accessibility-search-panel button")]
        .find((button) => button.textContent?.includes("Terapkan filter"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForFunction(
      () => document.querySelector(".accessibility-summary, .accessibility-result-row, .accessibility-search-panel .route-message--error"),
      { timeout: 45_000 },
    );
    await Promise.allSettled(responseTasks);

    const rows = await page.$$(".accessibility-result-row");
    if (rows[0]) {
      const detailResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/accessibility/evidence/MAPID_ACTIVITY") &&
          response.request().method() === "GET",
        { timeout: 60_000 },
      ).catch(() => null);
      await rows[0].click();
      await page.waitForSelector(".right-panel .detail-title", { timeout: 20_000 });
      await detailResponse;
    }

    await page.screenshot({
      fullPage: true,
      path: path.join(evidenceDir, "accessibility-foundation-flow.png"),
    });

    evidence.accessibility = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const shell = document.querySelector(".map-shell");
      return {
        entry_visible: [...document.querySelectorAll(".primary-map-mode__button")]
          .some((button) => button.textContent?.trim() === "Accessibility"),
        panel_visible: Boolean(document.querySelector(".accessibility-search-panel")),
        source_filter_visible: text.includes("mapid activities") && text.includes("getra community"),
        category_filter_visible: text.includes("aksesibilitas") && text.includes("pedestrian"),
        status_filter_visible: text.includes("perlu verifikasi") && text.includes("terkonfirmasi"),
        summary_visible: Boolean(document.querySelector(".accessibility-summary")),
        result_rows: document.querySelectorAll(".accessibility-result-row").length,
        map_evidence_count: Number(shell?.getAttribute("data-accessibility-evidence-count") ?? 0),
        detail_visible: text.includes("observasi aksesibilitas") || text.includes("hubungan jaringan kandidat"),
        no_current_condition_overclaim: !/area ini aksesibel|jalan tidak bisa dilewati|rute ini berbahaya|harus dihindari/.test(text),
        no_route_penalty_copy: text.includes("bukan routing penalty") || text.includes("tidak mengubah biaya pgrouting"),
      };
    });

    evidence.security = {
      browser_called_getra_accessibility_api: evidence.api.some((item) => item.endpoint.startsWith("/api/accessibility/")),
      browser_called_mapid_mission: evidence.browser_requests.some((url) => url.includes("/web/competition/")),
      response_safe: evidence.api.every((item) => item.safe),
      route_api_seen: evidence.api.some((item) => item.endpoint.includes("/api/routing") || item.endpoint.includes("/api/internal/routing")),
      route_api_not_required_for_accessibility: !evidence.api.some((item) => item.endpoint.includes("accessibility") && item.endpoint.includes("routing")),
    };
  } finally {
    await writeFile(
      path.join(evidenceDir, "phase12-accessibility-foundation-evidence.json"),
      JSON.stringify(evidence, null, 2),
    );
    await browser.close().catch(() => undefined);
  }

  console.log(JSON.stringify({
    accessibility: evidence.accessibility,
    api: evidence.api,
    evidence: path.join(evidenceDir, "phase12-accessibility-foundation-evidence.json"),
    failed_requests: evidence.failed_requests.length,
    security: evidence.security,
  }, null, 2));
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
