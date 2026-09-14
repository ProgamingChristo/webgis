export interface DaySchedule {
  is_closed?: boolean;
  opens_at?: string | null;
  closes_at?: string | null;
}

export type WeekSchedule = Record<string, DaySchedule>;

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DAY_LABELS_ID: Record<string, string> = {
  monday: "Senin",
  tuesday: "Selasa",
  wednesday: "Rabu",
  thursday: "Kamis",
  friday: "Jumat",
  saturday: "Sabtu",
  sunday: "Minggu",
};

export function getDefaultOperatingHours(): WeekSchedule {
  return {
    monday: { is_closed: false, opens_at: "08:00", closes_at: "21:00" },
    tuesday: { is_closed: false, opens_at: "08:00", closes_at: "21:00" },
    wednesday: { is_closed: false, opens_at: "08:00", closes_at: "21:00" },
    thursday: { is_closed: false, opens_at: "08:00", closes_at: "21:00" },
    friday: { is_closed: false, opens_at: "08:00", closes_at: "21:00" },
    saturday: { is_closed: false, opens_at: "08:00", closes_at: "21:00" },
    sunday: { is_closed: true, opens_at: null, closes_at: null },
  };
}

function isDaySchedule(value: unknown): value is DaySchedule {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const day = value as DaySchedule;
  if (day.is_closed === true) return true;
  return typeof day.opens_at === "string" && TIME_PATTERN.test(day.opens_at) &&
    typeof day.closes_at === "string" && TIME_PATTERN.test(day.closes_at);
}

/**
 * Materialises all seven days before the profile is edited or persisted.
 * Older merchant rows may only contain `{ open_now: true }`; the editor used
 * to render fallback values without putting them in state, so Save could not
 * publish the hours that the owner saw on screen.
 */
export function normalizeOperatingHours(value: unknown): WeekSchedule {
  const defaults = getDefaultOperatingHours();
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return Object.fromEntries(DAY_KEYS.map((dayKey) => {
    const configured = source[dayKey];
    return [dayKey, isDaySchedule(configured)
      ? {
          is_closed: Boolean(configured.is_closed),
          opens_at: configured.is_closed ? null : configured.opens_at,
          closes_at: configured.is_closed ? null : configured.closes_at,
        }
      : { ...defaults[dayKey] }];
  }));
}

export function hasCompleteOperatingHours(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  return DAY_KEYS.every((dayKey) => isDaySchedule(source[dayKey]));
}

export function evaluateStoreStatus(hours: WeekSchedule | null | undefined): {
  isOpen: boolean;
  todayLabel: string;
  isConfigured: boolean;
} {
  if (!hours || Object.keys(hours).length === 0) {
    return {
      isOpen: false,
      todayLabel: "Jadwal belum diatur",
      isConfigured: false,
    };
  }

  // Use current local time (Asia/Jakarta / WIB)
  const now = new Date();
  const dayIndex = now.getDay(); // 0 is Sunday, 1 is Monday...
  const dayKey = DAY_KEYS[dayIndex];
  const todaySchedule = hours[dayKey];

  if (!todaySchedule || todaySchedule.is_closed) {
    return {
      isOpen: false,
      todayLabel: "Hari ini: Tutup",
      isConfigured: true,
    };
  }

  const opensAt = todaySchedule.opens_at || "00:00";
  const closesAt = todaySchedule.closes_at || "23:59";
  const [openH, openM] = opensAt.split(":").map(Number);
  const [closeH, closeM] = closesAt.split(":").map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = (openH || 0) * 60 + (openM || 0);
  const closeMinutes = (closeH || 0) * 60 + (closeM || 0);

  const isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;

  return {
    isOpen,
    todayLabel: `Operasional Hari Ini: ${opensAt.replace(":", ".")} - ${closesAt.replace(":", ".")} WIB`,
    isConfigured: true,
  };
}
