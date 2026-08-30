import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.GETRA_API_URL || "http://localhost:8080";
const chromePath = process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const password = process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";
const userEmail = process.env.GETRA_USER_TEST_EMAIL || "getra.commuter.test@example.com";
const evidenceDir = path.resolve("docs/refinement/data-architecture/phase-08/browser-evidence");
const axeSource = await readFile(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const forbidden = ["x-api-key", "service_role", "MAPID_MISSION_API_KEY", "/web/competition/"];

async function fillInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 20_000 });
  await page.evaluate(({ inputSelector, inputValue }) => {
    const input = document.querySelector(inputSelector);
    if (!(input instanceof HTMLInputElement)) throw new Error(`Input not found: ${inputSelector}`);
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(input, inputValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, { inputSelector: selector, inputValue: value });
}

async function login(page) {
  await page.goto(`${appUrl}/login`, { waitUntil: "networkidle2", timeout: 45_000 });
  await fillInput(page, "#email", userEmail);
  await fillInput(page, "#password", password);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }),
    page.locator("button[type=submit]").click(),
  ]);
  await page.waitForFunction(() => location.pathname === "/app", { timeout: 30_000 });
  await page.waitForSelector(".map-canvas canvas", { timeout: 45_000 });
  await page.waitForSelector("#global-search-query", { timeout: 30_000 });
}

async function submitSearch(page, query) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().startsWith(`${apiUrl}/api/merchants/canonical?`) &&
      response.request().method() === "GET" &&
      new URL(response.url()).searchParams.get("q") === query,
    { timeout: 45_000 },
  );
  const startedAt = Date.now();
  await fillInput(page, "#global-search-query", query);
  await page.locator(".global-search__submit").click();
  const response = await responsePromise;
  const text = await response.text();
  const body = JSON.parse(text);
  return {
    status: response.status(),
    duration_ms: Date.now() - startedAt,
    payload_bytes: Buffer.byteLength(text),
    safe: !forbidden.some((term) => text.includes(term)),
    total: body.data?.total_available,
    returned: body.data?.total_features,
    intent: body.data?.intent,
    commuter: body.data?.commuter,
  };
}

async function selectRouteOrigin(page, merchantName) {
  await fillInput(page, 'input[aria-label="Cari titik mulai"]', merchantName);
  await page.waitForFunction((name) => {
    const originField = document.querySelectorAll(".route-field")[0];
    return [...(originField?.querySelectorAll(".route-search-result strong") ?? [])]
      .some((node) => node.textContent?.includes(name));
  }, {}, merchantName);
  await page.evaluate((name) => {
    const originField = document.querySelectorAll(".route-field")[0];
    const button = [...(originField?.querySelectorAll(".route-search-result") ?? [])]
      .find((node) => node.textContent?.includes(name));
    if (!(button instanceof HTMLButtonElement)) throw new Error("Origin result unavailable");
    button.click();
  }, merchantName);
  await page.waitForSelector('.route-choice-modal[role="dialog"]');
  await page.evaluate(() => {
    const button = [...document.querySelectorAll(".route-choice-modal button")]
      .find((node) => node.textContent?.includes("Pakai sebagai start"));
    if (!(button instanceof HTMLButtonElement)) throw new Error("Origin confirmation unavailable");
    button.click();
  });
  await page.waitForFunction((name) => document.querySelector(".route-summary-card")?.textContent?.includes(name), {}, merchantName);
}

