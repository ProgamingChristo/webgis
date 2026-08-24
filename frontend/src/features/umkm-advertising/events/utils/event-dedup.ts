// Ephemeral session key stored in sessionStorage for browser lifetime, or fallback to memory
let memorySessionKey: string | null = null;

export function getOrCreateSessionKey(): string {
  if (typeof window === "undefined") {
    return "server-session";
  }

  try {
    const existing = window.sessionStorage.getItem("getra_ad_session_key");
    if (existing) {
      return existing;
    }
    const newKey = crypto.randomUUID();
    window.sessionStorage.setItem("getra_ad_session_key", newKey);
    return newKey;
  } catch {
    if (!memorySessionKey) {
      memorySessionKey = crypto.randomUUID();
    }
    return memorySessionKey;
  }
}

// In-memory cache to prevent duplicate impression calls in React StrictMode & rapid re-renders
const recordedDedupKeys = new Set<string>();

export function buildDedupKey(
  eventType: string,
  campaignId: string,
  creativeId: string | null | undefined,
  placement: string,
  sessionKey: string,
  contextScope: string = "default"
): string {
  return `${eventType}:${campaignId}:${creativeId || "none"}:${placement}:${sessionKey}:${contextScope}`;
}

export function isLocallyRecorded(dedupKey: string): boolean {
  return recordedDedupKeys.has(dedupKey);
}

export function markLocallyRecorded(dedupKey: string): void {
  recordedDedupKeys.add(dedupKey);
}

export function resetLocalDedupCache(): void {
  recordedDedupKeys.clear();
}
