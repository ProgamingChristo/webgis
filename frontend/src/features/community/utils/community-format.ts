import {
  COMMUTER_REQUEST_CATEGORIES,
  COMMUNITY_FINDING_CATEGORIES,
} from "../constants/community.constants";
import type {
  CommuterRequestCategory,
  CommunityFindingCategory,
} from "../types/community.types";

export function getAuthorInitials(displayName: string): string {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "GT";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatCommunityTime(value: string): string {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  );

  if (diffSeconds < 60) {
    return "Baru saja";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} menit`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} jam`;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(timestamp));
}

export function insertTextAtRange(
  value: string,
  insertion: string,
  selectionStart: number,
  selectionEnd: number,
): {
  value: string;
  caret: number;
} {
  const safeStart = Math.max(0, Math.min(selectionStart, value.length));
  const safeEnd = Math.max(safeStart, Math.min(selectionEnd, value.length));

  return {
    value: `${value.slice(0, safeStart)}${insertion}${value.slice(safeEnd)}`,
    caret: safeStart + insertion.length,
  };
}

export function formatLocationCoordinate(
  latitude: number,
  longitude: number,
  precision = 3,
): string {
  return `${latitude.toFixed(precision)} / ${longitude.toFixed(precision)}`;
}

export function formatExactLocationCoordinate(
  latitude: number,
  longitude: number,
): string {
  return `Lat ${latitude.toFixed(5)} Lon ${longitude.toFixed(5)}`;
}

export function formatCommunityFindingCategory(
  category: CommunityFindingCategory,
): string {
  return (
    COMMUNITY_FINDING_CATEGORIES.find((item) => item.value === category)
      ?.label ?? category
  );
}

export function formatCommuterRequestCategory(
  category: CommuterRequestCategory,
): string {
  return (
    COMMUTER_REQUEST_CATEGORIES.find((item) => item.value === category)
      ?.label ?? category
  );
}

export function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function parseIdrInput(value: string): number {
  const digits = value.replace(/\D/g, "");

  return digits.length > 0 ? Number(digits) : 0;
}

export function formatRadiusMeters(value: number): string {
  return value >= 1000
    ? `${Number((value / 1000).toFixed(1))} km`
    : `${value} m`;
}

export function formatExpiry(value: string): string {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(timestamp));
}
