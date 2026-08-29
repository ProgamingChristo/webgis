import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { createGraphHealthHandler } from "@/app/api/internal/routing/graph-health/route";
import { createRoutingHandler } from "@/app/api/routing/route";
import { createServiceAreaHandler } from "@/app/api/spatial/service-area/route";
import { ApplicationError } from "@/src/lib/errors";

vi.mock("server-only", () => ({}));

const point = { longitude: 106.7870583, latitude: -6.2842836 };

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 08 commuter spatial routes", () => {
  it("requires authentication before executing a graph route", async () => {
    const route = vi.fn();
    const response = await createRoutingHandler({
      authorize: vi.fn().mockRejectedValue(new ApplicationError("UNAUTHORIZED")),
      checkLimit: vi.fn(),
      route,
    })(post("/api/routing", { origin: point, destination: point, mode: "walking" }));
    expect(response.status).toBe(401);
    expect(route).not.toHaveBeenCalled();
  });

  it("returns a frontend-safe network route contract", async () => {
    const response = await createRoutingHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      checkLimit: vi.fn(),
      route: vi.fn().mockResolvedValue({
        status: "ROUTABLE",
        distance_meters: 70.3,
        network_distance_meters: 55,
        access_distance_meters: 15.3,
        duration_seconds: 51,
        geometry: { type: "LineString", coordinates: [[106.787, -6.284], [106.786, -6.283]] },
        walking_speed_mps: 1.4,
      }),
    })(post("/api/routing", {
      origin: point,
      destination: { longitude: 106.786593, latitude: -6.2838589 },
      mode: "walking",
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      route_status: "ROUTABLE",
      analysis_method: "pgrouting_network_route",
      route_source: "pgr_dijkstra",
      duration_seconds: 51,
    });
    expect(body.data.geometry.type).toBe("LineString");
    expect(JSON.stringify(body)).not.toMatch(/service_role|authorization|api.key/i);
  });

  it("records a merchant route request without exposing the actor or merchant id", async () => {
    const merchantId = "10000000-0000-4000-8000-000000000001";
    const recordRoute = vi.fn().mockResolvedValue(undefined);
    const response = await createRoutingHandler({
      authorize: vi.fn().mockResolvedValue("private-actor-id"),
      checkLimit: vi.fn(),
      route: vi.fn().mockResolvedValue({ status: "UNROUTABLE" }),
      recordRoute,
    })(post("/api/routing", {
      origin: point,
      destination: point,
      destination_merchant_id: merchantId,
      mode: "walking",
    }));

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(recordRoute).toHaveBeenCalledWith("private-actor-id", merchantId, "UNROUTABLE");
    expect(JSON.stringify(body)).not.toMatch(/private-actor-id|10000000-0000-4000-8000-000000000001/);
  });

  it("returns no fabricated geometry for disconnected destinations", async () => {
    const response = await createRoutingHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      checkLimit: vi.fn(),
      route: vi.fn().mockResolvedValue({ status: "UNROUTABLE" }),
    })(post("/api/routing", { origin: point, destination: point, mode: "walking" }));
    const body = await response.json();
    expect(body.data.route_status).toBe("UNROUTABLE");
    expect(body.data.geometry).toBeNull();
    expect(body.data.limitation_flags).toContain("NO_FABRICATED_ROUTE");
  });

  it("validates and returns reachable network edges for service area", async () => {
    const serviceArea = vi.fn().mockResolvedValue({
      status: "READY",
      service_area_type: "REACHABLE_NETWORK_EDGES",
      threshold_minutes: 10,
      reachable_node_count: 721,
      reachable_edge_count: 913,
      geometry: { type: "MultiLineString", coordinates: [] },
    });
    const handler = createServiceAreaHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      checkLimit: vi.fn(),
      serviceArea,
    });
    const response = await handler(post("/api/spatial/service-area", { origin: point, max_minutes: 10 }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.service_area_type).toBe("REACHABLE_NETWORK_EDGES");

    const invalid = await handler(post("/api/spatial/service-area", { origin: point, max_minutes: 999_999 }));
    expect(invalid.status).toBe(400);
    expect(serviceArea).toHaveBeenCalledTimes(1);
  });

  it("protects graph diagnostics behind authentication", async () => {
    const graphHealth = vi.fn().mockResolvedValue({ node_count: 67_708, edge_count: 81_346 });
    const response = await createGraphHealthHandler({
      authorize: vi.fn().mockResolvedValue("user-id"),
      graphHealth,
    })(new NextRequest("http://localhost/api/internal/routing/graph-health"));
    expect(response.status).toBe(200);
    expect((await response.json()).data.edge_count).toBe(81_346);
  });
});
