import fs from "node:fs/promises";
import http from "node:http";
import { once } from "node:events";
import { WebSocket } from "ws";

const chromePath =
  process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl =
  process.env.GETRA_AUDIT_URL ||
  "http://localhost:3000/";
const remotePort =
  Number(process.env.GETRA_AUDIT_PORT || 9334);

const viewportMatrix = [
  { name: "360x800", width: 360, height: 800, group: "mobile" },
  { name: "390x844", width: 390, height: 844, group: "mobile" },
  { name: "430x932", width: 430, height: 932, group: "mobile" },
  { name: "768x1024", width: 768, height: 1024, group: "tablet-portrait" },
  { name: "1024x768", width: 1024, height: 768, group: "tablet-landscape" },
  { name: "1280x720", width: 1280, height: 720, group: "laptop" },
  { name: "1366x768", width: 1366, height: 768, group: "laptop" },
  { name: "1440x900", width: 1440, height: 900, group: "desktop" },
  { name: "1536x864", width: 1536, height: 864, group: "desktop" },
  { name: "1920x1080", width: 1920, height: 1080, group: "desktop" },
];

const orientationMatrix = [
  { name: "mobile-portrait-390x844", width: 390, height: 844, group: "orientation" },
  { name: "mobile-landscape-844x390", width: 844, height: 390, group: "orientation" },
  { name: "tablet-portrait-768x1024", width: 768, height: 1024, group: "orientation" },
  { name: "tablet-landscape-1024x768", width: 1024, height: 768, group: "orientation" },
];

const zoomMatrix = [
  { name: "1366x768-zoom-100", width: 1366, height: 768, group: "zoom", zoom: 1 },
  { name: "1366x768-zoom-125", width: 1093, height: 614, group: "zoom", zoom: 1.25 },
  { name: "1366x768-zoom-150", width: 911, height: 512, group: "zoom", zoom: 1.5 },
];

