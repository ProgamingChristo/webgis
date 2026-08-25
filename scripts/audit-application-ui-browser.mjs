import puppeteer from "puppeteer-core";

const chromePath =
  process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl =
  process.env.GETRA_APP_AUDIT_URL ||
  "http://localhost:3000";
const email =
  process.env.GETRA_E2E_EMAIL ||
  "";
const password =
  process.env.GETRA_E2E_PASSWORD ||
  "";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1366, height: 768 },
  { name: "wide", width: 1920, height: 1080 },
];

const routes = [
  "/login",
  "/signup",
  "/onboarding",
  "/app",
  "/community",
  "/umkm",
  "/umkm/advertising",
  "/umkm/advertising/analytics",
  "/settings/profile",
  "/users",
  "/admin/import",
];

function isCriticalConsole(message) {
  const text = message.text();
  return (
    message.type() === "error" &&
    !/favicon|Failed to load resource: the server responded with a status of 401/i.test(text)
  );
}

async function login(page) {
  if (!email || !password) {
    return {
      attempted: false,
      ok: false,
      reason: "GETRA_E2E_EMAIL/GETRA_E2E_PASSWORD not provided",
    };
  }

  await page.goto(`${baseUrl}/login`, {
    waitUntil: "networkidle2",
    timeout: 30_000,
  });
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill(password);
  await Promise.allSettled([
    page.waitForNavigation({
      waitUntil: "networkidle2",
      timeout: 20_000,
    }),
    page.locator("button[type=submit]").click(),
  ]);

  const currentUrl = page.url();
  return {
    attempted: true,
    ok: !currentUrl.includes("/login"),
    currentUrl,
  };
}

async function auditRoute(browser, route, viewport) {
  const page = await browser.newPage();
  const consoleErrors = [];
  const networkErrors = [];

  page.on("console", (message) => {
    if (isCriticalConsole(message)) {
      consoleErrors.push(message.text());
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.name === "mobile" ? 2 : 1,
    isMobile: viewport.name === "mobile",
  });

  await page.goto(`${baseUrl}${route}`, {
    waitUntil: "networkidle2",
    timeout: 40_000,
  });

  await page.waitForSelector("body", {
    timeout: 10_000,
  });
  await page
    .waitForFunction(
      () => !document.body.innerText.includes("MENYIAPKAN GETRA"),
      {
        timeout: 8_000,
      },
    )
    .catch(() => undefined);

  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const shell =
      document.querySelector(".getra-app-shell") ||
      document.querySelector(".workspace") ||
      document.querySelector("[class*='page']");
    const menuButton = document.querySelector(".getra-app-menu-button");

    return {
      title: document.title,
      bodyText: body.innerText.slice(0, 260),
      hasShell: Boolean(shell),
      hasMobileMenuButton: Boolean(menuButton),
      stillLoading: body.innerText.includes("MENYIAPKAN GETRA"),
      horizontalOverflow:
        Math.ceil(doc.scrollWidth) > Math.ceil(window.innerWidth + 2),
      scrollWidth: doc.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
  const currentUrl = page.url();

  await page.close();

  return {
    route,
    viewport: viewport.name,
    url: currentUrl,
    ...result,
    consoleErrors,
    networkErrors,
    pass:
      result.hasShell &&
      !result.stillLoading &&
      !result.horizontalOverflow &&
      consoleErrors.length === 0 &&
      networkErrors.length === 0,
  };
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-default-browser-check",
      "--window-size=1366,768",
    ],
  });

  try {
    const loginPage = await browser.newPage();
    const loginResult = await login(loginPage);
    await loginPage.close();

    const results = [];
    for (const viewport of viewports) {
      for (const route of routes) {
        results.push(await auditRoute(browser, route, viewport));
      }
    }

    const failed = results.filter((item) => !item.pass);

    console.log(
      JSON.stringify(
        {
          login: loginResult,
          checked: results.length,
          failed: failed.length,
          failures: failed.map((item) => ({
            route: item.route,
            viewport: item.viewport,
            hasShell: item.hasShell,
            horizontalOverflow: item.horizontalOverflow,
            consoleErrors: item.consoleErrors,
            networkErrors: item.networkErrors,
            bodyText: item.bodyText,
          })),
        },
        null,
        2,
      ),
    );

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
