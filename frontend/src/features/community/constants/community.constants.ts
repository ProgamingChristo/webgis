export const COMMUNITY_POST_MAX_LENGTH = 500;
export const COMMUNITY_PHOTO_MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const COMMUNITY_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const COMMUNITY_FINDING_CATEGORIES = [
  {
    value: "LEGENDARY_EATERY",
    label: "Warung Legendaris",
  },
  {
    value: "LOCAL_FOOD",
    label: "Makanan Khas",
  },
  {
    value: "CRAFT_CENTER",
    label: "Sentra Kerajinan",
  },
  {
    value: "LANDMARK",
    label: "Landmark",
  },
  {
    value: "LOCAL_HISTORY",
    label: "Sejarah Lokal",
  },
  {
    value: "COMMUNITY_ACTIVITY",
    label: "Kegiatan Komunitas",
  },
] as const;

export const COMMUTER_REQUEST_CATEGORIES = [
  {
    value: "FOOD",
    label: "Makanan",
  },
  {
    value: "DRINK",
    label: "Minuman",
  },
  {
    value: "DAILY_NEEDS",
    label: "Kebutuhan Harian",
  },
  {
    value: "SERVICE",
    label: "Jasa",
  },
  {
    value: "OTHER_LOCAL_NEED",
    label: "Kebutuhan Lokal",
  },
] as const;

export const COMMUTER_REQUEST_RADIUS_OPTIONS_M = [500, 1000, 2000, 3000] as const;
export const COMMUTER_REQUEST_EXPIRY_OPTIONS_DAYS = [1, 3, 7] as const;
export const COMMUTER_REQUEST_TITLE_MAX_LENGTH = 120;
export const COMMUTER_REQUEST_DESCRIPTION_MAX_LENGTH = 500;
export const COMMUTER_REQUEST_BUDGET_MAX_IDR = 10_000_000;

export const COMMUNITY_DEFAULT_LOCATION = {
  longitude: 106.8272,
  latitude: -6.1754,
} as const;

export const COMMUNITY_EMOJI_OPTIONS = [
  "😀",
  "😄",
  "😂",
  "😊",
  "😍",
  "🤔",
  "😭",
  "🙏",
  "👍",
  "👏",
  "🔥",
  "✨",
  "❤️",
  "💯",
  "🍜",
  "🍚",
  "🍛",
  "☕",
  "🥤",
  "📍",
  "🚉",
  "🚌",
  "🚶",
  "🏪",
  "🛍️",
  "💸",
] as const;
