import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";
import sharp from "sharp";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.GETRA_API_URL || "http://localhost:8080";
const chromePath = process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const password = process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";
const userEmail = process.env.GETRA_USER_TEST_EMAIL || "getra.commuter.test@example.com";
const endpoint = `${apiUrl}/api/contextual-observations`;
const evidenceDir = path.resolve("docs/refinement/data-architecture/phase-07/browser-evidence");
const forbidden = ["raw_payload", "raw_payload_checksum", "x-api-key", "service_role", "MAPID_MISSION_API_KEY"];

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
  await page.waitForFunction(() => Boolean(document.querySelector(".map-shell")?.dataset.mapViewportBounds), { timeout: 30_000 });
}

async function toggleLayer(page, label, enabled, expectSource = null) {
  const responsePromise = expectSource
    ? page.waitForResponse(
        (response) => response.url().startsWith(endpoint) &&
          response.url().includes(`source=${expectSource}`) &&
          response.request().method() === "GET",
        { timeout: 45_000 },
      )
    : null;
  const changed = await page.evaluate((text, checked) => {
    const labelElement = [...document.querySelectorAll(".contextual-layer-option")]
      .find((element) => element.textContent?.includes(text));
    const input = labelElement?.querySelector("input");
    if (!(input instanceof HTMLInputElement)) return false;
    if (input.checked !== checked) input.click();
    return true;
  }, label, enabled);
  if (!changed) throw new Error(`Layer toggle unavailable: ${label}`);
  if (!responsePromise) return null;
  const response = await responsePromise;
  await page.waitForFunction((source, minimum) => {
    const shell = document.querySelector(".map-shell");
    const key = source === "PROPERTI_GO"
      ? "contextPropertyCount"
      : source === "STRUK_GO"
        ? "contextTransactionCount"
        : "contextActivitiesCount";
    return Number(shell?.dataset[key] ?? 0) >= minimum;
  }, { timeout: 30_000 }, expectSource, 1);
  return response;
}

