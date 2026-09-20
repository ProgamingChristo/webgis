import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { CANONICAL_CAMERA_REGISTRY } from "@/types/cctv-registry";
import { AiVisionTab } from "@/src/features/cctv-platform/components/AiVisionTab";
import { SimulationGate } from "@/src/features/international/components/SimulationGate";
describe("camera data truth", () => {
  it.each(CANONICAL_CAMERA_REGISTRY)("never claims inference without frames: $camera_id", camera => {
    if (!camera.last_frame_at) {
      expect(camera.runtime_metrics.pipeline_state).not.toBe("LIVE");
      expect(camera.runtime_metrics.fps).toBeNull(); expect(camera.runtime_metrics.pedestrian_count).toBeNull();
      expect(camera.supports_ai).toBe(false);
    }
    expect(camera.embed_url).not.toBe(camera.public_portal_url);
  });
  it("renders unavailable AI instead of synthetic frames or zero detections", () => {
    const html = renderToStaticMarkup(<AiVisionTab />);
    expect(html).toContain('data-ai-status="UNAVAILABLE"'); expect(html).not.toContain("INFERENCE LIVE"); expect(html).not.toContain("canvas");
  });
  it("requires explicit opt-in before showing legacy simulated data", () => {
    const html = renderToStaticMarkup(<SimulationGate><div>synthetic measurement 123</div></SimulationGate>);
    expect(html).toContain("sumber data belum terhubung"); expect(html).not.toContain("synthetic measurement");
  });
});
