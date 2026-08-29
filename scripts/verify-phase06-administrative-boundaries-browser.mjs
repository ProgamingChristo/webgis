import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.GETRA_API_URL || "http://localhost:8080";
const chromePath = process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const password = process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";
const userEmail = process.env.GETRA_USER_TEST_EMAIL || "getra.commuter.test@example.com";
const merchantEndpoint = `${apiUrl}/api/merchants/canonical`;
const boundaryEndpoint = `${apiUrl}/api/regions`;
const evidenceDir = path.resolve("docs/refinement/data-architecture/phase-06/browser-evidence");
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
  await page.waitForSelector(".map-canvas canvas", { timeout: 45_000 });
}

async function readResponse(response) {
  const text = await response.text();
  return {
    status: response.status(),
    url: response.url(),
    payload_bytes: Buffer.byteLength(text),
    safe_body: !forbidden.some((term) => text.includes(term)),
    body: JSON.parse(text),
  };
}

async function submitQuery(page, query, expectBoundaryRequest = false) {
  await page.locator("#global-search-query").fill(query);
  const merchantPromise = page.waitForResponse(
    (response) => response.url().startsWith(`${merchantEndpoint}?`) && response.request().method() === "GET",
    { timeout: 45_000 },
  );
  const boundaryPromise = expectBoundaryRequest
    ? page.waitForResponse(
        (response) => response.url().startsWith(`${boundaryEndpoint}?`) && response.request().method() === "GET",
        { timeout: 45_000 },
      )
    : null;
  await page.locator(".global-search__submit").click();
  const merchant = await readResponse(await merchantPromise);
  const boundary = boundaryPromise ? await readResponse(await boundaryPromise) : null;
  return { merchant, boundary };
}

async function toggleRegion(page, regionName, expectBoundaryRequest) {
  const merchantPromise = page.waitForResponse(
    (response) => response.url().startsWith(`${merchantEndpoint}?`) && response.request().method() === "GET",
    { timeout: 45_000 },
  );
  const boundaryPromise = expectBoundaryRequest
    ? page.waitForResponse(
        (response) => response.url().startsWith(`${boundaryEndpoint}?`) && response.request().method() === "GET",
        { timeout: 45_000 },
      )
    : null;
  const clicked = await page.evaluate((name) => {
    const label = [...document.querySelectorAll(".global-search__region-option")]
      .find((element) => element.textContent?.trim() === name);
    const input = label?.querySelector("input");
    if (!(input instanceof HTMLInputElement)) return false;
    input.click();
    return true;
  }, regionName);
  if (!clicked) throw new Error(`Region control unavailable: ${regionName}`);
  const merchant = await readResponse(await merchantPromise);
  const boundary = boundaryPromise ? await readResponse(await boundaryPromise) : null;
  return { merchant, boundary };
}

async function waitForBoundaryState(page, expectedIds) {
  const expected = expectedIds.join(",");
  await page.waitForFunction((ids, count) => {
    const shell = document.querySelector(".map-shell");
    return shell?.dataset.boundaryLayersReady === "true" &&
      shell.dataset.boundaryFeatureCount === String(count) &&
      shell.dataset.boundaryRegionIds === ids;
  }, { timeout: 30_000 }, expected, expectedIds.length);
  return page.evaluate(() => {
    const shell = document.querySelector(".map-shell");
    return {
      feature_count: Number(shell?.dataset.boundaryFeatureCount ?? 0),
      region_ids: shell?.dataset.boundaryRegionIds?.split(",").filter(Boolean) ?? [],
      layers_ready: shell?.dataset.boundaryLayersReady === "true",
      camera_fit_key: Number(shell?.dataset.cameraFitKey ?? 0),
      camera_focus_bounds: shell?.dataset.cameraFocusBounds?.split(",").map(Number) ?? [],
    };
  });
}

