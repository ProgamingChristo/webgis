import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.GETRA_API_URL || "http://localhost:8080";
const chromePath = process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const password = process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";
const userEmail = process.env.GETRA_USER_TEST_EMAIL || "getra.commuter.test@example.com";
const evidenceDir = path.resolve(
  "docs/refinement/data-architecture/phase-05/browser-evidence",
);
const endpoint = `${apiUrl}/api/merchants/canonical`;
const forbidden = ["x-api-key", "MAPID_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "/web/competition/"];

async function login(page) {
  await page.goto(`${appUrl}/login`, { waitUntil: "networkidle2", timeout: 45_000 });
  await page.locator("#email").fill(userEmail);
  await page.locator("#password").fill(password);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }),
    page.locator("button[type=submit]").click(),
  ]);
  await page.waitForFunction(() => location.pathname === "/app", { timeout: 30_000 });
}

async function responseSummary(response, startedAt) {
  const text = await response.text();
  const body = JSON.parse(text);
  const data = body.data ?? {};
  const merchantIds = (data.merchants ?? []).map((merchant) => merchant.id);
  const resultRegionIds = [...new Set(
    (data.merchants ?? []).flatMap((merchant) => merchant.regionIds ?? []),
  )];
  return {
    duration_ms: Date.now() - startedAt,
    status: response.status(),
    request_url: response.url(),
    payload_bytes: Buffer.byteLength(text),
    safe_body: !forbidden.some((term) => text.includes(term)),
    total: data.total_available,
    returned: data.total_features,
    intent: data.intent,
    unique_merchant_count: new Set(merchantIds).size,
    result_region_ids: resultRegionIds,
  };
}

async function submitQuery(page, value) {
  const input = page.locator("#global-search-query");
  await input.fill(value);
  const startedAt = Date.now();
  const responsePromise = page.waitForResponse(
    (response) => response.url().startsWith(`${endpoint}?`) &&
      response.request().method() === "GET",
    { timeout: 45_000 },
  );
  await page.locator(".global-search__submit").click();
  return responseSummary(await responsePromise, startedAt);
}

