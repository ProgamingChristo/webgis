"use client";

/**
 * CctvLivePlayer — DEPRECATED WRAPPER
 *
 * This component previously rendered a fake canvas animation simulating a live
 * camera feed. That implementation has been REMOVED because it violated the
 * core principle: "No fake video, no synthetic dark backgrounds."
 *
 * This wrapper now delegates to the truthful CameraPlayer from cctv-platform.
 *
 * @deprecated Use CameraPlayer from @/src/features/cctv-platform instead.
 */

import type { CanonicalCamera } from "../cctv-registry";
import { CameraPlayer } from "../../cctv-platform/components/CameraPlayer";

interface CctvLivePlayerProps {
  camera: CanonicalCamera;
  /** @deprecated AI detection is now shown only in AiVisionTab, not in the live player */
  aiDetection?: boolean;
  /** @deprecated No longer used — AI toggle is in AiVisionTab */
  onToggleAi?: () => void;
}

/**
 * @deprecated Use CameraPlayer from cctv-platform directly.
 * This wrapper exists only for backward compatibility with SmartMobilityViews.tsx.
 */
export function CctvLivePlayer({ camera }: CctvLivePlayerProps) {
  return <CameraPlayer camera={camera} />;
}
