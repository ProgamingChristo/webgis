/**
 * GETRA CCTV Platform — Public API
 *
 * Exports for the CCTV Platform feature module.
 * Architecture:
 * - REAL CAMERA: CctvPlatformShell → LiveCctvTab → CameraPlayer
 * - AI ANALYSIS: CctvPlatformShell → AiVisionTab
 * - SENSOR DATA: CctvPlatformShell → SensorCenterTab
 */

// Main shell
export { CctvPlatformShell } from "./components/CctvPlatformShell";

// Individual tabs (for use in other contexts if needed)
export { LiveCctvTab } from "./components/LiveCctvTab";
export { AiVisionTab } from "./components/AiVisionTab";
export { SensorCenterTab } from "./components/SensorCenterTab";

// Player components
export { CameraPlayer } from "./components/CameraPlayer";
export { CameraCard } from "./components/CameraCard";

// Registries
export { SENSOR_REGISTRY, getSensorRegistryStats } from "./registry/sensor-registry";

// Types
export type {
  SensorType,
  SensorStatus,
  SensorEntry,
  AiObservation,
  AiDetectionClass,
  CctvPlatformTab,
  MapLayerKey,
  MapLayerConfig,
  CameraFilterState,
} from "./types";
