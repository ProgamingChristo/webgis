const fallback = "/app";

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://getra.invalid");
    let path = url.pathname;
    for (let i = 0; i < 4; i++) {
      if (path.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(path)) return fallback;
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    }
    if (url.origin !== "https://getra.invalid" || path.includes("%") || path.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(path)) return fallback;
    if (["/login", "/signup", "/onboarding"].includes(path.replace(/\/$/, ""))) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}

export function loginPath(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

export function postLoginPath(search: string, onboardingComplete: boolean): string {
  const destination = safeReturnPath(new URLSearchParams(search).get("returnTo"));
  return onboardingComplete ? destination : `/onboarding?returnTo=${encodeURIComponent(destination)}`;
}
