export const API_STATIC_SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Frame-Options", value: "DENY" },
] as const;

export function applyStaticSecurityHeaders(headers: Headers): void {
  for (const header of API_STATIC_SECURITY_HEADERS) {
    headers.set(header.key, header.value);
  }
}

export function applyProductionHsts(
  headers: Headers,
  appEnvironment: string,
  appBaseUrl: string,
): void {
  if (appEnvironment === "production" && appBaseUrl.startsWith("https://")) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
}
