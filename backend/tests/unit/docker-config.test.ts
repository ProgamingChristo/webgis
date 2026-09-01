import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = join(import.meta.dirname, "..", "..", "..");

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), "utf8");
}

describe("Docker deployment configuration", () => {
  it("builds a three-stage Next.js standalone image with a non-root runtime", () => {
    const dockerfile = readProjectFile("Dockerfile");

    expect(dockerfile.match(/^FROM node:22-bookworm-slim AS /gm)).toHaveLength(3);
    expect(dockerfile).toContain("AS deps");
    expect(dockerfile).toContain("AS builder");
    expect(dockerfile).toContain("AS runner");
    expect(dockerfile).toContain("COPY frontend/package.json ./frontend/package.json");
    expect(dockerfile).toContain("COPY backend/package.json ./backend/package.json");
    expect(dockerfile).toContain("RUN npm ci");
    expect(dockerfile).toContain("RUN npm run build -w backend");
    expect(dockerfile).toContain("/app/backend/.next/standalone");
    expect(dockerfile).toContain("/app/backend/.next/static");
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain("EXPOSE 3000");
    expect(dockerfile).toContain('CMD ["node", "backend/server.js"]');
    expect(dockerfile).not.toContain("npm run dev");
  });

  it("checks real application readiness without adding a healthcheck package", () => {
    const dockerfile = readProjectFile("Dockerfile");

    expect(dockerfile).toContain("HEALTHCHECK");
    expect(dockerfile).toContain("http://127.0.0.1:3000/api/health");
    expect(dockerfile).toContain("AbortSignal.timeout(4000)");
    expect(dockerfile).not.toMatch(/apt-get|apk add|curl|wget/);
  });

  it("excludes environment files and non-runtime artifacts from the build context", () => {
    const dockerignore = readProjectFile(".dockerignore");

    for (const ignoredPath of [
      ".git",
      ".next",
      "node_modules",
      ".env.*",
      "coverage",
      "tests",
      "docs",
      "supabase",
      "routing-data",
    ]) {
      expect(dockerignore).toContain(ignoredPath);
    }

    expect(dockerignore).not.toMatch(/^!\.env/m);
  });

  it("uses a conflict-free host port, bounded healthcheck, and restart policy", () => {
    const compose = readProjectFile("docker-compose.yml");
    const routingCompose = readProjectFile("docker-compose.routing.yml");
    const productionCompose = readProjectFile("docker-compose.prod.yml");

    expect(compose).toContain("${GETRA_BIND_ADDRESS:-127.0.0.1}");
    expect(compose).toContain('${GETRA_DOCKER_PORT:-3002}:3000');
    expect(compose).toContain("target: runner");
    expect(compose).toContain("restart: unless-stopped");
    expect(compose).toContain("stop_grace_period: 30s");
    expect(compose).toContain("http://127.0.0.1:3000/api/health");
    expect(compose).not.toMatch(/next\s+dev|npm\s+run\s+dev/);
    expect(productionCompose).toContain("APP_ENV: production");
    expect(productionCompose).toContain("no-new-privileges:true");
    expect(productionCompose).toContain("- ALL");
    expect(routingCompose).toContain("ghcr.io/valhalla/valhalla-scripted:3.8.3@sha256:");
    expect(routingCompose).toContain("ROUTING_BASE_URL: http://valhalla:8002");
    expect(routingCompose).toContain("${VALHALLA_BIND_ADDRESS:-127.0.0.1}");
    expect(routingCompose).toContain("condition: service_healthy");
  });

  it("contains placeholders only and never embeds credentials or secret build arguments", () => {
    const deploymentFiles = [
      readProjectFile("Dockerfile"),
      readProjectFile("docker-compose.yml"),
      readProjectFile("docker-compose.prod.yml"),
      readProjectFile("deployment/env/README.txt"),
    ].join("\n");

    expect(deploymentFiles).not.toMatch(/^ARG\s+.*(?:KEY|SECRET|TOKEN|PASSWORD)/gim);
    expect(deploymentFiles).not.toMatch(
      /sb_publishable_|service_role\s*=|eyJ[a-zA-Z0-9_-]{10,}|sesakxnjaphrxqxllqjm/,
    );
  });
});
