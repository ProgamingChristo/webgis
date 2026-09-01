const CONFIGURATION_ERROR =
  "NEXT_PUBLIC_GETRA_API_URL belum dikonfigurasi dengan URL backend GETRA yang valid.";

export function getGetraApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_GETRA_API_URL ??
    // Deprecated compatibility alias. Remove after every deployment uses the canonical name.
    process.env.NEXT_PUBLIC_API_URL;

  if (!configured?.trim()) {
    throw new Error(CONFIGURATION_ERROR);
  }

  let url: URL;
  try {
    url = new URL(configured.trim());
  } catch {
    throw new Error(CONFIGURATION_ERROR);
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(CONFIGURATION_ERROR);
  }

  return url.toString().replace(/\/+$/u, "");
}

export function getGetraApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getGetraApiBaseUrl()}${normalizedPath}`;
}
