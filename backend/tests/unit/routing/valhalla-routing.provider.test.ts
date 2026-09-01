import { describe, expect, it, vi } from "vitest";

import { ValhallaRoutingProvider } from "@/src/features/routing/valhalla-routing.provider";
import { HttpTimeoutError } from "@/src/lib/http/timeout-fetch";

vi.mock("server-only", () => ({}));

const input = {
  origin: { latitude: -6.2, longitude: 106.8 },
  destination: { latitude: -6.21, longitude: 106.81 },
};

describe("ValhallaRoutingProvider", () => {
  it.each([
    ["walking", "pedestrian"],
    ["motorcycle", "motorcycle"],
    ["car", "auto"],
  ] as const)("maps GETRA %s to Valhalla %s costing", async (mode, costing) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(routePayload()), { status: 200 }));
    const provider = new ValhallaRoutingProvider("http://valhalla:8002", fetchMock, 1_000);

    const result = await provider.route({ ...input, mode });

    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.costing).toBe(costing);
    expect(request.locations).toEqual([
      { lat: -6.2, lon: 106.8, type: "break" },
      { lat: -6.21, lon: 106.81, type: "break" },
    ]);
    expect(result).toMatchObject({
      route_status: "ROUTABLE",
      mode,
      engine: "valhalla",
      distance_meters: 1_250,
      duration_seconds: 420,
    });
    expect(result.geometry?.coordinates.length).toBeGreaterThan(1);
    expect(result.maneuvers[0].instruction).toBe("Mulai ke arah timur");
  });

  it("normalizes a no-route response without fabricating geometry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error_code: 442,
      error: "No path could be found for input",
    }), { status: 400 }));
    const provider = new ValhallaRoutingProvider("http://valhalla:8002", fetchMock, 1_000);

    const result = await provider.route({ ...input, mode: "motorcycle" });

    expect(result.route_status).toBe("UNROUTABLE");
    expect(result.reason_code).toBe("NO_ROUTE_FOUND");
    expect(result.geometry).toBeNull();
    expect(result.distance_meters).toBeNull();
  });

  it("distinguishes coordinates outside the loaded graph", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error_code: 171,
      error: "No suitable edges near location",
    }), { status: 400 }));
    const provider = new ValhallaRoutingProvider("http://valhalla:8002", fetchMock, 1_000);

    const result = await provider.route({ ...input, mode: "walking" });

    expect(result).toMatchObject({
      route_status: "OUTSIDE_GRAPH",
      reason_code: "COORDINATES_OUTSIDE_GRAPH",
      geometry: null,
    });
  });

  it("classifies malformed provider JSON without fabricating a route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not-json", { status: 502 }));
    const provider = new ValhallaRoutingProvider("http://valhalla:8002", fetchMock, 1_000);

    const result = await provider.route({ ...input, mode: "car" });

    expect(result).toMatchObject({
      route_status: "SERVICE_UNAVAILABLE",
      reason_code: "ROUTING_PROVIDER_INVALID_RESPONSE",
      geometry: null,
    });
  });

  it("raises a typed timeout when Valhalla does not answer", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      }),
    );
    const provider = new ValhallaRoutingProvider("http://valhalla:8002", fetchMock, 5);

    await expect(provider.route({ ...input, mode: "walking" }))
      .rejects.toBeInstanceOf(HttpTimeoutError);
  });
});

function routePayload() {
  return {
    trip: {
      status: 0,
      summary: {
        length: 1.25,
        time: 420,
        has_toll: false,
        has_highway: false,
        has_ferry: false,
      },
      legs: [{
        shape: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
        maneuvers: [{ instruction: "Mulai ke arah timur", length: 0.12, time: 80, type: 1 }],
      }],
    },
  };
}
