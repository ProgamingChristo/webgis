export type OpeningStatus = "OPEN" | "CLOSED" | "UNKNOWN";

const JAKARTA_TIMEZONE = "Asia/Jakarta";
const DAY_KEYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

interface Interval { open: string; close: string }

export function evaluateOpeningHours(value: unknown, now = new Date()): OpeningStatus {
  const schedule = asObject(value);
  const timezone = schedule.timezone;
  if (timezone !== JAKARTA_TIMEZONE) return "UNKNOWN";

  const local = localParts(now);
  const weekly = asObject(schedule.weekly);
  const today = readIntervals(weekly[DAY_KEYS[local.dayIndex]]);
  const yesterday = readIntervals(weekly[DAY_KEYS[(local.dayIndex + 6) % 7]!]);
  if (!today || !yesterday) return "UNKNOWN";

  const minute = local.hour * 60 + local.minute;
  if (today.some((interval) => intervalContainsMinute(interval, minute, false))) return "OPEN";
  if (yesterday.some((interval) => intervalContainsMinute(interval, minute, true))) return "OPEN";
  return "CLOSED";
}

function intervalContainsMinute(interval: Interval, minute: number, previousDay: boolean) {
  const open = parseClock(interval.open);
  const close = parseClock(interval.close);
  if (open === null || close === null) return false;
  if (open === close) return true;
  if (close > open) return !previousDay && minute >= open && minute < close;
  return previousDay ? minute < close : minute >= open;
}

function readIntervals(value: unknown): Interval[] | null {
  if (value === null) return [];
  if (!Array.isArray(value)) return null;
  const intervals = value.filter((item): item is Interval => {
    const record = asObject(item);
    return typeof record.open === "string" && typeof record.close === "string";
  });
  return intervals.length === value.length ? intervals : null;
}

function parseClock(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match?.[1] || !match[2]) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
}

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dayIndex, hour: Number(get("hour")), minute: Number(get("minute")) };
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