function getJson(endpoint) {
  return new Promise((resolve, reject) => {
    http
      .get(endpoint, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function waitForDebugTarget() {
  const endpoint = `http://127.0.0.1:${remotePort}/json/version`;
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    try {
      return await getJson(endpoint);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error("Chrome DevTools endpoint was not available.");
}

async function removeWithRetry(target) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await fs.rm(target, {
        recursive: true,
        force: true,
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

async function main() {
  const { spawn } = await import("node:child_process");
  const userDataDir =
    await fs.mkdtemp(
      `${process.cwd()}\\.tmp-chrome-landing-audit-`,
    );

  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${remotePort}`,
      `--user-data-dir=${userDataDir}`,
      "--window-size=1440,900",
      baseUrl,
    ],
    {
      stdio: "ignore",
      windowsHide: true,
    },
  );

  const criticalConsole = [];
  const criticalNetwork = [];

  try {
    await waitForDebugTarget();
    const tabs =
      await getJson(
        `http://127.0.0.1:${remotePort}/json`,
      );
    const page =
      tabs.find((tab) => tab.type === "page") ||
      tabs[0];

    const socket =
      new WebSocket(page.webSocketDebuggerUrl);
    await once(socket, "open");

    let nextId = 1;
    const pending = new Map();

    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw));

      if (
        message.method ===
          "Runtime.exceptionThrown" ||
        message.method ===
          "Log.entryAdded"
      ) {
        criticalConsole.push(message.params);
      }

      if (
        message.method ===
          "Network.responseReceived" &&
        message.params?.response?.status >= 400
      ) {
        const response = message.params.response;
        criticalNetwork.push({
          status: response.status,
          url: response.url,
        });
      }

      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
      }
    });

    const call = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });

    await call("Page.enable");
    await call("Runtime.enable");
    await call("Log.enable");
    await call("Network.enable");

    const viewportResults = [];
    const auditCases = [
      ...viewportMatrix,
      ...orientationMatrix,
      ...zoomMatrix,
    ];

    for (const auditCase of auditCases) {
      await call("Emulation.setDeviceMetricsOverride", {
        width: auditCase.width,
        height: auditCase.height,
        deviceScaleFactor: 1,
        mobile: auditCase.width < 768,
      });
      await call("Page.navigate", { url: baseUrl });
      await new Promise((resolve) => setTimeout(resolve, 3200));

      const evaluation =
        await call("Runtime.evaluate", {
          returnByValue: true,
          awaitPromise: true,
          expression: `(async () => {
            const required = [
              'Geo-Enabled',
              'Why GETRA exists',
              'GETRA WebGIS',
              'A map-powered application layer designed to support spatial collaboration, survey execution, and location-based communities.',
              'Fair Discovery',
              'GETRA Community',
              'GETRA for UMKM',
              'Advertising Manager',
              'Business Space Intelligence',
              'Technology',
              'MAPID 2025 / 2026 competition context'
            ];
            const text = document.body.textContent || '';
            const missing = required.filter((item) => !text.includes(item));
            const anchors = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
            const deadLinks = anchors.filter((href) => href === '#' || href?.startsWith('javascript:'));
            const horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth + 2;
            const officialLogos = [...document.querySelectorAll('img[alt="GETRA — Geo-Enabled Transit & Retail Analytics"]')];
            const visibleOfficialLogos = officialLogos
              .map((logo) => logo.getBoundingClientRect())
              .filter((rect) => rect.width > 110 && rect.height > 34);
            const officialLogoVisible = visibleOfficialLogos.length > 0;
            const logoAspectRatios = visibleOfficialLogos.map((rect) => Number((rect.width / rect.height).toFixed(2)));
            const header = document.querySelector('header nav');
            const headerRect = header?.getBoundingClientRect();
            const headerStable = Boolean(headerRect) && headerRect.height >= 56 && headerRect.height <= 112;
            const heroMap = document.querySelector('[aria-label^="Ilustrasi WebGIS GETRA"]');
            const heroMapRect = heroMap?.getBoundingClientRect();
            const heroMapContained = Boolean(heroMapRect) &&
              heroMapRect.width <= window.innerWidth &&
              heroMapRect.height >= 280 &&
              heroMapRect.height <= Math.max(680, window.innerHeight * 1.35);
            const realMapScreenshot = document.querySelector('img[alt^="Peta GETRA yang menampilkan rute pedestrian"]');
            const realMapRect = realMapScreenshot?.getBoundingClientRect();
            const realMapReadable = Boolean(realMapRect) &&
              realMapRect.width >= Math.min(300, window.innerWidth - 32) &&
              realMapRect.height >= 190;
            const visibleControls = [...document.querySelectorAll('a, button')]
              .filter((element) => {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
              })
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                  label: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 48),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                };
              });
            const tinyTouchTargets = visibleControls
              .filter((control) => !(control.width <= 1 && control.height <= 1))
              .filter((control) => control.width < 32 || control.height < 32)
              .slice(0, 8);
            const menuButton = document.querySelector('[aria-controls="landing-mobile-menu"]');
            let mobileMenuOpened = true;
            let mobileMenuEscapeClosed = true;
            let mobileMenuAnchorClosed = true;
            if (menuButton && window.innerWidth < 1024) {
              menuButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              await new Promise((resolve) => setTimeout(resolve, 160));
              mobileMenuOpened = Boolean(document.querySelector('#landing-mobile-menu'));
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              await new Promise((resolve) => setTimeout(resolve, 160));
              mobileMenuEscapeClosed = !document.querySelector('#landing-mobile-menu');
              menuButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              await new Promise((resolve) => setTimeout(resolve, 160));
              const firstMenuLink = document.querySelector('#landing-mobile-menu a[href^="#"]');
              firstMenuLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              await new Promise((resolve) => setTimeout(resolve, 160));
              mobileMenuAnchorClosed = !document.querySelector('#landing-mobile-menu');
            }
            const sections = [
              '#tentang',
              '#cara-kerja',
              '#fitur',
              '#umkm',
              '#teknologi',
            ].map((selector) => ({ selector, present: Boolean(document.querySelector(selector)) }));
            return {
              name: ${JSON.stringify(auditCase.name)},
              group: ${JSON.stringify(auditCase.group)},
              requestedWidth: ${auditCase.width},
              requestedHeight: ${auditCase.height},
              zoom: ${auditCase.zoom || 1},
              width: window.innerWidth,
              height: window.innerHeight,
              missing,
              deadLinks,
              horizontalOverflow,
              documentWidth: document.documentElement.scrollWidth,
              officialLogoCount: officialLogos.length,
              officialLogoVisible,
              logoAspectRatios,
              headerStable,
              heroMapContained,
              realMapReadable,
              tinyTouchTargets,
              mobileMenuOpened,
              mobileMenuEscapeClosed,
              mobileMenuAnchorClosed,
              sections,
            };
          })()`,
        });

      viewportResults.push(evaluation.result.value);
    }

    socket.close();

    const sameOriginCriticalNetwork =
      criticalNetwork.filter((entry) =>
        entry.url.startsWith(baseUrl),
      );

    const result = {
      url: baseUrl,
      viewportResults,
      criticalConsoleCount:
        criticalConsole.length,
      sameOriginCriticalNetwork,
    };

    console.log(JSON.stringify(result, null, 2));

    const failedViewport =
      viewportResults.find(
        (item) =>
          item.missing.length ||
          item.deadLinks.length ||
          item.horizontalOverflow ||
          !item.officialLogoVisible ||
          !item.headerStable ||
          !item.heroMapContained ||
          !item.realMapReadable ||
          item.tinyTouchTargets.length ||
          !item.mobileMenuOpened ||
          !item.mobileMenuEscapeClosed ||
          !item.mobileMenuAnchorClosed ||
          item.sections.some((section) => !section.present),
      );

    if (
      failedViewport ||
      criticalConsole.length ||
      sameOriginCriticalNetwork.length
    ) {
      process.exitCode = 1;
    }
  } finally {
    chrome.kill();
    await removeWithRetry(userDataDir);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
