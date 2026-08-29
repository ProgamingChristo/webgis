import type { Merchant } from "@/lib/contracts/search";
import type * as GeoJSON from "geojson";

export type DemoMerchant = Omit<Merchant, "score" | "explanation">;

export const TRANSIT_ORIGIN = {
  id: "transit-dukuh-atas",
  name: "Stasiun Dukuh Atas",
  coordinates: [106.82305, -6.20086] as [number, number],
};

export const DEMO_MERCHANTS: DemoMerchant[] = [
  {
    id: "umkm-001",
    name: "Kopi Sudirman Lokal",
    category: "kopi",
    coordinates: [106.82172, -6.20222],
    walkingMinutes: 6,
    distanceMeters: 430,
    priceLevel: "hemat",
    accessibilityScore: 88,
    retailGapScore: 74,
    comfortScore: 82,
    openNow: true,
    source: "Menu Go + survei GETRA",
    badges: ["Hidden Gem", "Step-free"],
  },
  {
    id: "umkm-002",
    name: "Warung Rasa Nusantara",
    category: "kuliner",
    coordinates: [106.82468, -6.20208],
    walkingMinutes: 7,
    distanceMeters: 510,
    priceLevel: "hemat",
    accessibilityScore: 76,
    retailGapScore: 86,
    comfortScore: 70,
    openNow: true,
    source: "Menu Go",
    badges: ["Demand tinggi", "Harga hemat"],
  },
  {
    id: "umkm-003",
    name: "Bento Transit Hub",
    category: "kuliner",
    coordinates: [106.82574, -6.19984],
    walkingMinutes: 9,
    distanceMeters: 690,
    priceLevel: "menengah",
    accessibilityScore: 91,
    retailGapScore: 62,
    comfortScore: 86,
    openNow: true,
    source: "Menu Go + observasi lapangan",
    badges: ["Akses terbaik", "Jam panjang"],
  },
  {
    id: "umkm-004",
    name: "Klinik Sehat Komuter",
    category: "kesehatan",
    coordinates: [106.82084, -6.19932],
    walkingMinutes: 11,
    distanceMeters: 820,
    priceLevel: "menengah",
    accessibilityScore: 83,
    retailGapScore: 93,
    comfortScore: 77,
    openNow: false,
    source: "Community Maps",
    badges: ["Opportunity zone"],
  },
  {
    id: "umkm-005",
    name: "Laundry Cepat 45",
    category: "jasa",
    coordinates: [106.82648, -6.20335],
    walkingMinutes: 13,
    distanceMeters: 970,
    priceLevel: "hemat",
    accessibilityScore: 68,
    retailGapScore: 79,
    comfortScore: 64,
    openNow: true,
    source: "Survei GETRA",
    badges: ["Supply rendah"],
  },
];

export const MODULES = [
  { id: "m1", name: "Discovery & Access", color: "#34d399" },
  { id: "m2", name: "UMKM Intelligence", color: "#fbbf24" },
  { id: "m3", name: "Business Space", color: "#60a5fa" },
  { id: "m4", name: "Community", color: "#f472b6" },
  { id: "m5", name: "Planning & Resilience", color: "#a78bfa" },
] as const;

export const FEATURES = [
  { no: 1, name: "Smart Search & Recommendation", module: "m1", phase: "CORE", ready: true },
  { no: 2, name: "Adaptive Pedestrian Routing", module: "m1", phase: "CORE/PILOT", ready: true },
  { no: 3, name: "Demand Intelligence", module: "m2", phase: "PILOT", ready: true },
  { no: 4, name: "Fair Discovery Engine", module: "m1", phase: "CORE", ready: true },
  { no: 5, name: "UMKM Profile & Discoverability", module: "m2", phase: "CORE", ready: true },
  { no: 6, name: "AI UMKM Copilot", module: "m2", phase: "PILOT", ready: false },
  { no: 7, name: "GETRA Advertising Manager", module: "m2", phase: "PILOT", ready: false },
  { no: 8, name: "Business Space Intelligence", module: "m3", phase: "PILOT", ready: true },
  { no: 9, name: "Transit Area Profile", module: "m5", phase: "FOUNDATION/PILOT", ready: true },
  { no: 10, name: "Accessibility Need Map", module: "m5", phase: "FOUNDATION", ready: false },
  { no: 11, name: "GETRA Community", module: "m4", phase: "PILOT", ready: false },
  { no: 12, name: "Explore Trails", module: "m4", phase: "PILOT", ready: false },
  { no: 13, name: "Waste Pressure Map", module: "m5", phase: "FOUNDATION", ready: false },
  { no: 14, name: "Community Accessibility Contribution", module: "m4", phase: "PILOT", ready: false },
  { no: 15, name: "Access Resilience & Scenario Closure", module: "m5", phase: "PILOT", ready: false },
  { no: 16, name: "Transit Time-Capsule Map", module: "m5", phase: "FOUNDATION", ready: false },
] as const;

export const SERVICE_AREA: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: "Feature",
  properties: { minutes: 10 },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [106.81895, -6.20085],
      [106.8202, -6.19765],
      [106.82345, -6.19685],
      [106.82715, -6.19835],
      [106.82805, -6.20155],
      [106.8261, -6.20425],
      [106.82255, -6.20505],
      [106.81955, -6.2034],
      [106.81895, -6.20085],
    ]],
  },
};

export const TRANSIT_LINES: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "MRT", color: "#38bdf8" },
      geometry: {
        type: "LineString",
        coordinates: [[106.818, -6.206], [106.821, -6.202], [106.82305, -6.20086], [106.826, -6.197]],
      },
    },
    {
      type: "Feature",
      properties: { name: "KRL", color: "#f97316" },
      geometry: {
        type: "LineString",
        coordinates: [[106.8175, -6.1988], [106.821, -6.1998], [106.82305, -6.20086], [106.829, -6.2023]],
      },
    },
  ],
};
