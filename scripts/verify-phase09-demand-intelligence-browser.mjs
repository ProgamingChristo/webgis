import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.GETRA_API_URL || "http://localhost:8080";
const chromePath = process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const password = process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";
const userEmail = process.env.GETRA_USER_TEST_EMAIL || "getra.commuter.test@example.com";
const evidenceDir = path.resolve("docs/refinement/data-architecture/phase-09/browser-evidence");
const axeSource = await readFile(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const forbidden = ["x-api-key", "service_role", "MAPID_MISSION_API_KEY", "/web/competition/"];

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

async function clickByText(page, selector, text) {
  await page.evaluate((input) => {
    const node = [...document.querySelectorAll(input.selector)]
      .find((candidate) => candidate.textContent?.includes(input.text));
    if (!(node instanceof HTMLButtonElement)) throw new Error(`Button unavailable: ${input.text}`);
    node.click();
  }, { selector, text });
}

async function waitForAnalytics(page, action, endpoint = "/api/analytics/") {
  const responsePromise = page.waitForResponse(
    (response) => response.url().startsWith(`${apiUrl}${endpoint}`) && response.request().method() !== "OPTIONS",
    { timeout: 45_000 },
  );
  const startedAt = Date.now();
  await action();
  const response = await responsePromise;
  let text = "";
  try {
    text = await response.text();
  } catch {
    // Rapid UI transitions can cancel a response after headers arrive; the final DOM state remains authoritative.
  }
  return {
    status: response.status(),
    duration_ms: Date.now() - startedAt,
    payload_bytes: Buffer.byteLength(text),
    safe: !forbidden.some((term) => text.includes(term)),
    body: text ? JSON.parse(text) : null,
    body_available: Boolean(text),
  };
}

async function snapshotState(page) {
  return page.evaluate(() => {
    const panel = document.querySelector(".demand-intelligence");
    const summary = document.querySelector(".analytics-summary");
    const map = document.querySelector("[data-analytics-feature-count]");
    const charts = [...document.querySelectorAll(".analytics-chart")];
    return {
      category: panel?.getAttribute("data-analytics-category"),
      mode: panel?.getAttribute("data-analytics-mode"),
      row_count: Number(panel?.getAttribute("data-analytics-row-count") ?? 0),
      selected_region: summary?.getAttribute("data-region-id"),
      confidence: summary?.getAttribute("data-confidence"),
      sample_size: Number(summary?.getAttribute("data-sample-size") ?? 0),
      retail_gap: summary?.getAttribute("data-retail-gap"),
      map_feature_count: Number(map?.getAttribute("data-analytics-feature-count") ?? 0),
      map_mode: map?.getAttribute("data-analytics-mode"),
      rendered_charts: charts.filter((chart) => chart.getAttribute("data-rendered") === "true").length,
      chart_canvas_pixels: charts.map((chart) => {
        const canvas = chart.querySelector("canvas");
        return canvas ? canvas.width * canvas.height : 0;
      }),
      legend: document.querySelector(".analytics-legend")?.textContent?.replace(/\s+/g, " ").trim(),
      summary: summary?.textContent?.replace(/\s+/g, " ").trim(),
    };
  });
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
      if (message.type() === "error") evidence.console_errors.push(message.text());
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
    await page.waitForFunction(
      () => document.querySelectorAll(".global-search__region-option").length >= 6,
      { timeout: 30_000 },
    );
    for (const regionName of ["Jakarta Barat", "Jakarta Pusat", "Jakarta Selatan", "Jakarta Timur", "Jakarta Utara"]) {
      await page.evaluate((name) => {
        const label = [...document.querySelectorAll(".global-search__region-option")]
          .find((candidate) => candidate.textContent?.trim() === name);
        const input = label?.querySelector('input[type="checkbox"]');
        if (!(input instanceof HTMLInputElement)) throw new Error(`Region unavailable: ${name}`);
        if (!input.checked) input.click();
      }, regionName);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await page.waitForFunction(() => document.querySelectorAll('.global-search__region-option input:checked').length === 5, { timeout: 20_000 });
    const initial = await waitForAnalytics(page, () => clickByText(page, "button", "Analytics"), "/api/analytics/demand");
    await page.waitForFunction(() => document.querySelectorAll('.analytics-chart[data-rendered="true"]').length === 3, { timeout: 30_000 });
    evidence.flows.demand_default = {
      status: initial.status,
      duration_ms: initial.duration_ms,
      payload_bytes: initial.payload_bytes,
      safe: initial.safe,
      state: await snapshotState(page),
      rows: initial.body?.data?.rows?.map((row) => ({
        region: row.spatial_unit.name,
        demand: row.demand_score,
        supply: row.supply_score,
        gap: row.retail_gap,
        sample: row.evidence.sample_size,
        confidence: row.evidence.confidence,
      })),
    };
    await page.$eval(".demand-intelligence", (node) => node.scrollIntoView({ block: "start" }));
    await new Promise((resolve) => setTimeout(resolve, 250));
    await page.screenshot({ path: path.join(evidenceDir, "demand-coffee-1440x900.png"), fullPage: true });

    const gap = await waitForAnalytics(page, () => clickByText(page, ".analytics-segments button", "Retail Gap"), "/api/analytics/retail-gap");
    evidence.flows.retail_gap = { status: gap.status, safe: gap.safe, state: await snapshotState(page) };
    await page.$eval(".demand-intelligence", (node) => node.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: path.join(evidenceDir, "retail-gap-coffee-1440x900.png"), fullPage: true });

    const categorySelect = ".analytics-filters select:first-of-type";
    const insufficient = await waitForAnalytics(page, () => page.select(categorySelect, "pharmacy"), "/api/analytics/retail-gap");
    await page.waitForFunction(() => document.querySelector(".analytics-summary")?.getAttribute("data-confidence") === "INSUFFICIENT_DATA", { timeout: 20_000 });
    evidence.flows.insufficient_data = {
      status: insufficient.status,
      safe: insufficient.safe,
      state: await snapshotState(page),
    };

    const recoveryTarget = `${apiUrl}/api/analytics/retail-gap`;
    let abortNext = true;
    await page.setRequestInterception(true);
    const interceptor = (request) => {
      if (abortNext && request.url().startsWith(recoveryTarget)) {
        abortNext = false;
        void request.abort("failed");
      } else void request.continue();
    };
    page.on("request", interceptor);
    await page.select(categorySelect, "minimarket");
    await page.waitForSelector('.analytics-state[role="alert"]', { timeout: 20_000 });
    evidence.flows.failure_state = {
      message: await page.$eval('.analytics-state[role="alert"]', (node) => node.textContent?.trim()),
    };
    page.off("request", interceptor);
    await page.setRequestInterception(false);
    const recovered = await waitForAnalytics(
      page,
      () => page.select(categorySelect, "pharmacy"),
      "/api/analytics/retail-gap?category=pharmacy",
    );
    evidence.flows.failure_recovery = { status: recovered.status, safe: recovered.safe, state: await snapshotState(page) };

    await page.select(categorySelect, "bakso");
    await page.select(categorySelect, "coffee");
    const staleFinal = await waitForAnalytics(
      page,
      () => page.select(categorySelect, "nasi-goreng"),
      "/api/analytics/retail-gap?category=nasi-goreng",
    );
    await page.waitForFunction(() => document.querySelector(".demand-intelligence")?.getAttribute("data-analytics-category") === "nasi-goreng", { timeout: 20_000 });
    evidence.flows.stale_response_guard = { status: staleFinal.status, safe: staleFinal.safe, state: await snapshotState(page) };

    const interpretation = await waitForAnalytics(page, () => clickByText(page, ".analytics-explain-button", "Jelaskan"), "/api/analytics/interpretation");
    await page.waitForSelector(".analytics-interpretation", { timeout: 30_000 });
    evidence.flows.grounded_interpretation = {
      status: interpretation.status,
      safe: interpretation.safe,
      response: interpretation.body?.data,
      displayed: await page.$eval(".analytics-interpretation", (node) => node.textContent?.replace(/\s+/g, " ").trim()),
    };

    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const result = await globalThis.axe.run(document.querySelector(".demand-intelligence"), {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
      return result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        affected_nodes: violation.nodes.length,
      }));
    });
    evidence.accessibility = {
      scope: ".demand-intelligence",
      standard: "WCAG 2 A/AA and WCAG 2.1 A/AA via axe-core",
      violations,
      critical_or_serious: violations.filter((item) => ["critical", "serious"].includes(item.impact)).length,
    };

    for (const [width, height] of [[390, 844], [768, 1024], [1366, 768], [1440, 900]]) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.$eval(".demand-intelligence", (node) => node.scrollIntoView({ block: "start" }));
      await new Promise((resolve) => setTimeout(resolve, 400));
      const key = `${width}x${height}`;
      const layout = await page.evaluate(() => ({
        body_scroll_width: document.body.scrollWidth,
        viewport_width: window.innerWidth,
        panel_visible: Boolean(document.querySelector(".demand-intelligence")?.getBoundingClientRect().width),
        map_visible: Boolean(document.querySelector(".map-canvas canvas")?.getBoundingClientRect().width),
        chart_visible: [...document.querySelectorAll(".analytics-chart canvas")]
          .some((canvas) => canvas.width > 0 && canvas.height > 0),
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
      analytics_responses_safe: Object.values(evidence.flows).every((flow) => flow.safe !== false),
    };
    evidence.expected_failure_injection = {
      purpose: "Verify visible transport-error state and successful recovery",
      console_errors: evidence.console_errors.filter((message) => message.includes("net::ERR_FAILED")).length,
      failed_requests: evidence.failed_requests.filter((request) => request.error === "net::ERR_FAILED").length,
    };
    evidence.unexpected_console_errors = evidence.console_errors.filter((message) => !message.includes("net::ERR_FAILED"));
    evidence.unexpected_failed_requests = evidence.failed_requests.filter((request) => request.error !== "net::ERR_FAILED");
  } finally {
    await writeFile(path.join(evidenceDir, "phase09-browser-evidence.json"), JSON.stringify(evidence, null, 2));
    await browser.close();
  }

  console.log(JSON.stringify({
    evidence: path.join(evidenceDir, "phase09-browser-evidence.json"),
    flows: Object.keys(evidence.flows),
    unexpected_console_errors: evidence.unexpected_console_errors.length,
    unexpected_failed_requests: evidence.unexpected_failed_requests.length,
    accessibility: evidence.accessibility,
    security: evidence.security,
  }));
}

await main();
