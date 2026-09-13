const CONFIGURATION_ERROR =
  "NEXT_PUBLIC_GETRA_API_URL belum dikonfigurasi dengan URL backend GETRA yang valid.";

const ROUTING_CONFIGURATION_ERROR =
  "NEXT_PUBLIC_GETRA_API_BASE_URL belum dikonfigurasi dengan URL routing GETRA yang valid.";

function normalizeApiBaseUrl(configured: string | undefined, errorMessage: string): string {
  if (!configured?.trim()) throw new Error(errorMessage);

  let url: URL;
  try {
    url = new URL(configured.trim());
  } catch {
    throw new Error(errorMessage);
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(errorMessage);
  }

  return url.toString().replace(/\/+$/u, "");
}

export function getGetraApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_GETRA_API_URL ??
    // Deprecated compatibility alias. Remove after every deployment uses the canonical name.
    process.env.NEXT_PUBLIC_API_URL;

  return normalizeApiBaseUrl(configured, CONFIGURATION_ERROR);
}

export function getGetraApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getGetraApiBaseUrl()}${normalizedPath}`;
}

export function getGetraRoutingApiUrl(path: string): string {
  const configured = process.env.NEXT_PUBLIC_GETRA_API_BASE_URL?.trim();
  const baseUrl = configured
    ? normalizeApiBaseUrl(configured, ROUTING_CONFIGURATION_ERROR)
    : getGetraApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
