import { createServer } from "node:net";
import { spawn } from "node:child_process";
import http from "node:http";

const [, , appName, preferredPortArg] = process.argv;

const preferredPort = Number.parseInt(preferredPortArg ?? "", 10);

if (!appName || !Number.isInteger(preferredPort) || preferredPort <= 0) {
  console.error("Usage: node ../scripts/dev-next.mjs <app-name> <preferred-port>");
  process.exit(1);
}

async function canListen(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 100; port += 1) {
    if (await canListen(port)) {
      return port;
    }
  }

  throw new Error(`No available port found from ${startPort} to ${startPort + 99}`);
}

async function isExistingAppReachable(port) {
  const path = appName === "backend" ? "/api/health" : "/";

  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname: "localhost",
        port,
        path,
        timeout: 5000,
      },
      (response) => {
        response.resume();
        resolve((response.statusCode ?? 500) < 500);
      },
    );

    request.once("error", () => resolve(false));
    request.once("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

if (!(await canListen(preferredPort)) && (await isExistingAppReachable(preferredPort))) {
  console.log(
    `[GETRA] ${appName} dev server is already running at http://localhost:${preferredPort}`,
  );
  process.exit(0);
}

const port = await findAvailablePort(preferredPort);

if (port === preferredPort) {
  console.log(`[GETRA] ${appName} dev server using http://localhost:${port}`);
} else {
  console.log(
    `[GETRA] ${appName} preferred port ${preferredPort} is busy; using http://localhost:${port}`,
  );
}

const child = spawn(
  process.execPath,
  ["../node_modules/next/dist/bin/next", "dev", "-p", String(port)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(port),
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }

  process.exit(code ?? 0);
});
