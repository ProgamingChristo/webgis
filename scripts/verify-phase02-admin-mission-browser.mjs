import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import puppeteer from "puppeteer-core";

const appUrl = process.env.GETRA_FRONTEND_URL || "http://localhost:3000";
const apiUrl = process.env.GETRA_API_URL || "http://localhost:8080";
const chromePath =
  process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const password =
  process.env.GETRA_TEST_USER_PASSWORD || "PasswordDevelopment123!";
const adminEmail = process.env.GETRA_ADMIN_TEST_EMAIL || "getra.admin.test@example.com";
const userEmail = process.env.GETRA_USER_TEST_EMAIL || "getra.commuter.test@example.com";
const evidenceDir = path.resolve(
  "docs/refinement/data-architecture/phase-02/browser-evidence",
);
const sources = ["Menu Go", "Struk Go", "Properti Go", "Activities"];
const usePersistedResults = process.argv.includes("--persisted");
const persistedSyncSource = process.argv
  .find((argument) => argument.startsWith("--sync-source="))
  ?.slice("--sync-source=".length);
const forbiddenTerms = [
  "x-api-key",
  "MAPID_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "/web/competition/",
];

async function login(page, email) {
  await page.goto(`${appUrl}/login`, { waitUntil: "networkidle2", timeout: 45_000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await Promise.allSettled([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30_000 }),
    page.locator("button[type=submit]").click(),
  ]);
  await page.waitForFunction(() => !location.pathname.includes("/login"), {
    timeout: 30_000,
  });
}

async function clickSource(page, label, waitForLoading = true) {
  const clicked = await page.evaluate((sourceLabel) => {
    const card = [...document.querySelectorAll("article")].find(
      (element) => element.querySelector("h2")?.textContent?.trim() === sourceLabel,
    );
    const button = card?.querySelector("button");
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  }, label);

  if (!clicked) throw new Error(`Sync control not found for ${label}`);

  if (waitForLoading) {
    await page.waitForFunction(
      (sourceLabel) => {
        const card = [...document.querySelectorAll("article")].find(
          (element) => element.querySelector("h2")?.textContent?.trim() === sourceLabel,
        );
        const button = card?.querySelector("button");
        return button instanceof HTMLButtonElement && button.disabled;
      },
      { timeout: 10_000 },
      label,
    );
  }

  await page.waitForFunction(
    (sourceLabel) => {
      const card = [...document.querySelectorAll("article")].find(
        (element) => element.querySelector("h2")?.textContent?.trim() === sourceLabel,
      );
      const button = card?.querySelector("button");
      return button instanceof HTMLButtonElement && !button.disabled;
    },
    { timeout: 180_000 },
    label,
  );
}

