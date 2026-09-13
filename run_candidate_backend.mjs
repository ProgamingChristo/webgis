import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve("backend/.env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

process.env.PORT = "8180";
process.env.NODE_ENV = "production";
process.env.FRONTEND_ALLOWED_ORIGINS = "http://localhost:3000,http://localhost:5173,http://localhost:3100";

await import("./backend/.next/standalone/backend/server.js");