async function openSourcePopup(page, source, latestResults) {
  const colors = {
    PROPERTI_GO: [[34, 211, 238], [8, 145, 178]],
    STRUK_GO: [[251, 191, 36], [217, 119, 6]],
    ACTIVITIES: [[167, 139, 250], [124, 58, 237]],
  }[source];
  for (let wait = 0; wait < 50 && !latestResults.get(source)?.feature_collection?.features?.length; wait += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = latestResults.get(source);
    const features = result?.feature_collection?.features ?? [];
    if (features.length === 0) throw new Error(`No ${source} feature available for popup verification`);
    const canvas = await page.$(".map-canvas canvas");
    const box = await canvas?.boundingBox();
    if (!box) throw new Error("Map viewport unavailable");
    const image = await canvas.screenshot();
    const points = await findMarkerCenters(image, colors);
    if (points.length === 0) throw new Error(`No rendered ${source} marker pixels found`);
    for (const point of points.slice(0, 8)) {
      await page.mouse.click(box.x + point.x, box.y + point.y);
      await new Promise((resolve) => setTimeout(resolve, 250));
      const popup = await page.evaluate(() => {
        const element = document.querySelector(".contextual-popup");
        return element ? {
          text: element.textContent?.trim() ?? "",
          heading_present: Boolean(element.querySelector("h3")),
          image_alt: element.querySelector("img")?.getAttribute("alt") ?? null,
          image_present: Boolean(element.querySelector("img")),
        } : null;
      });
      if (popup) return popup;
    }
    const point = points[0];
    await page.mouse.click(box.x + point.x, box.y + point.y, { clickCount: 2, delay: 80 });
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Unable to open ${source} popup from rendered map feature`);
}

async function findMarkerCenters(image, colors) {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const matches = new Uint8Array(info.width * info.height);
  for (let index = 0; index < matches.length; index += 1) {
    const offset = index * info.channels;
    if (colors.some(([red, green, blue]) =>
      Math.abs(data[offset] - red) <= 5 &&
      Math.abs(data[offset + 1] - green) <= 5 &&
      Math.abs(data[offset + 2] - blue) <= 5
    )) matches[index] = 1;
  }
  const components = [];
  for (let index = 0; index < matches.length; index += 1) {
    if (matches[index] !== 1) continue;
    const queue = [index];
    matches[index] = 2;
    let count = 0;
    let minX = info.width;
    let minY = info.height;
    let maxX = 0;
    let maxY = 0;
    while (queue.length) {
      const current = queue.pop();
      const x = current % info.width;
      const y = Math.floor(current / info.width);
      count += 1;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (const neighbor of [current - 1, current + 1, current - info.width, current + info.width]) {
        if (neighbor >= 0 && neighbor < matches.length && matches[neighbor] === 1) {
          matches[neighbor] = 2;
          queue.push(neighbor);
        }
      }
    }
    if (count >= 20) components.push({
      count,
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
    });
  }
  return components.sort((a, b) => a.count - b.count);
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
    network: { contextual_requests: [], off_layer_initial_requests: 0 },
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
    const latestResults = new Map();
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
      if (!response.url().startsWith(endpoint) || response.status() !== 200) return;
      const text = await response.text().catch(() => "");
      const body = text ? JSON.parse(text) : null;
      const source = body?.data?.source;
      if (source && body?.data?.feature_collection?.features?.length > 0) {
        latestResults.set(source, body.data);
      }
      evidence.network.contextual_requests.push({
        source,
        status: response.status(),
        payload_bytes: Buffer.byteLength(text),
        returned_features: body?.data?.total_features ?? null,
        total_available: body?.data?.total_available ?? null,
        bbox: body?.data?.bbox ?? null,
        bounded: body?.data?.limit === 250 && body?.data?.has_more === false,
        safe_body: !forbidden.some((term) => text.includes(term)),
      });
    });

    await login(page);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    evidence.network.off_layer_initial_requests = requestUrls.filter((url) => url.startsWith(endpoint)).length;
    await page.locator(".contextual-layer-control summary").click();
    evidence.flows.default_state = await page.$$eval(
      ".contextual-layer-option",
      (labels) => Object.fromEntries(labels.map((label) => [
        label.querySelector("span")?.textContent?.trim(),
        Boolean(label.querySelector("input")?.checked),
      ])),
    );
    await page.locator(".contextual-layer-control summary").click();

    const propertyResponse = await toggleLayer(page, "Properti", true, "PROPERTI_GO");
    await page.screenshot({ path: path.join(evidenceDir, "property-layer-before-popup.png"), fullPage: true });
    evidence.flows.property = {
      http_status: propertyResponse.status(),
      popup: await openSourcePopup(page, "PROPERTI_GO", latestResults),
      count: Number(await page.$eval(".map-shell", (node) => node.dataset.contextPropertyCount)),
    };
    await page.screenshot({ path: path.join(evidenceDir, "property-layer-popup.png"), fullPage: true });
    await toggleLayer(page, "Properti", false);
    await page.waitForFunction(() => document.querySelector(".map-shell")?.dataset.contextPropertyCount === "0");

    const transactionResponse = await toggleLayer(page, "Observasi transaksi", true, "STRUK_GO");
    evidence.flows.transaction = {
      http_status: transactionResponse.status(),
      popup: await openSourcePopup(page, "STRUK_GO", latestResults),
      count: Number(await page.$eval(".map-shell", (node) => node.dataset.contextTransactionCount)),
    };
    await page.screenshot({ path: path.join(evidenceDir, "transaction-layer-popup.png"), fullPage: true });
    await toggleLayer(page, "Observasi transaksi", false);
    await page.waitForFunction(() => document.querySelector(".map-shell")?.dataset.contextTransactionCount === "0");

    const activitiesResponse = await toggleLayer(page, "Observasi lapangan", true, "ACTIVITIES");
    evidence.flows.activities = {
      http_status: activitiesResponse.status(),
      popup: await openSourcePopup(page, "ACTIVITIES", latestResults),
      count: Number(await page.$eval(".map-shell", (node) => node.dataset.contextActivitiesCount)),
      categories: [...new Set(
        latestResults.get("ACTIVITIES").feature_collection.features
          .map((feature) => feature.properties.activity_category),
      )],
    };
    await page.screenshot({ path: path.join(evidenceDir, "activities-layer-popup.png"), fullPage: true });

    const contextualRequestsBeforeCachedReenable = evidence.network.contextual_requests.length;
    await toggleLayer(page, "Properti", true);
    await toggleLayer(page, "Observasi transaksi", true);
    await page.waitForFunction(() => {
      const shell = document.querySelector(".map-shell");
      return Number(shell?.dataset.contextPropertyCount ?? 0) > 0 &&
        Number(shell?.dataset.contextTransactionCount ?? 0) > 0;
    }, { timeout: 10_000 });
    evidence.flows.cached_reenable = {
      new_network_requests: evidence.network.contextual_requests.length - contextualRequestsBeforeCachedReenable,
    };
    await page.locator("#global-search-query").fill("bakso Jakarta Selatan");
    const boundaryPromise = page.waitForResponse(
      (response) => response.url().includes("/api/regions?ids=jakarta-selatan") && response.status() === 200,
      { timeout: 45_000 },
    );
    await page.locator(".global-search__submit").click();
    await boundaryPromise;
    await page.waitForFunction(() => document.querySelector(".map-shell")?.dataset.boundaryFeatureCount === "1", { timeout: 30_000 });
    await page.waitForFunction(() => {
      const shell = document.querySelector(".map-shell");
      return Number(shell?.dataset.contextPropertyCount ?? 0) > 0 &&
        Number(shell?.dataset.contextTransactionCount ?? 0) > 0 &&
        Number(shell?.dataset.contextActivitiesCount ?? 0) > 0;
    }, { timeout: 45_000 });
    evidence.flows.all_layers_search = await page.$eval(".map-shell", (shell) => ({
      merchant_visible: shell.dataset.merchantLayerVisible,
      merchant_count: Number(shell.dataset.merchantCount),
      property_count: Number(shell.dataset.contextPropertyCount),
      transaction_count: Number(shell.dataset.contextTransactionCount),
      activities_count: Number(shell.dataset.contextActivitiesCount),
      boundary_count: Number(shell.dataset.boundaryFeatureCount),
    }));
    evidence.flows.all_layers_search.query = await page.$eval("#global-search-query", (input) => input.value);
    await page.locator(".contextual-layer-control summary").click();
    await page.screenshot({ path: path.join(evidenceDir, "all-layers-jakarta-selatan.png"), fullPage: true });
    await page.locator(".contextual-layer-control summary").click();

    await toggleLayer(page, "Merchant", false);
    evidence.flows.merchant_toggle = {
      hidden: await page.$eval(".map-shell", (shell) => shell.dataset.merchantLayerVisible === "false"),
      query_preserved: await page.$eval("#global-search-query", (input) => input.value),
    };
    await toggleLayer(page, "Merchant", true);

    await page.setRequestInterception(true);
    let activityFailureIntercepted = false;
    const interceptActivityFailure = (request) => {
      if (
        !activityFailureIntercepted &&
        request.method() === "GET" &&
        request.url().startsWith(endpoint) &&
        request.url().includes("source=ACTIVITIES")
      ) {
        activityFailureIntercepted = true;
        void request.respond({
          status: 503,
          contentType: "application/json",
          headers: { "Access-Control-Allow-Origin": appUrl },
          body: JSON.stringify({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Observasi lapangan tidak dapat dimuat." },
          }),
        });
      } else {
        void request.continue();
      }
    };
    page.on("request", interceptActivityFailure);
    const mapCanvas = await page.$(".map-canvas canvas");
    const mapBox = await mapCanvas?.boundingBox();
    if (!mapBox) throw new Error("Map canvas unavailable for failure isolation test");
    await page.mouse.move(mapBox.x + mapBox.width * 0.65, mapBox.y + mapBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(mapBox.x + mapBox.width * 0.45, mapBox.y + mapBox.height * 0.5, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".contextual-layer-message--error")]
        .some((element) => element.textContent?.includes("Observasi lapangan")),
      { timeout: 45_000 },
    );
    evidence.flows.failure_isolation = {
      activities_status: activityFailureIntercepted ? 503 : null,
      safe_error: await page.$eval(
        ".contextual-layer-message--error",
        (element) => element.textContent?.trim() ?? "",
      ),
      merchant_remains: await page.$eval(
        ".map-shell",
        (shell) => shell.dataset.merchantLayerVisible === "true" && Number(shell.dataset.merchantCount) > 0,
      ),
    };
    page.off("request", interceptActivityFailure);
    await page.setRequestInterception(false);
    await toggleLayer(page, "Observasi lapangan", false);
    await toggleLayer(page, "Observasi lapangan", true, "ACTIVITIES");
    await page.locator(".contextual-layer-control summary").click();

    const viewports = [[390, 844], [768, 1024], [1366, 768], [1440, 900]];
    for (const [width, height] of viewports) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await new Promise((resolve) => setTimeout(resolve, 600));
      const key = `${width}x${height}`;
      evidence.responsive[key] = await page.evaluate(() => ({
        horizontal_overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        control_visible: Boolean(document.querySelector(".contextual-layer-control")),
        map_canvas_present: Boolean(document.querySelector(".map-canvas canvas")),
        all_context_sources_visible: [
          "contextPropertyCount",
          "contextTransactionCount",
          "contextActivitiesCount",
        ].every((name) => Number(document.querySelector(".map-shell")?.dataset[name] ?? 0) > 0),
        boundary_count: Number(document.querySelector(".map-shell")?.dataset.boundaryFeatureCount ?? 0),
      }));
      await page.screenshot({ path: path.join(evidenceDir, `all-layers-${key}.png`), fullPage: true });
    }

    evidence.accessibility = await page.evaluate(() => ({
      native_checkboxes: document.querySelectorAll(".contextual-layer-option input[type=checkbox]").length === 5,
      visible_labels: document.querySelectorAll(".contextual-layer-option span").length === 5,
      status_text: document.querySelectorAll(".contextual-layer-option small[role=status]").length >= 3,
    }));
    evidence.accessibility.popup_heading = [
      evidence.flows.property.popup,
      evidence.flows.transaction.popup,
      evidence.flows.activities.popup,
    ].every((popup) => popup.heading_present);
    evidence.accessibility.media_alt = [
      evidence.flows.property.popup,
      evidence.flows.transaction.popup,
      evidence.flows.activities.popup,
    ].every((popup) => !popup.image_present || Boolean(popup.image_alt));
    evidence.security = {
      browser_called_mission_provider: requestUrls.some((url) => url.includes("/web/competition/") || url.includes("server.mapid.io")),
      successful_responses_safe: evidence.network.contextual_requests.every((item) => item.safe_body),
      all_requests_bbox_bounded: evidence.network.contextual_requests.every((item) => item.bbox && item.bounded),
    };

    if (evidence.network.off_layer_initial_requests !== 0) throw new Error("Contextual source fetched while layers were OFF");
    if (evidence.flows.default_state.Merchant !== true || evidence.flows.default_state.Properti !== false || evidence.flows.default_state["Observasi transaksi"] !== false || evidence.flows.default_state["Observasi lapangan"] !== false) throw new Error("Default visibility contract failed");
    if (!evidence.flows.property.popup.text.includes("PROPERTY OBSERVATION") || /available now|buy now/i.test(evidence.flows.property.popup.text)) throw new Error("Property popup semantics failed");
    if (!evidence.flows.transaction.popup.text.includes("TRANSACTION OBSERVATION") || /revenue|sales|spending/i.test(evidence.flows.transaction.popup.text)) throw new Error("Transaction popup semantics failed");
    if (!evidence.flows.activities.popup.text.includes("FIELD OBSERVATION")) throw new Error("Activity popup semantics failed");
    if (evidence.flows.cached_reenable.new_network_requests !== 0) throw new Error("Cached viewport was fetched again");
    if (!evidence.flows.merchant_toggle.hidden || evidence.flows.merchant_toggle.query_preserved !== "bakso Jakarta Selatan") throw new Error("Merchant toggle mutated search state");
    if (evidence.flows.failure_isolation.activities_status !== 503 || !evidence.flows.failure_isolation.merchant_remains) throw new Error("Source failure was not isolated");
    if (Object.values(evidence.responsive).some((item) => item.horizontal_overflow || !item.control_visible || !item.map_canvas_present || !item.all_context_sources_visible || item.boundary_count !== 1)) throw new Error(`Responsive all-layer contract failed: ${JSON.stringify(evidence.responsive)}`);
    if (Object.values(evidence.accessibility).some((value) => !value)) throw new Error(`Accessibility contract failed: ${JSON.stringify(evidence.accessibility)}`);
    if (evidence.security.browser_called_mission_provider || !evidence.security.successful_responses_safe || !evidence.security.all_requests_bbox_bounded) throw new Error("Network/security contract failed");
    const unexpectedConsoleErrors = evidence.console_errors.filter((message) => !message.includes("Failed to load resource"));
    if (unexpectedConsoleErrors.length > 0) throw new Error(`Unexpected browser console errors: ${JSON.stringify(unexpectedConsoleErrors)}`);

    await writeFile(path.join(evidenceDir, "runtime-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
}

await main();
