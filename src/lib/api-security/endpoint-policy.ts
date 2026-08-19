export type ApiEndpointClassification =
  | "PUBLIC"
  | "AUTHENTICATED"
  | "ROLE_RESTRICTED"
  | "ADMIN"
  | "INTERNAL";

export type ApiRateLimitProfile = "none" | "auth" | "api" | "mutation" | "spatial";

export interface ApiEndpointPolicy {
  allowedRequestHeaders: readonly string[];
  classification: ApiEndpointClassification;
  cors: "allowlist";
  method: "GET" | "PATCH" | "POST";
  path: string;
  purpose: string;
  rateLimit: ApiRateLimitProfile;
  role: "NONE" | "AUTHENTICATED" | "ADMIN";
}

const CONTENT_HEADERS = ["content-type", "x-request-id"] as const;
const AUTH_HEADERS = ["authorization", "x-request-id"] as const;
const AUTH_CONTENT_HEADERS = [
  "authorization",
  "content-type",
  "x-request-id",
] as const;

export const API_ENDPOINT_POLICIES: readonly ApiEndpointPolicy[] = [
  { method: "GET", path: "/api/health", classification: "PUBLIC", role: "NONE", rateLimit: "none", cors: "allowlist", allowedRequestHeaders: ["x-request-id"], purpose: "Readiness and database connectivity" },
  { method: "POST", path: "/api/auth/login", classification: "PUBLIC", role: "NONE", rateLimit: "auth", cors: "allowlist", allowedRequestHeaders: CONTENT_HEADERS, purpose: "Supabase bearer-token login" },
  { method: "POST", path: "/api/auth/register", classification: "PUBLIC", role: "NONE", rateLimit: "auth", cors: "allowlist", allowedRequestHeaders: CONTENT_HEADERS, purpose: "Public non-admin registration" },
  { method: "POST", path: "/api/auth/logout", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "mutation", cors: "allowlist", allowedRequestHeaders: AUTH_HEADERS, purpose: "Acknowledge stateless client logout" },
  { method: "GET", path: "/api/auth/me", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "api", cors: "allowlist", allowedRequestHeaders: AUTH_HEADERS, purpose: "Authenticated user and profile" },
  { method: "GET", path: "/api/profile", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "api", cors: "allowlist", allowedRequestHeaders: AUTH_HEADERS, purpose: "Read own profile through RLS" },
  { method: "PATCH", path: "/api/profile", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "mutation", cors: "allowlist", allowedRequestHeaders: AUTH_CONTENT_HEADERS, purpose: "Update own profile through RLS" },
  { method: "POST", path: "/api/spatial/distance", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "spatial", cors: "allowlist", allowedRequestHeaders: AUTH_CONTENT_HEADERS, purpose: "PostGIS geography distance" },
  { method: "GET", path: "/api/spatial/nearby", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "spatial", cors: "allowlist", allowedRequestHeaders: AUTH_HEADERS, purpose: "Bounded PostGIS proximity query" },
  { method: "GET", path: "/api/spatial/bbox", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "spatial", cors: "allowlist", allowedRequestHeaders: AUTH_HEADERS, purpose: "Bounded PostGIS bbox query" },
  { method: "POST", path: "/api/admin/ingestion/jobs", classification: "ADMIN", role: "ADMIN", rateLimit: "mutation", cors: "allowlist", allowedRequestHeaders: AUTH_CONTENT_HEADERS, purpose: "Create ingestion job" },
  { method: "POST", path: "/api/admin/ingestion/run", classification: "ADMIN", role: "ADMIN", rateLimit: "mutation", cors: "allowlist", allowedRequestHeaders: AUTH_CONTENT_HEADERS, purpose: "Run ingestion job" },
  { method: "GET", path: "/api/v1/study-areas", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "api", cors: "allowlist", allowedRequestHeaders: AUTH_HEADERS, purpose: "List study areas" },
  { method: "GET", path: "/api/v1/study-areas/[id]", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "api", cors: "allowlist", allowedRequestHeaders: AUTH_HEADERS, purpose: "Get study area" },
  { method: "GET", path: "/api/v1/transport/nodes", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "api", cors: "allowlist", allowedRequestHeaders: AUTH_HEADERS, purpose: "List transport nodes" },
  { method: "GET", path: "/api/v1/transport/corridors", classification: "AUTHENTICATED", role: "AUTHENTICATED", rateLimit: "api", cors: "allowlist", allowedRequestHeaders: AUTH_HEADERS, purpose: "List transport corridors" },
] as const;

export function findApiEndpointPolicy(
  path: string,
  method: string,
): ApiEndpointPolicy | undefined {
  return API_ENDPOINT_POLICIES.find(
    (policy) => policy.path === path && policy.method === method.toUpperCase(),
  );
}

export function getAllowedMethodsForPath(path: string): readonly string[] {
  return API_ENDPOINT_POLICIES.filter((policy) => policy.path === path).map(
    (policy) => policy.method,
  );
}
