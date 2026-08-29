import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import nextEnv from "@next/env";
import puppeteer from "puppeteer-core";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(path.resolve("frontend"));

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const chromePath = process.env.GETRA_CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const evidenceDir = path.resolve("tmp", "basemap-evidence");

const styles = [
  { id: "mapid-basic", label: "Street", path: "/styles/basic/style.json" },
  { id: "mapid-street-2d-building", label: "Street 2D", path: "/styles/street-2d-building/style.json" },
  { id: "mapid-satellite", label: "Satelit", path: "/styles/satellite/style.json" },
  { id: "mapid-dark", label: "Dark", path: "/styles/dark/style.json" },
  { id: "mapid-light", label: "Light", path: "/styles/light/style.json" },
];

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
    styles: [],
    persistence: {},
    console_errors: [],
    failed_requests: [],
    error: null,
  };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
    page.on("console", (message) => {
      if (message.type() === "error") evidence.console_errors.push(message.text());
    });
    page.on("pageerror", (error) => evidence.console_errors.push(error.message));
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      if (url.hostname === "basemap.mapid.io") {
        evidence.failed_requests.push({
          host: url.hostname,
          path: url.pathname,
          error: request.failure()?.errorText,
        });
      }
    });

    await login(page);
    await page.waitForSelector(".basemap-button", { timeout: 30_000 });

    for (const style of styles) {
      const styleResponsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.hostname === "basemap.mapid.io" && url.pathname === style.path;
      }, { timeout: 45_000 });

      await page.evaluate((label) => {
        const button = [...document.querySelectorAll(".basemap-button")].find((node) =>
          node.textContent?.trim().startsWith(label),
        );
        if (!(button instanceof HTMLButtonElement)) throw new Error(`Basemap button not found: ${label}`);
        button.click();
      }, style.label);

      const response = await styleResponsePromise;
      await page.waitForFunction((id) => localStorage.getItem("getra:basemap:v1") === id, { timeout: 10_000 }, style.id);
      await page.waitForFunction(() => {
        const canvas = document.querySelector(".map-canvas canvas");
        return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0;
      }, { timeout: 30_000 });

      const active = await page.evaluate((id) => {
        const labelsById = {
          "mapid-basic": "Street",
          "mapid-street-2d-building": "Street 2D",
          "mapid-satellite": "Satelit",
          "mapid-dark": "Dark",
          "mapid-light": "Light",
        };
        const label = labelsById[id];
        const button = [...document.querySelectorAll(".basemap-button")].find((node) =>
          node.textContent?.trim().startsWith(label),
        );
        const canvas = document.querySelector(".map-canvas canvas");
        return {
          aria_pressed: button?.getAttribute("aria-pressed"),
          button_text: button?.textContent?.replace(/\s+/g, " ").trim(),
          canvas_pixels: canvas instanceof HTMLCanvasElement ? canvas.width * canvas.height : 0,
        };
      }, style.id);

      evidence.styles.push({
        id: style.id,
        label: style.label,
        response_status: response.status(),
        response_path: style.path,
        query_key_redacted: true,
        ...active,
      });
    }

    await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForSelector(".basemap-button", { timeout: 30_000 });
    await page.waitForFunction(() => {
      const active = document.querySelector('.basemap-button[aria-pressed="true"]');
      const canvas = document.querySelector(".map-canvas canvas");
      return Boolean(active) && canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0;
    }, { timeout: 30_000 });
    evidence.persistence = await page.evaluate(() => {
      const stored = localStorage.getItem("getra:basemap:v1");
      const active = document.querySelector('.basemap-button[aria-pressed="true"]');
      return {
        stored,
        active_label: active?.textContent?.replace(/\s+/g, " ").trim(),
      };
    });

    await page.screenshot({ path: path.join(evidenceDir, "mapid-basemap-1366x768.png"), fullPage: true });
  } catch (error) {
    evidence.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw error;
  } finally {
    await writeFile(path.join(evidenceDir, "mapid-basemap-evidence.json"), JSON.stringify(evidence, null, 2));
    await browser.close().catch(() => undefined);
  }

  console.log(JSON.stringify({
    evidence: path.join(evidenceDir, "mapid-basemap-evidence.json"),
    screenshot: path.join(evidenceDir, "mapid-basemap-1366x768.png"),
    style_count: evidence.styles.length,
    statuses: evidence.styles.map((item) => ({ id: item.id, status: item.response_status, active: item.aria_pressed })),
    persistence: evidence.persistence,
    console_errors: evidence.console_errors.length,
    failed_requests: evidence.failed_requests.length,
  }));
}

await main();
