import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import {
  API_ENDPOINT_POLICIES,
  findApiEndpointPolicy,
  getAllowedMethodsForPath,
} from "../../../src/lib/api-security/endpoint-policy";

type RouteMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

interface DiscoveredRoute {
  method: RouteMethod;
  path: string;
}

const ROUTE_METHODS: readonly RouteMethod[] = [
  "GET",
  "PATCH",
  "POST",
  "PUT",
  "DELETE",
];

function findRouteFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, {
    withFileTypes: true,
  })) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
      continue;
    }

    if (entry.name === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

function routeFileToPath(
  routeFile: string,
  apiRoot: string,
): string {
  const relativePath = relative(
    apiRoot,
    routeFile,
  );

  const segments = relativePath
    .split(sep)
    .slice(0, -1)
    .filter(
      (segment) =>
        !(
          segment.startsWith("(") &&
          segment.endsWith(")")
        ),
    );

  return `/api/${segments.join("/")}`;
}

function discoverRoutes(): DiscoveredRoute[] {
  const apiRoot = join(
    process.cwd(),
    "app",
    "api",
  );

  const discovered: DiscoveredRoute[] = [];

  for (const routeFile of findRouteFiles(apiRoot)) {
    const source = readFileSync(
      routeFile,
      "utf8",
    );

    const routePath = routeFileToPath(
      routeFile,
      apiRoot,
    );

    for (const method of ROUTE_METHODS) {
      const exportedFunction = new RegExp(
        `export\\s+(?:async\\s+)?function\\s+${method}\\b`,
      );

      const exportedConst = new RegExp(
        `export\\s+const\\s+${method}\\b`,
      );

      if (
        exportedFunction.test(source) ||
        exportedConst.test(source)
      ) {
        discovered.push({
          method,
          path: routePath,
        });
      }
    }
  }

  return discovered.sort((a, b) =>
    `${a.path}:${a.method}`.localeCompare(
      `${b.path}:${b.method}`,
    ),
  );
}

describe("API endpoint policy matrix", () => {
  it("covers every current route method exactly once and has no stale entries", () => {
    const discovered = discoverRoutes();

    const policies = API_ENDPOINT_POLICIES
      .map(({ method, path }) => ({
        method,
        path,
      }))
      .sort((a, b) =>
        `${a.path}:${a.method}`.localeCompare(
          `${b.path}:${b.method}`,
        ),
      );

    expect(policies).toEqual(discovered);

    const unique = new Set(
      policies.map(
        ({ method, path }) =>
          `${method} ${path}`,
      ),
    );

    expect(unique.size).toBe(
      policies.length,
    );
  });

  it("classifies only readiness and authentication entry points as public", () => {
    const publicEndpoints =
      API_ENDPOINT_POLICIES
        .filter(
          (policy) =>
            policy.classification ===
            "PUBLIC",
        )
        .map(
          ({ method, path }) =>
            `${method} ${path}`,
        )
        .sort();

    expect(publicEndpoints).toEqual(
      [
        "GET /api/health",
        "POST /api/auth/login",
        "POST /api/auth/register",
      ].sort(),
    );
  });

  it("keeps authenticated endpoints protected", () => {
    const authenticated =
      API_ENDPOINT_POLICIES.filter(
        (policy) =>
          policy.classification ===
          "AUTHENTICATED",
      );

    expect(
      authenticated.length,
    ).toBeGreaterThan(0);

    for (const policy of authenticated) {
      expect(policy.role).toBe(
        "AUTHENTICATED",
      );

      expect(
        policy.allowedRequestHeaders,
      ).toContain("authorization");
    }
  });

  it("keeps ingestion endpoints admin-only", () => {
    const admins =
      API_ENDPOINT_POLICIES.filter(
        (policy) =>
          policy.classification === "ADMIN",
      );

    expect(
      admins.map(
        ({ method, path }) =>
          `${method} ${path}`,
      ).sort(),
    ).toEqual(
      [
        "DELETE /api/admin/map-import/layers/[id]",
        "GET /api/admin/community/analytics",
        "GET /api/admin/community/reports",
        "PATCH /api/admin/map-import/layers/[id]",
        "PATCH /api/admin/community/reports/[reportId]",
        "POST /api/admin/ingestion/jobs",
        "POST /api/admin/ingestion/run",
        "POST /api/admin/map-import/commit",
        "POST /api/admin/map-import/preview",
      ].sort(),
    );

    for (const policy of admins) {
      expect(policy.role).toBe("ADMIN");

      expect(
        policy.allowedRequestHeaders,
      ).toContain("authorization");
    }
  });

  it("does not currently expose internal or role-restricted policies", () => {
    const restricted =
      API_ENDPOINT_POLICIES.filter(
        (policy) =>
          policy.classification ===
            "INTERNAL" ||
          policy.classification ===
            "ROLE_RESTRICTED",
      );

    expect(restricted).toEqual([]);
  });

  it("maps methods and header allowlists by exact path", () => {
    expect(
      getAllowedMethodsForPath(
        "/api/profile",
      ),
    ).toEqual(["GET", "PATCH"]);

    expect(
      getAllowedMethodsForPath(
        "/api/profile/evil",
      ),
    ).toEqual([]);

    expect(
      findApiEndpointPolicy(
        "/api/profile",
        "patch",
      ),
    ).toMatchObject({
      method: "PATCH",
      path: "/api/profile",
      classification: "AUTHENTICATED",
      role: "AUTHENTICATED",
    });
  });

  it("uses the spatial rate profile on spatial and walking-routing endpoints", () => {
    const spatial =
      API_ENDPOINT_POLICIES.filter(
        (policy) =>
          policy.path.startsWith(
            "/api/spatial/",
          ) ||
          policy.path ===
            "/api/internal/routing/walking",
      );

    expect(
      spatial.length,
    ).toBeGreaterThan(0);

    for (const policy of spatial) {
      expect(policy.rateLimit).toBe(
        "spatial",
      );
    }
  });
});
