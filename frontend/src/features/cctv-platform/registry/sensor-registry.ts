/**
 * GETRA Sensor Registry
 *
 * Sources: Official public data sources only.
 * - Air Quality: ISPU DKI Jakarta (Dinas Lingkungan Hidup DKI)
 * - Weather: BMKG
 * - Flood: Jakarta Smart City / BPBD DKI
 *
 * Rules:
 * - All values are null until populated by a real data source
 * - Timestamps must reflect when data was actually retrieved
 * - No synthetic sensor values
 */

import type { SensorEntry } from "../types";

export const SENSOR_REGISTRY: SensorEntry[] = [
  // =========================================================================
  // AIR QUALITY — ISPU DKI Jakarta
  // Source: Dinas Lingkungan Hidup DKI Jakarta
  // =========================================================================
  {
    sensor_id: "ispu-dki-bundaran-hi",
    sensor_name: "Bundaran HI",
    sensor_type: "AIR_QUALITY",
    location: "Jl. M.H. Thamrin — Bundaran HI",
    district: "Jakarta Pusat",
    city: "Jakarta",
    lat: -6.1950,
    lng: 106.8230,
    provider: "Dinas Lingkungan Hidup DKI Jakarta",
    source_url: "https://udara.jakarta.go.id",
    value: null,
    unit: "ISPU",
    description: "Indeks Standar Pencemar Udara (ISPU). Sumber: Stasiun pemantau ISPU DKI Jakarta.",
    quality: null,
    status: "UNKNOWN",
    timestamp: null,
    last_verified_at: null,
    source_notes: "Data real-time ISPU tersedia di udara.jakarta.go.id. GETRA belum memiliki koneksi API aktif ke sumber ini.",
  },
  {
    sensor_id: "ispu-dki-kelapa-gading",
    sensor_name: "Kelapa Gading",
    sensor_type: "AIR_QUALITY",
    location: "Kelapa Gading, Jakarta Utara",
    district: "Jakarta Utara",
    city: "Jakarta",
    lat: -6.1572,
    lng: 106.9028,
    provider: "Dinas Lingkungan Hidup DKI Jakarta",
    source_url: "https://udara.jakarta.go.id",
    value: null,
    unit: "ISPU",
    description: "Indeks Standar Pencemar Udara (ISPU). Sumber: Stasiun pemantau ISPU DKI Jakarta.",
    quality: null,
    status: "UNKNOWN",
    timestamp: null,
    last_verified_at: null,
    source_notes: "Data real-time ISPU tersedia di udara.jakarta.go.id. GETRA belum memiliki koneksi API aktif ke sumber ini.",
  },
  {
    sensor_id: "ispu-dki-jagakarsa",
    sensor_name: "Jagakarsa",
    sensor_type: "AIR_QUALITY",
    location: "Jagakarsa, Jakarta Selatan",
    district: "Jakarta Selatan",
    city: "Jakarta",
    lat: -6.3400,
    lng: 106.8300,
    provider: "Dinas Lingkungan Hidup DKI Jakarta",
    source_url: "https://udara.jakarta.go.id",
    value: null,
    unit: "ISPU",
    description: "Indeks Standar Pencemar Udara (ISPU). Sumber: Stasiun pemantau ISPU DKI Jakarta.",
    quality: null,
    status: "UNKNOWN",
    timestamp: null,
    last_verified_at: null,
    source_notes: "Data real-time ISPU tersedia di udara.jakarta.go.id. GETRA belum memiliki koneksi API aktif ke sumber ini.",
  },
  {
    sensor_id: "ispu-dki-lubang-buaya",
    sensor_name: "Lubang Buaya",
    sensor_type: "AIR_QUALITY",
    location: "Lubang Buaya, Jakarta Timur",
    district: "Jakarta Timur",
    city: "Jakarta",
    lat: -6.3100,
    lng: 106.9050,
    provider: "Dinas Lingkungan Hidup DKI Jakarta",
    source_url: "https://udara.jakarta.go.id",
    value: null,
    unit: "ISPU",
    description: "Indeks Standar Pencemar Udara (ISPU). Sumber: Stasiun pemantau ISPU DKI Jakarta.",
    quality: null,
    status: "UNKNOWN",
    timestamp: null,
    last_verified_at: null,
    source_notes: "Data real-time ISPU tersedia di udara.jakarta.go.id. GETRA belum memiliki koneksi API aktif ke sumber ini.",
  },
  {
    sensor_id: "ispu-dki-kalideres",
    sensor_name: "Kalideres",
    sensor_type: "AIR_QUALITY",
    location: "Kalideres, Jakarta Barat",
    district: "Jakarta Barat",
    city: "Jakarta",
    lat: -6.1490,
    lng: 106.7050,
    provider: "Dinas Lingkungan Hidup DKI Jakarta",
    source_url: "https://udara.jakarta.go.id",
    value: null,
    unit: "ISPU",
    description: "Indeks Standar Pencemar Udara (ISPU). Sumber: Stasiun pemantau ISPU DKI Jakarta.",
    quality: null,
    status: "UNKNOWN",
    timestamp: null,
    last_verified_at: null,
    source_notes: "Data real-time ISPU tersedia di udara.jakarta.go.id. GETRA belum memiliki koneksi API aktif ke sumber ini.",
  },

  // =========================================================================
  // FLOOD SENSORS — Pintu Air / BPBD DKI
  // Source: Jakarta Smart City / BPBD DKI Jakarta
  // =========================================================================
  {
    sensor_id: "flood-katulampa",
    sensor_name: "Bendung Katulampa",
    sensor_type: "FLOOD",
    location: "Bendung Katulampa, Bogor",
    district: "Hulu Ciliwung",
    city: "Bogor",
    lat: -6.6200,
    lng: 106.8500,
    provider: "BPBD DKI Jakarta / PU Ciliwung",
    source_url: "https://smartcity.jakarta.go.id",
    value: null,
    unit: "cm",
    description: "Tinggi muka air Bendung Katulampa — hulu Sungai Ciliwung. Siaga 1 jika > 200 cm.",
    quality: null,
    status: "UNKNOWN",
    timestamp: null,
    last_verified_at: null,
    source_notes: "Data real-time tersedia di sistem Jakarta Smart City. GETRA belum memiliki koneksi API aktif ke sumber ini.",
  },
  {
    sensor_id: "flood-pintu-air-manggarai",
    sensor_name: "Pintu Air Manggarai",
    sensor_type: "FLOOD",
    location: "Pintu Air Manggarai, Jakarta Selatan",
    district: "Jakarta Selatan",
    city: "Jakarta",
    lat: -6.2100,
    lng: 106.8540,
    provider: "BPBD DKI Jakarta",
    source_url: "https://smartcity.jakarta.go.id",
    value: null,
    unit: "cm",
    description: "Tinggi muka air Pintu Air Manggarai. Siaga 1 jika > 950 cm.",
    quality: null,
    status: "UNKNOWN",
    timestamp: null,
    last_verified_at: null,
    source_notes: "Data real-time tersedia di sistem Jakarta Smart City. GETRA belum memiliki koneksi API aktif ke sumber ini.",
  },

  // =========================================================================
  // WEATHER — BMKG
  // Source: Badan Meteorologi, Klimatologi, dan Geofisika
  // =========================================================================
  {
    sensor_id: "bmkg-jakarta-kemayoran",
    sensor_name: "Stasiun Kemayoran",
    sensor_type: "WEATHER",
    location: "Kemayoran, Jakarta Pusat",
    district: "Jakarta Pusat",
    city: "Jakarta",
    lat: -6.1594,
    lng: 106.8408,
    provider: "BMKG",
    source_url: "https://data.bmkg.go.id",
    value: null,
    unit: "°C",
    description: "Suhu udara dan kondisi cuaca. Sumber: Stasiun BMKG Kemayoran.",
    quality: null,
    status: "UNKNOWN",
    timestamp: null,
    last_verified_at: null,
    source_notes: "Data cuaca BMKG tersedia melalui data.bmkg.go.id. GETRA belum memiliki koneksi API aktif ke sumber ini.",
  },

  // =========================================================================
  // TRAFFIC SENSORS — Dishub DKI
  // Note: No verified public API available yet
  // =========================================================================
  {
    sensor_id: "traffic-dishub-bundaran-hi",
    sensor_name: "Bundaran HI — Traffic",
    sensor_type: "TRAFFIC",
    location: "Jl. M.H. Thamrin — Bundaran HI",
    district: "Jakarta Pusat",
    city: "Jakarta",
    lat: -6.1950,
    lng: 106.8230,
    provider: "Dishub DKI Jakarta",
    source_url: null,
    value: null,
    unit: "kendaraan/menit",
    description: "Volume kendaraan per menit. Sumber: Sensor lalu lintas Dishub DKI.",
    quality: null,
    status: "UNKNOWN",
    timestamp: null,
    last_verified_at: null,
    source_notes: "Sensor lalu lintas Dishub DKI. Tidak ada API publik yang terverifikasi tersedia saat ini.",
  },
];

export function getSensorRegistryStats() {
  const total = SENSOR_REGISTRY.length;
  const live = SENSOR_REGISTRY.filter((s) => s.status === "LIVE").length;
  const stale = SENSOR_REGISTRY.filter((s) => s.status === "STALE").length;
  const offline = SENSOR_REGISTRY.filter((s) => s.status === "OFFLINE").length;
  const unknown = SENSOR_REGISTRY.filter((s) => s.status === "UNKNOWN").length;

  const byType: Record<string, number> = {};
  for (const sensor of SENSOR_REGISTRY) {
    byType[sensor.sensor_type] = (byType[sensor.sensor_type] ?? 0) + 1;
  }

  return { total, live, stale, offline, unknown, byType };
}
