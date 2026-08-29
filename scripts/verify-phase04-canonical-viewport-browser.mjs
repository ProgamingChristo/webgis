import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.GETRA_API_URL || "http://localhost:8080";
const chromePath =
  process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const password = process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";
const userEmail = process.env.GETRA_USER_TEST_EMAIL || "getra.commuter.test@example.com";
const evidenceDir = path.resolve(
  "docs/refinement/data-architecture/phase-04/browser-evidence",
);
const forbiddenTerms = [
  "x-api-key",
  "MAPID_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "/web/competition/",
];

async function login(page) {
  await page.goto(`${appUrl}/login`, { waitUntil: "networkidle2", timeout: 45_000 });
  await page.locator("#email").fill(userEmail);
  await page.locator("#password").fill(password);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30_000 }),
    page.locator("button[type=submit]").click(),
  ]);
  await page.waitForFunction(() => !location.pathname.includes("/login"), {
    timeout: 30_000,
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
    browser: "Chrome headless via puppeteer-core",
    generated_at: new Date().toISOString(),
    requests: [],
    browser_errors: [],
  };

  try {
    const page = await browser.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") evidence.browser_errors.push(message.text());
    });
    page.on("pageerror", (error) => evidence.browser_errors.push(error.message));
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    const canonicalResponses = [];
    const browserRequests = [];

    page.on("request", (request) => browserRequests.push(request.url()));
    page.on("response", async (response) => {
      if (
        response.url().startsWith(`${apiUrl}/api/merchants/canonical?`) &&
        response.request().method() === "GET"
      ) {
        const body = await response.text().catch(() => "");
        canonicalResponses.push({
          body,
          status: response.status(),
          url: response.url(),
        });
      }
    });

    await login(page);
    await page.waitForSelector(".map-canvas canvas", { timeout: 45_000 });
    await page.waitForFunction(
      () => Number(document.querySelector(".map-shell")?.dataset.merchantCount ?? 0) > 0,
      { timeout: 45_000 },
    );
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    await page.waitForFunction(
      (endpoint) => performance.getEntriesByType("resource")
        .some((entry) => entry.name.startsWith(endpoint)),
      { timeout: 45_000 },
      `${apiUrl}/api/merchants/canonical?`,
    );

    const canvas = await page.$(".map-canvas canvas");
    const box = await canvas?.boundingBox();
    if (!box) throw new Error("MapLibre canvas bounds unavailable");

    await page.screenshot({
      path: path.join(evidenceDir, "canonical-initial-viewport.png"),
      fullPage: true,
    });

    const firstRequestCount = canonicalResponses.length;
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5, {
      steps: 12,
    });
    await page.mouse.up();
    await page.waitForFunction(
      (endpoint, count) => performance.getEntriesByType("resource")
        .filter((entry) => entry.name.startsWith(endpoint)).length > count,
      { timeout: 45_000 },
      `${apiUrl}/api/merchants/canonical?`,
      firstRequestCount,
    );
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    await page.screenshot({
      path: path.join(evidenceDir, "canonical-moved-viewport.png"),
      fullPage: true,
    });

    const completedResponses = canonicalResponses.filter((response) => response.body.trim());
    const firstSuccessfulResponse = completedResponses.find((response) => response.status === 200);
    if (!firstSuccessfulResponse) {
      throw new Error("No completed canonical viewport response was captured");
    }
    const firstData = JSON.parse(firstSuccessfulResponse.body).data;
    evidence.pagination = await page.evaluate(async (baseUrl, bbox) => {
      let token = null;
      for (const key of Object.keys(localStorage)) {
        try {
          const value = JSON.parse(localStorage.getItem(key) ?? "null");
          token = value?.access_token ?? value?.currentSession?.access_token ?? null;
          if (token) break;
        } catch {
          // Ignore unrelated local storage entries.
        }
      }
      if (!token) throw new Error("Authenticated browser session unavailable");

      const load = async (offset) => {
        const params = new URLSearchParams({
          west: String(bbox.west),
          south: String(bbox.south),
          east: String(bbox.east),
          north: String(bbox.north),
          limit: "1",
          offset: String(offset),
        });
        const response = await fetch(`${baseUrl}/api/merchants/canonical?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json();
        return {
          id: body.data?.merchants?.[0]?.id ?? null,
          offset: body.data?.offset,
          status: response.status,
          total_available: body.data?.total_available,
        };
      };

      const [first, second] = await Promise.all([load(0), load(1)]);
      return {
        first,
        second,
        stable_total: first.total_available === second.total_available,
        distinct_pages: Boolean(first.id && second.id && first.id !== second.id),
      };
    }, apiUrl, firstData.bbox);

    evidence.aborted_or_empty_responses = canonicalResponses.length - completedResponses.length;
    evidence.requests = completedResponses.map((response) => {
      const parsed = JSON.parse(response.body);
      const data = parsed.data ?? {};
      const bbox = data.bbox ?? {};
      const merchants = data.merchants ?? [];
      return {
        bbox,
        has_more: data.has_more,
        limit: data.limit,
        marker_contract_valid: merchants.every((merchant) =>
          merchant.longitude >= bbox.west && merchant.longitude <= bbox.east &&
          merchant.latitude >= bbox.south && merchant.latitude <= bbox.north
        ),
        offset: data.offset,
        safe_body: !forbiddenTerms.some((term) => response.body.includes(term)),
        status: response.status,
        total_available: data.total_available,
        total_features: data.total_features,
        url_has_bbox: ["west", "south", "east", "north", "limit", "offset"]
          .every((name) => new URL(response.url).searchParams.has(name)),
      };
    });
    await page.waitForFunction(() => {
      const shell = document.querySelector(".map-shell");
      const merchantCount = Number(shell?.dataset.merchantCount ?? 0);
      return merchantCount <= 250 || (
        shell?.dataset.merchantRenderMode === "cluster" &&
        Number(shell?.dataset.renderedClusterFeatures ?? 0) > 0
      );
    }, { timeout: 15_000 });

    evidence.map = await page.evaluate(() => ({
      canvas_pixels_present: Boolean(document.querySelector(".map-canvas canvas")),
      merchant_count: Number(document.querySelector(".map-shell")?.dataset.merchantCount ?? 0),
      marker_count: document.querySelectorAll(".map-marker").length,
      render_mode: document.querySelector(".map-shell")?.dataset.merchantRenderMode,
      rendered_cluster_features: Number(
        document.querySelector(".map-shell")?.dataset.renderedClusterFeatures ?? 0,
      ),
      cluster_source_features: Number(
        document.querySelector(".map-shell")?.dataset.clusterSourceFeatures ?? 0,
      ),
      path: location.pathname,
    }));
    evidence.security = {
      browser_called_mapid_mission: browserRequests.some((url) =>
        url.includes("/web/competition/")
      ),
      safe_urls: !browserRequests.some((url) =>
        forbiddenTerms.some((term) => url.includes(term))
      ),
    };

    if (evidence.requests.length < 2) throw new Error("Viewport move did not reload data");
    if (
      evidence.map.merchant_count > 250 &&
      (evidence.map.render_mode !== "cluster" || evidence.map.rendered_cluster_features < 1)
    ) {
      throw new Error("Large merchant result was not clustered");
    }
    if (
      evidence.pagination.first.status !== 200 ||
      evidence.pagination.second.status !== 200 ||
      !evidence.pagination.stable_total ||
      !evidence.pagination.distinct_pages
    ) throw new Error("Canonical pagination runtime contract failed");
    if (evidence.requests.some((item) =>
      item.status !== 200 || item.total_features > 100 ||
      !item.marker_contract_valid || !item.safe_body || !item.url_has_bbox
    )) throw new Error("Canonical viewport response contract failed");
    if (evidence.security.browser_called_mapid_mission || !evidence.security.safe_urls) {
      throw new Error("Browser security contract failed");
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
