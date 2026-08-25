import fs from "node:fs/promises";
import http from "node:http";
import { once } from "node:events";
import { WebSocket } from "ws";

const chromePath =
  process.env.GETRA_CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const url =
  process.env.GETRA_CAPTURE_URL ||
  "http://localhost:3000/";

const out =
  process.env.GETRA_CAPTURE_OUT ||
  "frontend/public/images/landing/getra-route-showcase-raw.png";

const remotePort =
  Number(process.env.GETRA_CAPTURE_PORT || 9333);

const waitMs =
  Number(process.env.GETRA_CAPTURE_WAIT_MS || 7000);

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

function cdpCall(socket, id, method, params = {}) {
  socket.send(JSON.stringify({ id, method, params }));
}

async function main() {
  const { spawn } = await import("node:child_process");
  const userDataDir =
    await fs.mkdtemp(
      `${process.cwd()}\\.tmp-chrome-landing-`,
    );

  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--disable-dev-shm-usage",
      "--enable-webgl",
      `--remote-debugging-port=${remotePort}`,
      `--user-data-dir=${userDataDir}`,
      "--window-size=1440,900",
      url,
    ],
    {
      stdio: "ignore",
      windowsHide: true,
    },
  );

  try {
    await waitForDebugTarget();
    const tabs =
      await getJson(
        `http://127.0.0.1:${remotePort}/json`,
      );
    const page =
      tabs.find((tab) => tab.type === "page") ||
      tabs[0];

    if (!page?.webSocketDebuggerUrl) {
      throw new Error("No Chrome page target available.");
    }

    const socket =
      new WebSocket(page.webSocketDebuggerUrl);
    await once(socket, "open");

    let nextId = 1;
    const pending = new Map();

    socket.on("message", (raw) => {
      const message = JSON.parse(String(raw));
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
        cdpCall(socket, id, method, params);
      });

    await call("Page.enable");
    await call("Runtime.enable");
    await call("Page.navigate", { url });
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    await call("Runtime.evaluate", {
      expression:
        "document.querySelector('body')?.classList.add('getra-capture-ready')",
    });

    const result =
      await call("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        clip: {
          x: 520,
          y: 88,
          width: 860,
          height: 600,
          scale: 1,
        },
      });

    await fs.writeFile(out, result.data, "base64");
    socket.close();
  } finally {
    chrome.kill();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await fs.rm(userDataDir, {
          recursive: true,
          force: true,
        });
        break;
      } catch (error) {
        if (attempt === 4) {
          console.warn(
            `Could not remove temporary Chrome profile: ${error.message}`,
          );
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
