/**
 * GETRA CCTV Platform — Canonical Types
 *
 * Separation of concerns:
 * - REAL CAMERA → CctvCameraEntry
 * - AI ANALYSIS → AiObservation
 * - SENSOR DATA → SensorEntry
 *
 * These must never be mixed or presented as the same thing.
 */

// Re-export from registry for convenience
export type {
  CanonicalCamera,
  CameraHealthStatus,
  CameraAuthorizationStatus,
  CameraSourceType,
  CameraProvider,
  DkiDistrict,
  GlobalCityId,
  AiPipelineState,
} from "../international/cctv-registry";

// ---------------------------------------------------------------------------
// Sensor Types
// ---------------------------------------------------------------------------

export type SensorType =
  | "AIR_QUALITY"
  | "TRAFFIC"
  | "WEATHER"
  | "FLOOD"
  | "NOISE"
  | "ENVIRONMENT"
  | "PARKING"
  | "OTHER";

export type SensorStatus =
  | "LIVE"      // Data is fresh (< 1 hour old)
  | "STALE"     // Data exists but is old (1-24 hours)
  | "OFFLINE"   // Sensor not responding
  | "UNKNOWN";  // Status cannot be determined

export interface SensorEntry {
  sensor_id: string;
  sensor_name: string;
  sensor_type: SensorType;
  location: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  provider: string;
  source_url: string | null;
  value: number | null;           // Current reading (null if OFFLINE/UNKNOWN)
  unit: string;
  description: string;
  quality: string | null;         // e.g. "GOOD", "MODERATE", "UNHEALTHY"
  status: SensorStatus;
  timestamp: string | null;       // ISO timestamp of last reading
  last_verified_at: string | null;
  source_notes: string;
}

// ---------------------------------------------------------------------------
// AI Observation (only populated when real inference pipeline is active)
// ---------------------------------------------------------------------------

export type AiDetectionClass =
  | "pedestrian"
  | "bicycle"
  | "motorcycle"
  | "car"
  | "bus"
  | "truck";

export interface AiObservation {
  observation_id: string;
  camera_id: string;
  frame_timestamp: string | null;
  model_version: string | null;
  confidence_threshold: number | null;
  pedestrian_count: number | null;
  bicycle_count: number | null;
  motorcycle_count: number | null;
  car_count: number | null;
  bus_count: number | null;
  truck_count: number | null;
  traffic_density: "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "UNKNOWN";
  pipeline_state: "LIVE" | "DEGRADED" | "DATA_UNAVAILABLE" | "OFFLINE";
  last_inference_at: string | null;
}

// ---------------------------------------------------------------------------
// CCTV Platform Tab
// ---------------------------------------------------------------------------

export type CctvPlatformTab =
  | "live"
  | "ai-vision"
  | "sensors"
  | "map";

// ---------------------------------------------------------------------------
// Map Layer
// ---------------------------------------------------------------------------

export type MapLayerKey =
  | "cctv"
  | "ai-camera"
  | "traffic-sensor"
  | "air-quality"
  | "flood"
  | "weather"
  | "parking"
  | "noise";

export interface MapLayerConfig {
  key: MapLayerKey;
  label: string;
  color: string;
  description: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Camera filter state
// ---------------------------------------------------------------------------

export interface CameraFilterState {
  district: string;     // "" = all
  provider: string;     // "" = all
  status: string;       // "" = all
  sourceType: string;   // "" = all
}