async function toggleRegion(page, name) {
  const startedAt = Date.now();
  const responsePromise = page.waitForResponse(
    (response) => response.url().startsWith(`${endpoint}?`) &&
      response.request().method() === "GET",
    { timeout: 45_000 },
  );
  const clicked = await page.evaluate((regionName) => {
    const label = [...document.querySelectorAll(".global-search__region-option")]
      .find((element) => element.textContent?.trim() === regionName);
    const input = label?.querySelector("input");
    if (!(input instanceof HTMLInputElement)) return false;
    input.click();
    return true;
  }, name);
  if (!clicked) throw new Error(`Region control not found: ${name}`);
  return responseSummary(await responsePromise, startedAt);
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--disable-gpu", "--disable-dev-shm-usage"],
  });
  const evidence = {
    generated_at: new Date().toISOString(),
    browser: "Chrome headless via puppeteer-core",
    console_errors: [],
    failed_requests: [],
    flows: {},
    responsive: {},
    security: {},
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    const allRequestUrls = [];
    page.on("console", (message) => {
      if (message.type() === "error") evidence.console_errors.push(message.text());
    });
    page.on("pageerror", (error) => evidence.console_errors.push(error.message));
    page.on("request", (request) => allRequestUrls.push(request.url()));
    page.on("requestfailed", (request) => {
      if (request.url().startsWith(endpoint) && request.failure()?.errorText !== "net::ERR_ABORTED") {
        evidence.failed_requests.push({ url: request.url(), error: request.failure()?.errorText });
      }
    });

    const initialStartedAt = Date.now();
    const initialResponsePromise = page.waitForResponse(
      (response) => response.url().startsWith(`${endpoint}?`) &&
        response.request().method() === "GET",
      { timeout: 60_000 },
    );
    await login(page);
    evidence.flows.initial_viewport = await responseSummary(
      await initialResponsePromise,
      initialStartedAt,
    );
    console.log("[Phase 05 E2E] initial viewport");
    await page.waitForSelector("#global-search-query", { timeout: 30_000 });

    evidence.flows.keyword_current_viewport = await submitQuery(page, "bakso");
    console.log("[Phase 05 E2E] keyword");
    evidence.flows.location_only = await submitQuery(page, "Jakarta Selatan");
    console.log("[Phase 05 E2E] location");
    evidence.flows.keyword_location = await submitQuery(page, "bakso Jakarta Selatan");
    console.log("[Phase 05 E2E] keyword + location");
    evidence.flows.keyword_other_location = await submitQuery(page, "soto Jakarta Barat");
    console.log("[Phase 05 E2E] other location");

    await page.locator("#global-search-query").fill("bakso");
    await new Promise((resolve) => setTimeout(resolve, 100));
    await toggleRegion(page, "Jakarta Selatan");
    evidence.flows.multi_region = await toggleRegion(page, "Jakarta Timur");
    console.log("[Phase 05 E2E] multi-region");

    const canvas = await page.$(".map-canvas canvas");
    const box = await canvas?.boundingBox();
    if (!box) throw new Error("MapLibre canvas unavailable");
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.52);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.38, box.y + box.height * 0.52, { steps: 10 });
    await page.mouse.up();
    await page.waitForFunction(
      () => [...document.querySelectorAll("button")]
        .some((button) => button.textContent?.trim() === "Cari di area ini"),
      { timeout: 20_000 },
    );
    const areaStartedAt = Date.now();
    const areaResponsePromise = page.waitForResponse(
      (response) => response.url().startsWith(`${endpoint}?`) &&
        response.request().method() === "GET",
      { timeout: 45_000 },
    );
    await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")]
        .find((item) => item.textContent?.trim() === "Cari di area ini");
      if (!(button instanceof HTMLButtonElement)) throw new Error("Search area button unavailable");
      button.click();
    });
    evidence.flows.search_this_area = await responseSummary(
      await areaResponsePromise,
      areaStartedAt,
    );
    console.log("[Phase 05 E2E] search this area");

    evidence.flows.empty_result = await submitQuery(page, "nonexistentmerchantxyz");
    console.log("[Phase 05 E2E] empty result");
    await page.waitForFunction(
      () => document.querySelector(".empty-state")?.textContent?.includes("tidak ditemukan"),
      { timeout: 15_000 },
    );

    const latestResponsePromise = page.waitForResponse(
      (response) => response.url().startsWith(`${endpoint}?`) &&
        new URL(response.url()).searchParams.get("q") === "soto",
      { timeout: 45_000 },
    );
    for (const term of ["bakso", "mie ayam", "soto"]) {
      await page.locator("#global-search-query").fill(term);
      await page.locator(".global-search__submit").click();
    }
    try {
      evidence.flows.stale_final = await responseSummary(
        await latestResponsePromise,
        Date.now(),
      );
    } catch {
      evidence.flows.stale_aborted_response_observed = true;
      evidence.flows.stale_final = await submitQuery(page, "soto");
    }
    console.log("[Phase 05 E2E] stale requests");
    evidence.flows.stale_visible_query = await page.$eval(
      "#global-search-query",
      (input) => input.value,
    );

    await page.locator("#global-search-query").fill("bakso");
    await new Promise((resolve) => setTimeout(resolve, 100));
    const keyboardStartedAt = Date.now();
    const keyboardResponsePromise = page.waitForResponse(
      (response) => response.url().startsWith(`${endpoint}?`) &&
        response.request().method() === "GET" &&
        new URL(response.url()).searchParams.get("q") === "bakso",
      { timeout: 45_000 },
    );
    await page.focus("#global-search-query");
    await page.keyboard.press("Enter");
    evidence.flows.keyboard_submit = await responseSummary(
      await keyboardResponsePromise,
      keyboardStartedAt,
    );
    console.log("[Phase 05 E2E] keyboard submit");

    evidence.flows.manual_filter = await page.evaluate(() => {
      const label = [...document.querySelectorAll("label")]
        .find((item) => item.textContent?.includes("Hanya status buka terverifikasi"));
      const input = label?.querySelector("input");
      return {
        available: input instanceof HTMLInputElement,
        type: input instanceof HTMLInputElement ? input.type : null,
      };
    });

    const clearStartedAt = Date.now();
    const clearResponsePromise = page.waitForResponse(
      (response) => response.url().startsWith(`${endpoint}?`) &&
        response.request().method() === "GET" &&
        new URL(response.url()).searchParams.get("q") === "",
      { timeout: 45_000 },
    );
    await page.locator(".global-search__icon-button").click();
    evidence.flows.clear_search = await responseSummary(
      await clearResponsePromise,
      clearStartedAt,
    );
    console.log("[Phase 05 E2E] clear search");

    const invalidLocation = await page.evaluate(async (baseUrl) => {
      let token = null;
      for (const key of Object.keys(localStorage)) {
        try {
          const value = JSON.parse(localStorage.getItem(key) ?? "null");
          token = value?.access_token ?? value?.currentSession?.access_token ?? null;
          if (token) break;
        } catch {
          // Ignore unrelated browser storage.
        }
      }
      const params = new URLSearchParams({
        q: "bakso",
        location_text: "Atlantis",
        scope: "REGION",
        west: "106.7",
        south: "-6.3",
        east: "106.9",
        north: "-6.1",
      });
      const response = await fetch(`${baseUrl}/api/merchants/canonical?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { status: response.status, body: await response.text() };
    }, apiUrl);
    evidence.flows.invalid_location = {
      status: invalidLocation.status,
      safe_body: !forbidden.some((term) => invalidLocation.body.includes(term)),
    };
    evidence.expected_validation_console_errors = evidence.console_errors.filter(
      (message) => message.includes("status of 400"),
    ).length;
    evidence.console_errors = evidence.console_errors.filter(
      (message) => !message.includes("status of 400"),
    );

    const sizes = [
      [390, 844],
      [768, 1024],
      [1366, 768],
      [1440, 900],
    ];
    for (const [width, height] of sizes) {
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width <= 390 });
      await page.waitForSelector(".global-search", { visible: true, timeout: 45_000 });
      await page.waitForSelector(".map-canvas canvas", { timeout: 45_000 });
      await page.evaluate(() => document.querySelector(".global-search")?.scrollIntoView());
      await new Promise((resolve) => setTimeout(resolve, 300));
      const key = `${width}x${height}`;
      evidence.responsive[key] = await page.evaluate(() => {
        const search = document.querySelector(".global-search");
        const canvas = document.querySelector(".map-canvas canvas");
        const searchRect = search?.getBoundingClientRect();
        return {
          horizontal_overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
          search_visible: Boolean(searchRect && searchRect.width > 0 && searchRect.height > 0),
          search_within_viewport_width: Boolean(
            searchRect && searchRect.left >= 0 && searchRect.right <= window.innerWidth + 1,
          ),
          map_canvas_present: Boolean(canvas),
        };
      });
      await page.screenshot({
        path: path.join(evidenceDir, `global-search-${key}.png`),
        fullPage: false,
      });
    }

    const allFlows = Object.values(evidence.flows).filter((flow) => flow?.request_url);
    evidence.security = {
      all_responses_safe: allFlows.every((flow) => flow.safe_body),
      browser_called_mapid_mission: allRequestUrls.some((url) => url.includes("/web/competition/")),
      whole_jakarta_default_found: !new URL(
        evidence.flows.initial_viewport.request_url,
      ).searchParams.has("west"),
      canonical_ids_deduplicated: allFlows.every((flow) =>
        flow.unique_merchant_count === flow.returned
      ),
    };

    const keywordLocation = evidence.flows.keyword_location.intent;
    const multi = evidence.flows.multi_region.intent;
    const searchArea = evidence.flows.search_this_area.intent;
    if (evidence.flows.initial_viewport.intent.scope.type !== "CURRENT_VIEWPORT") {
      throw new Error("Initial viewport scope failed");
    }
    if (
      keywordLocation.keyword !== "bakso" ||
      keywordLocation.scope.region_ids[0] !== "jakarta-selatan"
    ) throw new Error("Keyword + location override failed");
    if (multi.scope.type !== "MULTI_REGION" || multi.scope.region_ids.length !== 3) {
      throw new Error("Multi-region contract failed");
    }
    if (searchArea.scope.type !== "CURRENT_VIEWPORT" || searchArea.keyword !== "bakso") {
      throw new Error("Search-this-area transition failed");
    }
    if (evidence.flows.empty_result.total !== 0) throw new Error("Empty state query failed");
    if (evidence.flows.stale_visible_query !== "soto") throw new Error("Stale request protection failed");
    if (evidence.flows.keyboard_submit.intent.keyword !== "bakso") {
      throw new Error("Keyboard submit failed");
    }
    if (
      evidence.flows.clear_search.intent.keyword !== null ||
      evidence.flows.clear_search.intent.scope.type !== "CURRENT_VIEWPORT"
    ) throw new Error("Clear-search behavior failed");
    if (!evidence.flows.manual_filter.available) throw new Error("Manual filter unavailable");
    if (evidence.flows.invalid_location.status !== 400) throw new Error("Invalid location was accepted");
    if (evidence.console_errors.length || evidence.failed_requests.length) {
      console.log(JSON.stringify({
        console_errors: evidence.console_errors,
        failed_requests: evidence.failed_requests,
      }, null, 2));
      throw new Error("Browser console/network errors detected");
    }
    if (
      !evidence.security.all_responses_safe ||
      evidence.security.browser_called_mapid_mission ||
      evidence.security.whole_jakarta_default_found ||
      !evidence.security.canonical_ids_deduplicated
    ) throw new Error("Browser security/network contract failed");
    if (Object.values(evidence.responsive).some((item) =>
      item.horizontal_overflow || !item.search_visible ||
      !item.search_within_viewport_width || !item.map_canvas_present
    )) {
      console.log(JSON.stringify({ responsive: evidence.responsive }, null, 2));
      throw new Error("Responsive verification failed");
    }

    await writeFile(
      path.join(evidenceDir, "runtime-evidence.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
}

await main();
