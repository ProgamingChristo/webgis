import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { createRouteProgressHandler } from "@/app/api/routing/progress/handlers";
import { ApplicationError } from "@/src/lib/errors";

vi.mock("server-only", () => ({}));

const input = {
  accuracy_meters: 8,
  current_position: { longitude: 106.685, latitude: -6.21 },
  mode: "walking" as const,
  route: {
    distance_meters: 1_100,
    duration_seconds: 900,
    geometry: { type: "LineString" as const, coordinates: [[106.68, -6.21], [106.69, -6.21]] },
    maneuvers: [],
  },
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/routing/progress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("route progress API", () => {
  it("requires authentication before projecting ephemeral GPS", async () => {
    const calculate = vi.fn();
    const response = await createRouteProgressHandler({
      authorize: vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
      checkLimit: vi.fn(),
      calculate,
    })(request(input));
    expect(response.status).toBe(401);
    expect(calculate).not.toHaveBeenCalled();
  });

  it("returns bounded deterministic progress without accepting a client remaining metric", async () => {
    const calculate = vi.fn().mockReturnValue({
      analysis_method: "route_linear_reference",
      on_route: true,
      progress_fraction: 0.5,
      remaining_distance_meters: 550,
      remaining_duration_seconds: 450,
      distance_from_route_meters: 0,
      tolerance_meters: 18,
      matched_position: input.current_position,
      remaining_geometry: { type: "LineString", coordinates: [[106.685, -6.21], [106.69, -6.21]] },
      next_maneuver: null,
    });
    const response = await createRouteProgressHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      checkLimit: vi.fn(),
      calculate,
    })(request(input));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(calculate).toHaveBeenCalledWith(input);
    expect(body.data).toMatchObject({
      analysis_method: "route_linear_reference",
      progress_fraction: 0.5,
      remaining_distance_meters: 550,
    });
    expect(JSON.stringify(body)).not.toMatch(/authorization|service.role|gps_history/i);
  });

  it("rejects browser-supplied remaining metrics and malformed geometry", async () => {
    const response = await createRouteProgressHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      checkLimit: vi.fn(),
      calculate: vi.fn(),
    })(request({ ...input, remaining_distance_meters: 1 }));
    expect(response.status).toBe(400);
  });
});