async function removeChip(page, regionName) {
  const merchantPromise = page.waitForResponse(
    (response) => response.url().startsWith(`${merchantEndpoint}?`) && response.request().method() === "GET",
    { timeout: 45_000 },
  );
  await page.locator(`button[aria-label="Hapus wilayah ${regionName}"]`).click();
  return readResponse(await merchantPromise);
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
    flows: {},
    network: { boundary_requests: [], merchant_requests: 0 },
    responsive: {},
    accessibility: {},
    console_errors: [],
    failed_requests: [],
    security: {},
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    const requestUrls = [];
    page.on("request", (request) => requestUrls.push(request.url()));
    page.on("console", (message) => {
      if (message.type() === "error") evidence.console_errors.push(message.text());
    });
    page.on("pageerror", (error) => evidence.console_errors.push(error.message));
    page.on("requestfailed", (request) => {
      if (request.failure()?.errorText !== "net::ERR_ABORTED") {
        evidence.failed_requests.push({ url: request.url(), error: request.failure()?.errorText });
      }
    });
    page.on("response", async (response) => {
      if (response.url().startsWith(`${boundaryEndpoint}?`) && response.status() === 200) {
        const text = await response.text().catch(() => "");
        evidence.network.boundary_requests.push({
          url: response.url(),
          status: response.status(),
          payload_bytes: Buffer.byteLength(text),
          safe_body: !forbidden.some((term) => text.includes(term)),
        });
      }
      if (response.url().startsWith(`${merchantEndpoint}?`) && response.status() === 200) {
        evidence.network.merchant_requests += 1;
      }
    });

    await login(page);
    evidence.flows.initial = await waitForBoundaryState(page, []);
    if (evidence.flows.initial.feature_count !== 0) throw new Error("Boundary visible before region selection");
    console.log("[Phase 06 E2E] initial boundary state");

    const single = await submitQuery(page, "Jakarta Selatan", true);
    evidence.flows.single_region = {
      boundary: await waitForBoundaryState(page, ["jakarta-selatan"]),
      merchant_status: single.merchant.status,
      merchant_count: single.merchant.body.data.total_features,
      boundary_status: single.boundary?.status,
      boundary_feature_count: single.boundary?.body.data.feature_count,
      geometry_types: single.boundary?.body.data.feature_collection.features.map((feature) => feature.geometry.type),
    };
    console.log("[Phase 06 E2E] single region");

    const keywordRegion = await submitQuery(page, "bakso Jakarta Selatan", false);
    evidence.flows.keyword_region = {
      merchant_status: keywordRegion.merchant.status,
      keyword: keywordRegion.merchant.body.data.intent.keyword,
      regions: keywordRegion.merchant.body.data.intent.scope.region_ids,
      boundary: await waitForBoundaryState(page, ["jakarta-selatan"]),
    };

    await page.locator("#global-search-query").fill("bakso");
    const addBarat = await toggleRegion(page, "Jakarta Barat", true);
    const addTimur = await toggleRegion(page, "Jakarta Timur", true);
    const multiIds = ["jakarta-selatan", "jakarta-barat", "jakarta-timur"];
    await page.waitForFunction(() => document.querySelectorAll(".region-result-group").length === 3, { timeout: 20_000 });
    evidence.flows.multi_region = {
      boundary: await waitForBoundaryState(page, multiIds),
      merchant_status: addTimur.merchant.status,
      scope: addTimur.merchant.body.data.intent.scope.type,
      groups: await page.$$eval(".region-result-group__header h3", (nodes) => nodes.map((node) => node.textContent?.trim())),
      chips: await page.$$eval(".region-chip", (nodes) => nodes.map((node) => node.textContent?.trim())),
      new_boundary_payloads: [addBarat.boundary?.payload_bytes, addTimur.boundary?.payload_bytes],
    };
    await page.screenshot({ path: path.join(evidenceDir, "multi-region-1440x900.png"), fullPage: true });
    console.log("[Phase 06 E2E] multi-region");

    const removed = await removeChip(page, "Jakarta Timur");
    const afterRemovalIds = ["jakarta-selatan", "jakarta-barat"];
    await page.waitForFunction(() => document.querySelectorAll(".region-result-group").length === 2, { timeout: 20_000 });
    evidence.flows.remove_region = {
      merchant_status: removed.status,
      boundary: await waitForBoundaryState(page, afterRemovalIds),
      groups: await page.$$eval(".region-result-group__header h3", (nodes) => nodes.map((node) => node.textContent?.trim())),
      removed_chip_absent: await page.$('button[aria-label="Hapus wilayah Jakarta Timur"]') === null,
    };
    console.log("[Phase 06 E2E] remove region");

    const canvas = await page.$(".map-canvas canvas");
    const canvasBox = await canvas?.boundingBox();
    if (!canvasBox) throw new Error("MapLibre canvas unavailable");
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.65, canvasBox.y + canvasBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.35, canvasBox.y + canvasBox.height * 0.5, { steps: 10 });
    await page.mouse.up();
    await page.waitForSelector(".global-search__status button", { timeout: 20_000 });
    const areaPromise = page.waitForResponse(
      (response) => response.url().startsWith(`${merchantEndpoint}?`) && response.request().method() === "GET",
      { timeout: 45_000 },
    );
    await page.locator(".global-search__status button").click();
    const areaResponse = await readResponse(await areaPromise);
    evidence.flows.search_this_area = {
      status: areaResponse.status,
      keyword: areaResponse.body.data.intent.keyword,
      scope: areaResponse.body.data.intent.scope.type,
      boundary: await waitForBoundaryState(page, []),
    };
    console.log("[Phase 06 E2E] search this area");

    await page.setRequestInterception(true);
    let boundaryFailureIntercepted = false;
    const intercept = (request) => {
      if (
        request.method() === "GET" &&
        request.url().startsWith(`${boundaryEndpoint}?ids=jakarta-utara`)
      ) {
        boundaryFailureIntercepted = true;
        void request.respond({
          status: 503,
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": appUrl },
          body: JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: "Boundary wilayah tidak dapat dimuat." } }),
        });
      } else {
        void request.continue();
      }
    };
    page.on("request", intercept);
    const failedBoundary = await submitQuery(page, "Jakarta Utara", false);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const boundaryFailureUi = await page.evaluate(() => ({
      error: document.querySelector(".region-boundary-state--error")?.textContent?.trim() ?? null,
      selected: [...document.querySelectorAll(".region-chip")].map((node) => node.textContent?.trim()),
    }));
    if (!boundaryFailureUi.error) throw new Error(
      `Boundary failure was not communicated: ${JSON.stringify({ boundaryFailureIntercepted, boundaryFailureUi })}`,
    );
    evidence.flows.boundary_failure = {
      boundary_status: boundaryFailureIntercepted ? 503 : null,
      merchant_status: failedBoundary.merchant.status,
      merchant_results_remain: failedBoundary.merchant.body.data.total_features >= 0,
      safe_error_visible: boundaryFailureUi.error,
    };
    page.off("request", intercept);
    await page.setRequestInterception(false);
    console.log("[Phase 06 E2E] isolated boundary failure");

    const invalid = await page.evaluate(async (baseUrl) => {
      let token = null;
      for (const key of Object.keys(localStorage)) {
        try {
          const value = JSON.parse(localStorage.getItem(key) ?? "null");
          token = value?.access_token ?? value?.currentSession?.access_token ?? null;
          if (token) break;
        } catch {}
      }
      const response = await fetch(`${baseUrl}/api/regions?ids=invalid-region`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const text = await response.text();
      return { status: response.status, body: text };
    }, apiUrl);
    evidence.flows.invalid_region = {
      status: invalid.status,
      safe_body: !forbidden.some((term) => invalid.body.includes(term)),
    };

    await submitQuery(page, "bakso Jakarta Selatan", false);
    await page.locator("#global-search-query").fill("bakso");
    await toggleRegion(page, "Jakarta Barat", false);
    await toggleRegion(page, "Jakarta Timur", false);
    await waitForBoundaryState(page, multiIds);

    const viewports = [[390, 844], [768, 1024], [1366, 768], [1440, 900]];
    for (const [width, height] of viewports) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await new Promise((resolve) => setTimeout(resolve, 500));
      const key = `${width}x${height}`;
      evidence.responsive[key] = await page.evaluate(() => ({
        horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        chips_visible: Boolean(document.querySelector(".region-scope-summary__chips")),
        groups_visible: document.querySelectorAll(".region-result-group").length === 3,
        map_canvas_present: Boolean(document.querySelector(".map-canvas canvas")),
        boundary_count: Number(document.querySelector(".map-shell")?.dataset.boundaryFeatureCount ?? 0),
      }));
      await page.screenshot({ path: path.join(evidenceDir, `multi-region-${key}.png`), fullPage: true });
    }

    evidence.accessibility = await page.evaluate(() => ({
      textual_region_state: document.querySelector(".region-scope-summary .sr-only")?.textContent?.includes("3 wilayah dipilih") ?? false,
      labeled_remove_buttons: [...document.querySelectorAll(".region-chip button")].every((button) => Boolean(button.getAttribute("aria-label"))),
      semantic_group_headings: document.querySelectorAll(".region-result-group h3").length === 3,
      search_label: Boolean(document.querySelector('label[for="global-search-query"]')),
    }));
    evidence.security = {
      browser_called_mapid_mission: requestUrls.some((url) => url.includes("/web/competition/")),
      all_successful_boundary_responses_safe: evidence.network.boundary_requests.every((item) => item.safe_body),
      invalid_region_safe: evidence.flows.invalid_region.safe_body,
      duplicate_boundary_requests: evidence.network.boundary_requests.length !== 3,
    };

    if (evidence.flows.single_region.boundary_feature_count !== 1) throw new Error("Single-region boundary missing");
    if (!evidence.flows.single_region.geometry_types.includes("MultiPolygon")) throw new Error("MultiPolygon not rendered");
    if (evidence.flows.multi_region.boundary.feature_count !== 3 || evidence.flows.multi_region.groups.length !== 3) throw new Error("Multi-region context incomplete");
    if (!evidence.flows.remove_region.removed_chip_absent || evidence.flows.remove_region.boundary.feature_count !== 2) throw new Error("Region removal stale state");
    if (evidence.flows.search_this_area.scope !== "CURRENT_VIEWPORT" || evidence.flows.search_this_area.boundary.feature_count !== 0) throw new Error("Search This Area retained region scope");
    if (evidence.flows.boundary_failure.boundary_status !== 503 || evidence.flows.boundary_failure.merchant_status !== 200) throw new Error("Boundary failure was not isolated");
    if (evidence.flows.invalid_region.status !== 400) throw new Error("Invalid region was not rejected");
    if (Object.values(evidence.responsive).some((item) => item.horizontal_overflow || !item.chips_visible || !item.groups_visible || !item.map_canvas_present || item.boundary_count !== 3)) throw new Error(`Responsive region UX failed: ${JSON.stringify(evidence.responsive)}`);
    if (Object.values(evidence.accessibility).some((value) => !value)) throw new Error("Accessibility contract failed");
    if (evidence.security.browser_called_mapid_mission || !evidence.security.all_successful_boundary_responses_safe || evidence.security.duplicate_boundary_requests) throw new Error("Boundary network/security contract failed");
    const unexpectedConsoleErrors = evidence.console_errors.filter(
      (message) => !message.includes("503") && !message.includes("400"),
    );
    if (unexpectedConsoleErrors.length > 0) {
      throw new Error(`Unexpected browser console error: ${JSON.stringify(unexpectedConsoleErrors)}`);
    }

    await writeFile(path.join(evidenceDir, "runtime-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
}

await main();
