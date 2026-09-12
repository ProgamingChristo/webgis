import fs from "node:fs";
import { spawn } from "node:child_process";
import http from "node:http";

const backendCwd = "D:\\Getra_UMKM_Submission_Fix\\backend";
const frontendCwd = "D:\\Getra_UMKM_Submission_Fix\\frontend";

// Sync latest static assets and public assets into standalone builds
console.log("[Candidate Runtime] Synchronizing latest static and public assets...");
fs.cpSync("D:\\Getra_UMKM_Submission_Fix\\frontend\\.next\\static", "D:\\Getra_UMKM_Submission_Fix\\frontend\\.next\\standalone\\frontend\\.next\\static", { recursive: true, force: true });
fs.cpSync("D:\\Getra_UMKM_Submission_Fix\\frontend\\public", "D:\\Getra_UMKM_Submission_Fix\\frontend\\.next\\standalone\\frontend\\public", { recursive: true, force: true });
if (fs.existsSync("D:\\Getra_UMKM_Submission_Fix\\backend\\.next\\static")) {
  fs.cpSync("D:\\Getra_UMKM_Submission_Fix\\backend\\.next\\static", "D:\\Getra_UMKM_Submission_Fix\\backend\\.next\\standalone\\backend\\.next\\static", { recursive: true, force: true });
}

console.log("[Candidate Runtime] Starting Candidate Backend on port 8180...");
const backendProcess = spawn(
  process.execPath,
  ["D:\\Getra_UMKM_Submission_Fix\\backend\\.next\\standalone\\backend\\server.js"],
  {
    cwd: backendCwd,
    env: {
      ...process.env,
      PORT: "8180",
      HOSTNAME: "0.0.0.0",
      NEXT_PUBLIC_SUPABASE_URL: "https://sesakxnjaphrxqxllqjm.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_XCmI_30nkk3NS1VdsQl1bg_g9xUNkW6",
      SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlc2FreG5qYXBocnhxeGxscWptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUzOTk0OCwiZXhwIjoyMTAyMTE1OTQ4fQ.iCkUIPqX-VcYIkIi3M4n89voeTkG0NUy7HRGz6zD80U",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);

backendProcess.stdout.on("data", (d) => process.stdout.write(`[BACKEND-8180] ${d}`));
backendProcess.stderr.on("data", (d) => process.stderr.write(`[BACKEND-8180-ERR] ${d}`));

console.log("[Candidate Runtime] Starting Candidate Frontend on port 3100...");
const frontendProcess = spawn(
  process.execPath,
  ["D:\\Getra_UMKM_Submission_Fix\\frontend\\.next\\standalone\\frontend\\server.js"],
  {
    cwd: frontendCwd,
    env: {
      ...process.env,
      PORT: "3100",
      HOSTNAME: "0.0.0.0",
      GETRA_BACKEND_INTERNAL_URL: "http://localhost:8180",
      NEXT_PUBLIC_GETRA_API_URL: "http://localhost:3100",
      NEXT_PUBLIC_SUPABASE_URL: "https://sesakxnjaphrxqxllqjm.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_XCmI_30nkk3NS1VdsQl1bg_g9xUNkW6",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);

frontendProcess.stdout.on("data", (d) => process.stdout.write(`[FRONTEND-3100] ${d}`));
frontendProcess.stderr.on("data", (d) => process.stderr.write(`[FRONTEND-3100-ERR] ${d}`));

backendProcess.on("exit", (code, signal) => console.error(`[CRITICAL] Backend 8180 exited with code ${code} signal ${signal}`));
backendProcess.on("error", (err) => console.error(`[CRITICAL] Backend 8180 error:`, err));

frontendProcess.on("exit", (code, signal) => console.error(`[CRITICAL] Frontend 3100 exited with code ${code} signal ${signal}`));
frontendProcess.on("error", (err) => console.error(`[CRITICAL] Frontend 3100 error:`, err));

async function checkUrl(url, timeout = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Poll until both ready, then keep-alive
let attempts = 0;
let isReady = false;
const checkInterval = setInterval(async () => {
  attempts++;
  const backendReady = await checkUrl("http://localhost:8180/api/health");
  const frontendReady = await checkUrl("http://localhost:3100/umkm");

  if (!isReady && backendReady && frontendReady) {
    isReady = true;
    console.log("\n>>> [SUCCESS] CANDIDATE RUNTIME FULLY READY!");
    console.log(">>> Frontend: http://localhost:3100");
    console.log(">>> Backend:  http://localhost:8180\n");
  } else if (!isReady && attempts > 35) {
    console.error("\n>>> [TIMEOUT] Candidate runtime failed to start within 35 seconds.");
  }
}, 1000);

// Keep-alive heartbeat so supervisor never terminates
setInterval(() => {
  // heartbeat
}, 30000);

process.on("SIGINT", () => {
  backendProcess.kill();
  frontendProcess.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  backendProcess.kill();
  frontendProcess.kill();
  process.exit(0);
});