async function clickResult(page, index) {
  await page.waitForSelector(".result-row", { timeout: 30_000 });
  const rows = await page.$$(".result-row");
  if (!rows[index]) throw new Error(`Result ${index} unavailable`);
  await rows[index].click();
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function requestRoute(page, trigger) {
  const responsePromise = page.waitForResponse(
    (response) => response.url() === `${apiUrl}/api/routing` && response.request().method() === "POST",
    { timeout: 45_000 },
  );
  const startedAt = Date.now();
  await trigger();
  const response = await responsePromise;
  const text = await response.text();
  const body = JSON.parse(text);
  await page.waitForFunction(() => Boolean(document.querySelector(".route-result")), { timeout: 30_000 });
  return {
    status: response.status(),
    duration_ms: Date.now() - startedAt,
    payload_bytes: Buffer.byteLength(text),
    safe: !forbidden.some((term) => text.includes(term)),
    result: {
      ...body.data,
      geometry: body.data?.geometry
        ? { type: body.data.geometry.type, coordinate_count: body.data.geometry.coordinates?.length ?? 0 }
        : null,
    },
  };
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
    responsive: {},
    network: { requests: [] },
    console_errors: [],
    failed_requests: [],
    http_errors: [],
    accessibility: {},
    security: {},
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    page.on("console", (message) => {
      if (message.type() === "error") {
        evidence.console_errors.push({ text: message.text(), url: message.location().url || null });
      }
    });
    page.on("pageerror", (error) => evidence.console_errors.push(error.message));
    page.on("request", (request) => {
      if (["fetch", "xhr"].includes(request.resourceType())) {
        evidence.network.requests.push({ method: request.method(), url: request.url() });
      }
    });
    page.on("requestfailed", (request) => {
      if (request.failure()?.errorText !== "net::ERR_ABORTED") {
        evidence.failed_requests.push({ url: request.url(), error: request.failure()?.errorText });
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400) evidence.http_errors.push({ status: response.status(), url: response.url() });
    });

    await login(page);
    evidence.flows.origin_lookup = await submitSearch(page, "MIRA KANTIN");
    await selectRouteOrigin(page, "MIRA KANTIN");

    await page.select(".global-search__commuter-filters select", "10");
    const serviceAreaPromise = page.waitForResponse(
      (response) => response.url() === `${apiUrl}/api/spatial/service-area` && response.status() === 200,
      { timeout: 45_000 },
    );
    evidence.flows.network_walking_search = await submitSearch(page, "bakso Jakarta Pusat");
    const serviceAreaResponse = await serviceAreaPromise;
    const serviceAreaText = await serviceAreaResponse.text();
    const serviceAreaBody = JSON.parse(serviceAreaText);
    evidence.flows.service_area = {
      status: serviceAreaResponse.status(),
      payload_bytes: Buffer.byteLength(serviceAreaText),
      safe: !forbidden.some((term) => serviceAreaText.includes(term)),
      result: {
        status: serviceAreaBody.data?.status,
        type: serviceAreaBody.data?.service_area_type,
        threshold_minutes: serviceAreaBody.data?.threshold_minutes,
        reachable_nodes: serviceAreaBody.data?.reachable_node_count,
        reachable_edges: serviceAreaBody.data?.reachable_edge_count,
        geometry_type: serviceAreaBody.data?.geometry?.type,
      },
    };
    if ((evidence.flows.network_walking_search.returned ?? 0) < 2) {
      throw new Error("Need at least two network-eligible bakso results for Route Switch");
    }
    await page.screenshot({ path: path.join(evidenceDir, "commuter-search-service-area-1440x900.png"), fullPage: true });

    await clickResult(page, 0);
    evidence.flows.route = await requestRoute(page, () => page.locator(".route-primary-button").click());
    await page.screenshot({ path: path.join(evidenceDir, "network-route-1440x900.png"), fullPage: true });

    evidence.flows.route_switch = await requestRoute(page, () => clickResult(page, 1));
    evidence.flows.route_switch.selected_destination = await page.$eval(
      ".route-summary-card span:last-child",
      (node) => node.textContent?.trim(),
    );

    evidence.flows.smart_alternative = await requestRoute(page, () => page.evaluate(() => {
      const button = [...document.querySelectorAll("button")]
        .find((node) => node.textContent?.includes("Alternatif berikutnya"));
      if (!(button instanceof HTMLButtonElement)) throw new Error("Alternative button unavailable");
      button.click();
    }));

    const aiResponsePromise = page.waitForResponse(
      (response) => response.url() === `${apiUrl}/api/ai/ask` && response.request().method() === "POST",
      { timeout: 60_000 },
    );
    await page.locator('input[placeholder="Ketik pertanyaan Anda..."]').fill(
      "Berapa jauh dan berapa lama rute berjalan ke tujuan ini?",
    );
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Ketik pertanyaan Anda..."]');
      const form = input?.closest("form");
      const button = form?.querySelector('button[type="submit"]');
      if (!(button instanceof HTMLButtonElement)) throw new Error("AI submit unavailable");
      button.click();
    });
    const aiResponse = await aiResponsePromise;
    const aiText = await aiResponse.text();
    const aiBody = JSON.parse(aiText);
    evidence.flows.grounded_ai = {
      status: aiResponse.status(),
      payload_bytes: Buffer.byteLength(aiText),
      safe: !forbidden.some((term) => aiText.includes(term)),
      intent: aiBody.data?.intent,
      answer: aiBody.data?.answer,
      limitations: aiBody.data?.limitations,
      evidence: aiBody.data?.evidence,
    };

    await page.addScriptTag({ content: axeSource });
    const accessibility = await page.evaluate(async () => {
      const result = await globalThis.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
      });
      return result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        affected_nodes: violation.nodes.length,
      }));
    });
    evidence.accessibility = {
      standard: "WCAG 2 A/AA and WCAG 2.1 A/AA via axe-core",
      violations: accessibility,
      critical_or_serious: accessibility.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
      ).length,
    };

    await page.locator('.global-search__commuter-filters input[type="number"]').fill("30000");
    await page.locator('.global-search__commuter-filters input[type="checkbox"]').click();
    evidence.flows.strict_no_result = await submitSearch(
      page,
      "bakso Jakarta Pusat di bawah 30 ribu buka sekarang maksimal 10 menit jalan kaki",
    );
    await page.waitForSelector(".commuter-no-results", { timeout: 20_000 });
    evidence.flows.strict_no_result.message = await page.$eval(
      ".commuter-no-results",
      (node) => node.textContent?.replace(/\s+/g, " ").trim(),
    );
    await page.screenshot({ path: path.join(evidenceDir, "strict-no-result-1440x900.png"), fullPage: true });

    for (const [width, height] of [[390, 844], [768, 1024], [1366, 768], [1440, 900]]) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await new Promise((resolve) => setTimeout(resolve, 350));
      const key = `${width}x${height}`;
      const layout = await page.evaluate(() => ({
        body_scroll_width: document.body.scrollWidth,
        viewport_width: window.innerWidth,
        search_visible: Boolean(document.querySelector("#global-search-query")?.getBoundingClientRect().width),
        map_visible: Boolean(document.querySelector(".map-canvas canvas")?.getBoundingClientRect().width),
        route_control_visible: Boolean(document.querySelector(".route-planner")?.getBoundingClientRect().width),
      }));
      evidence.responsive[key] = { ...layout, no_horizontal_overflow: layout.body_scroll_width <= layout.viewport_width + 1 };
      await page.screenshot({ path: path.join(evidenceDir, `responsive-${key}.png`), fullPage: true });
    }

    evidence.security = {
      browser_calls_getra_only: evidence.network.requests
        .filter((request) => request.url.includes("/api/"))
        .every((request) => request.url.startsWith(apiUrl) || request.url.startsWith(appUrl)),
      no_provider_mission_request: !evidence.network.requests.some((request) => request.url.includes("/web/competition/")),
      no_secret_in_urls: !evidence.network.requests.some((request) => forbidden.some((term) => request.url.includes(term))),
    };
  } finally {
    await writeFile(path.join(evidenceDir, "phase08-browser-evidence.json"), JSON.stringify(evidence, null, 2));
    await browser.close();
  }

  console.log(JSON.stringify({
    evidence: path.join(evidenceDir, "phase08-browser-evidence.json"),
    flows: Object.keys(evidence.flows),
    console_errors: evidence.console_errors.length,
    failed_requests: evidence.failed_requests.length,
    security: evidence.security,
  }));
}

await main();
