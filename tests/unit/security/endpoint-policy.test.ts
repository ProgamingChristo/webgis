import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

import {
  API_ENDPOINT_POLICIES,
  findApiEndpointPolicy,
  getAllowedMethodsForPath,
} from "@/src/lib/api-security/endpoint-policy";

const projectRoot = resolve(import.meta.dirname, "../../..");
const apiRoot = resolve(projectRoot, "app/api");
const routeMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function discoverCurrentRoutePolicies() {
  const findRouteFiles = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) return findRouteFiles(absolutePath);
      return entry.name === "route.ts" ? [absolutePath] : [];
    });

  return findRouteFiles(apiRoot).flatMap((absolutePath) => {
    const source = readFileSync(absolutePath, "utf8");
    const routePath = `/api/${relative(apiRoot, absolutePath)
      .split(sep)
      .slice(0, -1)
      .join("/")}`;

    return routeMethods
      .filter((method) =>
        new RegExp(`export\\s+(?:async\\s+function|const)\\s+${method}\\b`, "u").test(
          source,
        ),
      )
      .map((method) => ({ method, path: routePath }));
  });
}

describe("API endpoint policy matrix", () => {
  it("covers every current route method exactly once and has no stale entries", () => {
    const discovered = discoverCurrentRoutePolicies().sort((a, b) =>
      `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`),
    );
    const policies = API_ENDPOINT_POLICIES.map(({ method, path }) => ({
      method,
      path,
    })).sort((a, b) => `${a.path}:${a.method}`.localeCompare(`${b.path}:${b.method}`));

    expect(policies).toEqual(discovered);
    expect(new Set(policies.map((item) => `${item.method} ${item.path}`)).size).toBe(
      policies.length,
    );
  });

  it("classifies only the readiness and authentication entry points as public", () => {
    expect(
      API_ENDPOINT_POLICIES.filter((policy) => policy.classification === "PUBLIC").map(
        ({ method, path }) => `${method} ${path}`,
      ),
    ).toEqual([
      "GET /api/health",
      "POST /api/auth/login",
      "POST /api/auth/register",
    ]);
  });

  it("keeps all domain and identity reads/mutations authenticated", () => {
    const nonPublic = API_ENDPOINT_POLICIES.filter(
      (policy) => policy.classification !== "PUBLIC",
    );

    expect(nonPublic.length).toBeGreaterThan(0);
    for (const policy of nonPublic) {
      expect(policy.classification).toBe("AUTHENTICATED");
      expect(policy.role).toBe("AUTHENTICATED");
      expect(policy.allowedRequestHeaders).toContain("authorization");
      expect(policy.rateLimit).not.toBe("none");
    }
  });

  it("does not claim an admin, internal, or role-restricted endpoint that does not exist", () => {
    expect(
      API_ENDPOINT_POLICIES.filter((policy) =>
        ["ADMIN", "INTERNAL", "ROLE_RESTRICTED"].includes(policy.classification),
      ),
    ).toEqual([]);
  });

  it("maps methods and header allowlists by exact path", () => {
    expect(getAllowedMethodsForPath("/api/profile")).toEqual(["GET", "PATCH"]);
    expect(getAllowedMethodsForPath("/api/profile/evil")).toEqual([]);
    expect(findApiEndpointPolicy("/api/profile", "patch")).toMatchObject({
      classification: "AUTHENTICATED",
      rateLimit: "mutation",
      role: "AUTHENTICATED",
    });
    expect(findApiEndpointPolicy("/api/profile", "DELETE")).toBeUndefined();
  });

  it("uses the spatial rate profile on every spatial endpoint", () => {
    const spatial = API_ENDPOINT_POLICIES.filter((policy) =>
      policy.path.startsWith("/api/spatial/"),
    );

    expect(spatial).toHaveLength(3);
    for (const policy of spatial) {
      expect(policy.rateLimit).toBe("spatial");
      expect(policy.classification).toBe("AUTHENTICATED");
    }
  });
});
