export function createDefaultObservedAtLocal(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function serializeObservedAt(localValue: string): string {
  if (!localValue) {
    throw new Error("Waktu pengamatan wajib diisi.");
  }

  const date = new Date(localValue);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Waktu pengamatan tidak valid.");
  }

  return date.toISOString();
}
