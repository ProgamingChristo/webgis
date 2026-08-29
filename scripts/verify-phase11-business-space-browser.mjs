import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const chromePath = process.env.GETRA_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const evidenceDir = path.resolve("docs/refinement/data-architecture/phase-11/browser-evidence");
const axeSource = await readFile(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const forbiddenNetwork = ["x-api-key", "service_role", "SUPABASE_SERVICE_ROLE_KEY", "MAPID_API_KEY", "/web/competition/"];

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
  await page.goto(`${appUrl}/login`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await fillInput(page, "#email", process.env.GETRA_TEST_USER_EMAIL || "getra.admin.test@example.com");
  await fillInput(page, "#password", process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!");
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }),
    page.click("button[type=submit]"),
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
    browser: "Chrome headless via puppeteer-core",
    api: [],
    flow: {},
    responsive: {},
    accessibility: {},
    console_errors: [],
    failed_requests: [],
    network_safe: false,
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    page.on("console", (message) => {
      if (message.type() === "error") evidence.console_errors.push(message.text());
    });
    page.on("pageerror", (error) => evidence.console_errors.push(error.message));
    page.on("requestfailed", (request) => {
      if (request.failure()?.errorText !== "net::ERR_ABORTED") {
        evidence.failed_requests.push({ url: sanitizeUrl(request.url()), error: request.failure()?.errorText });
      }
    });
    page.on("response", async (response) => {
      if (response.url().includes("/api/business-space/")) {
        const text = await response.text().catch(() => "");
        evidence.api.push({
          endpoint: sanitizeEndpoint(response.url()),
          method: response.request().method(),
          status: response.status(),
          bytes: Buffer.byteLength(text),
          safe: !forbiddenNetwork.some((term) => text.includes(term)),
        });
      }
    });

    await login(page);
    await page.goto(`${appUrl}/business-space`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector(".bs-candidate", { timeout: 45_000 });
    await page.waitForFunction(() => document.querySelector(".business-space-map")?.getAttribute("data-map-ready") === "true", { timeout: 45_000 });
    await page.waitForFunction(() => document.querySelector(".bs-detail-card dd")?.textContent, { timeout: 45_000 });
    evidence.flow.initial = await snapshot(page);
    await page.screenshot({ path: path.join(evidenceDir, "business-space-initial-1440x900.png"), fullPage: true });

    await page.click(".bs-detail-card button");
    await page.waitForFunction(() => [...document.querySelectorAll(".business-space__comparison button")].some((button) => button.textContent?.includes("Compare 1")), { timeout: 20_000 });
    await page.evaluate(() => document.querySelectorAll(".bs-candidate")[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.waitForFunction(() => document.querySelector(".bs-candidate--active")?.textContent?.trim().startsWith("P2"), { timeout: 20_000 });
    await page.waitForFunction(() => {
      const activeId = document.querySelector(".bs-candidate--active")?.getAttribute("data-candidate-id");
      const detailId = document.querySelector(".bs-detail-card")?.getAttribute("data-candidate-id");
      const secondId = document.querySelectorAll(".bs-candidate")[1]?.getAttribute("data-candidate-id");
      return activeId === secondId && detailId === secondId;
    }, { timeout: 30_000 });
    await page.click(".bs-detail-card button");
    await page.waitForFunction(() => [...document.querySelectorAll(".business-space__comparison button")].some((button) => button.textContent?.includes("Compare 2")), { timeout: 20_000 });
    await page.evaluate(() => {
      const button = [...document.querySelectorAll(".business-space__comparison button")]
        .find((node) => node.textContent?.includes("Compare"));
      if (!(button instanceof HTMLButtonElement)) throw new Error("Compare button not found");
      button.click();
    });
    await page.waitForSelector(".business-space__table-wrap table", { timeout: 60_000 });
    await page.waitForSelector(".business-space-chart[data-rendered='true']", { timeout: 30_000 });
    await page.evaluate(() => [...document.querySelectorAll(".business-space__comparison button")].find((button) => button.textContent?.includes("AI Location Insight"))?.click());
    await page.waitForSelector(".business-space__insight", { timeout: 60_000 });
    evidence.flow.comparison = await snapshot(page);
    await page.screenshot({ path: path.join(evidenceDir, "business-space-comparison-1440x900.png"), fullPage: true });

    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const result = await globalThis.axe.run(document.querySelector(".business-space"), {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
      return result.violations.map((item) => ({
        id: item.id,
        impact: item.impact,
        help: item.help,
        affected_nodes: item.nodes.length,
      }));
    });
    evidence.accessibility = {
      violations,
      critical_or_serious: violations.filter((item) => ["critical", "serious"].includes(item.impact)).length,
    };

    for (const [width, height] of [[390, 844], [768, 1024], [1366, 768], [1440, 900]]) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await new Promise((resolve) => setTimeout(resolve, 350));
      const key = `${width}x${height}`;
      evidence.responsive[key] = await page.evaluate(() => ({
        body_scroll_width: document.body.scrollWidth,
        viewport_width: window.innerWidth,
        map_ready: document.querySelector(".business-space-map")?.getAttribute("data-map-ready") === "true",
        chart_rendered: Boolean(document.querySelector(".business-space-chart[data-rendered='true']")),
        no_horizontal_overflow: document.body.scrollWidth <= window.innerWidth + 1,
      }));
      await page.screenshot({ path: path.join(evidenceDir, `business-space-${key}.png`), fullPage: true });
    }

    const html = await page.evaluate(() => document.body.innerText.toLowerCase());
    evidence.claim_safety = {
      no_available_now: !/available now|tersedia sekarang|still for rent|still for sale/.test(html),
      no_financial_overclaim: !/untung pasti|guaranteed profit|roi property|revenue prediction/.test(html),
      has_availability_unconfirmed: html.includes("availability unconfirmed"),
      has_no_roi_caveat: html.includes("bukan marketplace") || html.includes("bukan roi"),
    };
    evidence.network_safe = evidence.api.every((item) => item.safe) &&
      evidence.api.every((item) => item.endpoint.startsWith("/api/business-space/"));
  } finally {
    await writeFile(path.join(evidenceDir, "phase11-browser-evidence.json"), JSON.stringify(evidence, null, 2));
    await browser.close().catch(() => undefined);
  }

  console.log(JSON.stringify({
    evidence: path.join(evidenceDir, "phase11-browser-evidence.json"),
    api: evidence.api,
    flow: evidence.flow,
    responsive: evidence.responsive,
    accessibility: evidence.accessibility,
    claim_safety: evidence.claim_safety,
    console_errors: evidence.console_errors.length,
    failed_requests: evidence.failed_requests.length,
    network_safe: evidence.network_safe,
  }));
}

async function snapshot(page) {
  return page.evaluate(() => ({
    candidates: document.querySelectorAll(".bs-candidate").length,
    selected: document.querySelector(".bs-candidate--active")?.textContent?.replace(/\s+/g, " ").trim(),
    detail: document.querySelector(".bs-detail-card")?.textContent?.replace(/\s+/g, " ").trim(),
    comparison_rows: document.querySelectorAll(".business-space__table-wrap tbody tr").length,
    chart_rendered: Boolean(document.querySelector(".business-space-chart[data-rendered='true']")),
    insight: document.querySelector(".business-space__insight")?.textContent?.replace(/\s+/g, " ").trim(),
    map_ready: document.querySelector(".business-space-map")?.getAttribute("data-map-ready") === "true",
  }));
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
