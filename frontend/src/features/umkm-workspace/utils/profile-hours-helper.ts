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