async function findAccessToken(page) {
  return page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      try {
        const value = JSON.parse(localStorage.getItem(key) ?? "null");
        const token = value?.access_token ?? value?.currentSession?.access_token;
        if (typeof token === "string") return token;
      } catch {
        // Ignore non-JSON browser storage entries.
      }
    }
    return null;
  });
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--disable-gpu", "--disable-dev-shm-usage", "--no-default-browser-check"],
  });

  const evidence = {
    admin: {},
    anonymous: {},
    browser: "Chrome headless via puppeteer-core",
    generated_at: new Date().toISOString(),
    network: [],
    user: {},
  };

  try {
    const adminContext = await browser.createBrowserContext();
    const page = await adminContext.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    const missionResponses = [];
    page.on("response", async (response) => {
      if (
        response.url() === `${apiUrl}/api/admin/mission/sync` &&
        response.request().method() !== "OPTIONS"
      ) {
        const body = await response.text().catch(() => "");
        missionResponses.push({
          body,
          method: response.request().method(),
          status: response.status(),
          url: response.url(),
        });
      }
    });

    await login(page, adminEmail);
    await page.goto(`${appUrl}/admin/mission-data`, {
      waitUntil: "networkidle2",
      timeout: 45_000,
    });
    await page.waitForSelector("article", { timeout: 30_000 });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("article")].some((card) =>
          /Berhasil|Peringatan|Gagal|Terblokir/.test(card.textContent ?? ""),
        ) || Boolean(document.querySelector('[role="alert"]')),
      { timeout: 30_000 },
    );

    const initial = await page.evaluate(() => ({
      horizontal_overflow:
        Math.ceil(document.documentElement.scrollWidth) > Math.ceil(window.innerWidth + 2),
      sources: [...document.querySelectorAll("article h2")].map(
        (element) => element.textContent?.trim() ?? "",
      ),
      url: location.href,
    }));
    evidence.admin.initial = initial;
    await page.screenshot({
      fullPage: true,
      path: path.join(evidenceDir, "admin-mission-data-desktop.png"),
    });

    if (!usePersistedResults) {
      for (const source of sources) {
        console.log(`[Phase 02 browser] Syncing ${source}`);
        await clickSource(page, source);
      }
    } else if (persistedSyncSource && sources.includes(persistedSyncSource)) {
      console.log(`[Phase 02 browser] Syncing ${persistedSyncSource}`);
      await clickSource(page, persistedSyncSource);
    }

    const finalCards = await page.evaluate(() =>
      [...document.querySelectorAll("article")].map((card) => ({
        source: card.querySelector("h2")?.textContent?.trim() ?? "",
        text: card.textContent?.replace(/\s+/g, " ").trim() ?? "",
      })),
    );
    evidence.admin.final_cards = finalCards;
    await page.screenshot({
      fullPage: true,
      path: path.join(evidenceDir, "admin-mission-data-success.png"),
    });

    const postResponses = missionResponses.filter((item) => item.method === "POST");
    const latestHistoryResponse = missionResponses
      .filter((item) => item.method === "GET" && item.status === 200)
      .at(-1);
    evidence.network = missionResponses.map((item) => ({
      method: item.method,
      safe_body: !forbiddenTerms.some((term) => item.body.includes(term)),
      status: item.status,
      url: item.url,
    }));
    const postedResults = postResponses.map((item) => {
      const parsed = JSON.parse(item.body);
      return {
        failed: parsed.data?.failed,
        fetched: parsed.data?.fetched,
        inserted: parsed.data?.inserted,
        invalid: parsed.data?.invalid,
        source: parsed.data?.source,
        status: parsed.data?.status,
        updated: parsed.data?.updated,
      };
    });
    const persistedResults = latestHistoryResponse
      ? JSON.parse(latestHistoryResponse.body).data?.sources ?? []
      : [];
    evidence.admin.sync_results =
      postedResults.length === sources.length ? postedResults : persistedResults;

    await page.setRequestInterception(true);
    const failureInterceptor = (request) => {
      if (
        request.url() === `${apiUrl}/api/admin/mission/sync` &&
        request.method() === "POST"
      ) {
        void request.respond({
          body: JSON.stringify({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Internal server error" },
          }),
          contentType: "application/json",
          status: 500,
        });
      } else {
        void request.continue();
      }
    };
    page.on("request", failureInterceptor);
    await clickSource(page, "Menu Go", false);
    await page.waitForFunction(
      () => {
        const menuCard = [...document.querySelectorAll("article")].find(
          (card) => card.querySelector("h2")?.textContent?.trim() === "Menu Go",
        );
        return Boolean(menuCard?.querySelector('[role="alert"]'));
      },
      { timeout: 10_000 },
    );
    evidence.admin.failure_state = await page.evaluate(() =>
      [...document.querySelectorAll("article")]
        .find((card) => card.querySelector("h2")?.textContent?.trim() === "Menu Go")
        ?.textContent?.replace(/\s+/g, " ").trim(),
    );
    await page.screenshot({
      fullPage: true,
      path: path.join(evidenceDir, "admin-mission-data-failure.png"),
    });
    page.off("request", failureInterceptor);
    await page.setRequestInterception(false);

    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
    });
    await page.reload({ waitUntil: "networkidle2", timeout: 45_000 });
    await page.waitForSelector("article", { timeout: 30_000 });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("article")].some((card) =>
          /Berhasil|Peringatan|Gagal|Terblokir/.test(card.textContent ?? ""),
        ) || Boolean(document.querySelector('[role="alert"]')),
      { timeout: 30_000 },
    );
    evidence.admin.mobile = await page.evaluate(() => ({
      horizontal_overflow:
        Math.ceil(document.documentElement.scrollWidth) > Math.ceil(window.innerWidth + 2),
      source_count: document.querySelectorAll("article").length,
    }));
    await page.screenshot({
      fullPage: true,
      path: path.join(evidenceDir, "admin-mission-data-mobile.png"),
    });
    await adminContext.close();

    const userContext = await browser.createBrowserContext();
    const userPage = await userContext.newPage();
    await login(userPage, userEmail);
    await userPage.goto(`${appUrl}/admin/mission-data`, {
      waitUntil: "networkidle2",
      timeout: 45_000,
    });
    await userPage.waitForFunction(() => !location.pathname.startsWith("/admin"), {
      timeout: 30_000,
    });
    const userToken = await findAccessToken(userPage);
    const userApiStatus = await userPage.evaluate(
      async ({ endpoint, token }) => {
        const response = await fetch(endpoint, {
          body: JSON.stringify({ source: "MENU_GO" }),
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        return response.status;
      },
      { endpoint: `${apiUrl}/api/admin/mission/sync`, token: userToken },
    );
    evidence.user = { api_status: userApiStatus, redirected_to: userPage.url() };
    await userContext.close();

    const anonymousStatus = await fetch(`${apiUrl}/api/admin/mission/sync`, {
      body: JSON.stringify({ source: "MENU_GO" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).then((response) => response.status);
    evidence.anonymous = { api_status: anonymousStatus };

    const allSourcesVisible =
      initial.sources.length === sources.length &&
      sources.every((source) => initial.sources.includes(source));
    const syncPassed =
      evidence.admin.sync_results.length === sources.length &&
      evidence.admin.sync_results.every((result) => result.status === "COMPLETED");
    const networkSafe = evidence.network.every(
      (item) => item.url === `${apiUrl}/api/admin/mission/sync` && item.safe_body,
    );
    evidence.pass =
      allSourcesVisible &&
      syncPassed &&
      networkSafe &&
      !initial.horizontal_overflow &&
      !evidence.admin.mobile.horizontal_overflow &&
      evidence.user.api_status === 403 &&
      evidence.anonymous.api_status === 401;

    await writeFile(
      path.join(evidenceDir, "browser-verification.json"),
      `${JSON.stringify(evidence, null, 2)}\n`,
      "utf8",
    );

    console.log(
      JSON.stringify(
        {
          anonymous_status: evidence.anonymous.api_status,
          mobile_overflow: evidence.admin.mobile.horizontal_overflow,
          network_safe: networkSafe,
          pass: evidence.pass,
          sources: evidence.admin.sync_results,
          user_status: evidence.user.api_status,
        },
        null,
        2,
      ),
    );

    if (!evidence.pass) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

await main();
