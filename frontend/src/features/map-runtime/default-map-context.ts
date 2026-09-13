export const DEFAULT_JAKARTA_MAP_BOUNDS = {
  west: 106.65,
  south: -6.4,
  east: 107.05,
  north: -6.1,
} as const;

export const DEFAULT_JAKARTA_MAP_ORIGIN = {
  id: "default-jakarta-map-center",
  name: "Jakarta",
  longitude:
    (DEFAULT_JAKARTA_MAP_BOUNDS.west + DEFAULT_JAKARTA_MAP_BOUNDS.east) / 2,
  latitude:
    (DEFAULT_JAKARTA_MAP_BOUNDS.south + DEFAULT_JAKARTA_MAP_BOUNDS.north) / 2,
} as const;
