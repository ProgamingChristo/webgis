import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createBBoxHandler,
  type BBoxHandlerDependencies,
} from "@/app/api/spatial/bbox/route";
import {
  createDistanceHandler,
  type DistanceHandlerDependencies,
} from "@/app/api/spatial/distance/route";
import {
  createNearbyHandler,
  type NearbyHandlerDependencies,
} from "@/app/api/spatial/nearby/route";
import { ApplicationError } from "@/src/lib/errors";
import { readBoundedJsonBody } from "@/src/lib/spatial/request";
import {
  MAX_SPATIAL_JSON_BODY_BYTES,
  MAX_SPATIAL_RESULT_LIMIT,
} from "@/src/modules/spatial/spatial.constants";
import type { SpatialConfig } from "@/src/modules/spatial/spatial.config";
import type {
  BBoxResult,
  DistanceResult,
  NearbyResult,
} from "@/src/modules/spatial/spatial.types";

const TEST_REQUEST_ID = "db991862-1c66-4ed0-a034-279fee4efba3";
const TEST_USER_ID = "test-user-phase-07";

const config: SpatialConfig = {
  maxBboxLatitudeDegrees: 10,
  maxBboxLongitudeDegrees: 10,
  maxRadiusMeters: 1_000,
  walkingSpeedMetersPerSecond: 1.4,
};

const distanceResult: DistanceResult = {
  analysis_method: "postgis_geography_distance",
  distance_meters: 1_234.5,
  limitation_flags: [],
  source: "GETRA_SPATIAL_ENGINE",
  srid: 4326,
};

const nearbyResult: NearbyResult = {
  analysis_method: "postgis_dwithin",
  limitation_flags: ["NO_PRODUCTION_DATA"],
  origin: { latitude: -6.2, longitude: 106.8 },
  radius_meters: 500,
  records: [],
  returned_count: 0,
  source: "GETRA_SPATIAL_ENGINE",
  srid: 4326,
};

const bboxResult: BBoxResult = {
  analysis_method: "postgis_bbox_intersection",
  bbox: { east: 107, north: -6, south: -7, west: 106 },
  limitation_flags: ["NO_PRODUCTION_DATA"],
  records: [],
  returned_count: 0,
  source: "GETRA_SPATIAL_ENGINE",
  srid: 4326,
};

function createDistanceHarness(
  overrides: Partial<DistanceHandlerDependencies> = {},
) {
  const authenticate = vi.fn(async () => TEST_USER_ID);
  const calculateDistance = vi.fn(async () => distanceResult);
  const createService = vi.fn(() => ({ calculateDistance }));
  const checkLimit = vi.fn(async () => undefined);
  const readBody = vi.fn(async (request: Request) => request.json());
  const dependencies: DistanceHandlerDependencies = {
    authenticate,
    createService,
    loadConfig: vi.fn(() => config),
    rateLimiter: { checkLimit },
    readBody,
    ...overrides,
  };

  return {
    authenticate,
    calculateDistance,
    checkLimit,
    createService,
    dependencies,
    readBody,
  };
}

function createNearbyHarness(
  overrides: Partial<NearbyHandlerDependencies> = {},
) {
  const authenticate = vi.fn(async () => TEST_USER_ID);
  const findNearby = vi.fn(async () => nearbyResult);
  const createService = vi.fn(() => ({ findNearby }));
  const checkLimit = vi.fn(async () => undefined);
  const dependencies: NearbyHandlerDependencies = {
    authenticate,
    createService,
    loadConfig: vi.fn(() => config),
    rateLimiter: { checkLimit },
    ...overrides,
  };

  return {
    authenticate,
    checkLimit,
    createService,
    dependencies,
    findNearby,
  };
}

function createBBoxHarness(
  overrides: Partial<BBoxHandlerDependencies> = {},
) {
  const authenticate = vi.fn(async () => TEST_USER_ID);
  const findWithinBBox = vi.fn(async () => bboxResult);
  const createService = vi.fn(() => ({ findWithinBBox }));
  const checkLimit = vi.fn(async () => undefined);
  const dependencies: BBoxHandlerDependencies = {
    authenticate,
    createService,
    loadConfig: vi.fn(() => config),
    rateLimiter: { checkLimit },
    ...overrides,
  };

  return {
    authenticate,
    checkLimit,
    createService,
    dependencies,
    findWithinBBox,
  };
}

function distanceRequest(body: unknown, requestId = TEST_REQUEST_ID) {
  return new NextRequest("http://localhost/api/spatial/distance", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
    },
    method: "POST",
  });
}

async function expectErrorResponse(
  response: Response,
  status: number,
  code: string,
) {
  const body = await response.json();
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-request-id")).toBeTruthy();
  expect(body).toMatchObject({
    error: { code },
    request_id: expect.any(String),
    success: false,
  });
  expect(JSON.stringify(body)).not.toContain("stack");
  return body;
}

describe("Phase 7 spatial API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication boundary", () => {
    it("returns 401 and never creates the distance service", async () => {
      const harness = createDistanceHarness({
        authenticate: vi.fn(async () => {
          throw new ApplicationError("UNAUTHORIZED", "internal token detail");
        }),
      });
      const handler = createDistanceHandler(harness.dependencies);

      const response = await handler(
        distanceRequest({
          destination: { latitude: -6.21, longitude: 106.81 },
          origin: { latitude: -6.2, longitude: 106.8 },
        }),
      );

      const body = await expectErrorResponse(response, 401, "UNAUTHORIZED");
      expect(body.error.message).toBe("Unauthorized");
      expect(JSON.stringify(body)).not.toContain("internal token detail");
      expect(harness.createService).not.toHaveBeenCalled();
      expect(harness.checkLimit).not.toHaveBeenCalled();
    });

    it("returns 401 and never creates the nearby service", async () => {
      const harness = createNearbyHarness({
        authenticate: vi.fn(async () => {
          throw new ApplicationError("UNAUTHORIZED");
        }),
      });
      const handler = createNearbyHandler(harness.dependencies);

      const response = await handler(
        new NextRequest(
          "http://localhost/api/spatial/nearby?lat=-6.2&lng=106.8&radius=500&type=transport_node",
        ),
      );

      await expectErrorResponse(response, 401, "UNAUTHORIZED");
      expect(harness.createService).not.toHaveBeenCalled();
      expect(harness.checkLimit).not.toHaveBeenCalled();
    });

    it("returns 401 and never creates the bbox service", async () => {
      const harness = createBBoxHarness({
        authenticate: vi.fn(async () => {
          throw new ApplicationError("UNAUTHORIZED");
        }),
      });
      const handler = createBBoxHandler(harness.dependencies);

      const response = await handler(
        new NextRequest(
          "http://localhost/api/spatial/bbox?west=106&south=-7&east=107&north=-6&type=study_area",
        ),
      );

      await expectErrorResponse(response, 401, "UNAUTHORIZED");
      expect(harness.createService).not.toHaveBeenCalled();
      expect(harness.checkLimit).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/spatial/distance", () => {
    it("returns the exact safe distance envelope and invokes the per-user limiter", async () => {
      const harness = createDistanceHarness();
      const handler = createDistanceHandler(harness.dependencies);
      const request = distanceRequest({
        destination: { latitude: -6.21, longitude: 106.81 },
        origin: { latitude: -6.2, longitude: 106.8 },
      });

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-request-id")).toBe(TEST_REQUEST_ID);
      expect(body).toEqual({
        data: distanceResult,
        request_id: TEST_REQUEST_ID,
        success: true,
      });
      expect(body.data.analysis_method).toBe("postgis_geography_distance");
      expect(body.data.source).toBe("GETRA_SPATIAL_ENGINE");
      expect(harness.checkLimit).toHaveBeenCalledWith(
        request,
        `${TEST_USER_ID}:spatial:distance`,
      );
      expect(harness.calculateDistance).toHaveBeenCalledWith({
        destination: { latitude: -6.21, longitude: 106.81 },
        origin: { latitude: -6.2, longitude: 106.8 },
      });
    });

    it("maps an invalid coordinate to SPATIAL_INVALID_COORDINATE without a query", async () => {
      const harness = createDistanceHarness();
      const handler = createDistanceHandler(harness.dependencies);

      const response = await handler(
        distanceRequest({
          destination: { latitude: -6.21, longitude: 106.81 },
          origin: { latitude: -6.2, longitude: 181 },
        }),
      );

      await expectErrorResponse(response, 400, "SPATIAL_INVALID_COORDINATE");
      expect(harness.createService).not.toHaveBeenCalled();
      expect(harness.calculateDistance).not.toHaveBeenCalled();
    });

    it("rejects an oversized JSON body before service creation", async () => {
      const harness = createDistanceHarness({ readBody: readBoundedJsonBody });
      const handler = createDistanceHandler(harness.dependencies);
      const request = new NextRequest("http://localhost/api/spatial/distance", {
        body: JSON.stringify({
          marker: "TEST FIXTURE",
          padding: "x".repeat(MAX_SPATIAL_JSON_BODY_BYTES),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      const response = await handler(request);

      await expectErrorResponse(response, 413, "SPATIAL_REQUEST_TOO_LARGE");
      expect(harness.createService).not.toHaveBeenCalled();
      expect(harness.calculateDistance).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/spatial/nearby", () => {
    it("transforms the public query and returns the exact analysis method/source", async () => {
      const harness = createNearbyHarness();
      const handler = createNearbyHandler(harness.dependencies);
      const request = new NextRequest(
        "http://localhost/api/spatial/nearby?lat=-6.2&lng=106.8&radius=500&type=transport_node&limit=20",
        { headers: { "x-request-id": TEST_REQUEST_ID } },
      );

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-request-id")).toBe(TEST_REQUEST_ID);
      expect(body).toEqual({
        data: nearbyResult,
        request_id: TEST_REQUEST_ID,
        success: true,
      });
      expect(body.data.analysis_method).toBe("postgis_dwithin");
      expect(body.data.source).toBe("GETRA_SPATIAL_ENGINE");
      expect(harness.findNearby).toHaveBeenCalledWith({
        entity_type: "transport_node",
        limit: 20,
        origin: { latitude: -6.2, longitude: 106.8 },
        radius_meters: 500,
      });
      expect(harness.checkLimit).toHaveBeenCalledWith(
        request,
        `${TEST_USER_ID}:spatial:nearby`,
      );
    });

    it("accepts the configured maximum radius and global maximum limit", async () => {
      const harness = createNearbyHarness();
      const handler = createNearbyHandler(harness.dependencies);

      const response = await handler(
        new NextRequest(
          `http://localhost/api/spatial/nearby?lat=-6.2&lng=106.8&radius=${config.maxRadiusMeters}&type=umkm_profile&limit=${MAX_SPATIAL_RESULT_LIMIT}`,
        ),
      );

      expect(response.status).toBe(200);
      expect(harness.findNearby).toHaveBeenCalledWith({
        entity_type: "umkm_profile",
        limit: MAX_SPATIAL_RESULT_LIMIT,
        origin: { latitude: -6.2, longitude: 106.8 },
        radius_meters: config.maxRadiusMeters,
      });
    });

    it.each([
      {
        code: "SPATIAL_INVALID_COORDINATE",
        query: "lat=-91&lng=106.8&radius=500&type=transport_node&limit=20",
      },
      {
        code: "SPATIAL_INVALID_RADIUS",
        query: "lat=-6.2&lng=106.8&radius=1001&type=transport_node&limit=20",
      },
      {
        code: "VALIDATION_ERROR",
        query: "lat=-6.2&lng=106.8&radius=500&type=transport_node&limit=101",
      },
      {
        code: "VALIDATION_ERROR",
        query: "lat=-6.2&lng=106.8&radius=500&type=transport_node&limit=20&unexpected=1",
      },
      {
        code: "VALIDATION_ERROR",
        query: "lat=-6.2&lat=-6.3&lng=106.8&radius=500&type=transport_node&limit=20",
      },
    ])("rejects unsafe query input as $code", async ({ code, query }) => {
      const harness = createNearbyHarness();
      const handler = createNearbyHandler(harness.dependencies);

      const response = await handler(
        new NextRequest(`http://localhost/api/spatial/nearby?${query}`),
      );

      await expectErrorResponse(response, 400, code);
      expect(harness.createService).not.toHaveBeenCalled();
      expect(harness.findNearby).not.toHaveBeenCalled();
    });

    it("sanitizes a spatial query failure", async () => {
      const internalDetail =
        "select secret from internal_table; bearer TEST_SHOULD_NOT_LEAK";
      const harness = createNearbyHarness({
        createService: vi.fn(() => ({
          findNearby: vi.fn(async () => {
            throw new ApplicationError(
              "SPATIAL_QUERY_FAILED",
              internalDetail,
              true,
            );
          }),
        })),
      });
      const handler = createNearbyHandler(harness.dependencies);

      const response = await handler(
        new NextRequest(
          "http://localhost/api/spatial/nearby?lat=-6.2&lng=106.8&radius=500&type=transport_node&limit=20",
        ),
      );
      const body = await expectErrorResponse(
        response,
        500,
        "SPATIAL_QUERY_FAILED",
      );

      expect(body.error).toEqual({
        code: "SPATIAL_QUERY_FAILED",
        message: "Spatial query failed",
        retryable: true,
      });
      expect(JSON.stringify(body)).not.toContain(internalDetail);
      expect(JSON.stringify(body)).not.toContain("internal_table");
      expect(JSON.stringify(body)).not.toContain("TEST_SHOULD_NOT_LEAK");
    });
  });

  describe("GET /api/spatial/bbox", () => {
    it("transforms the public query and returns the exact analysis method/source", async () => {
      const harness = createBBoxHarness();
      const handler = createBBoxHandler(harness.dependencies);
      const request = new NextRequest(
        "http://localhost/api/spatial/bbox?west=106&south=-7&east=107&north=-6&type=study_area&limit=20",
        { headers: { "x-request-id": TEST_REQUEST_ID } },
      );

      const response = await handler(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-request-id")).toBe(TEST_REQUEST_ID);
      expect(body).toEqual({
        data: bboxResult,
        request_id: TEST_REQUEST_ID,
        success: true,
      });
      expect(body.data.analysis_method).toBe("postgis_bbox_intersection");
      expect(body.data.source).toBe("GETRA_SPATIAL_ENGINE");
      expect(harness.findWithinBBox).toHaveBeenCalledWith({
        bbox: { east: 107, north: -6, south: -7, west: 106 },
        entity_type: "study_area",
        limit: 20,
      });
      expect(harness.checkLimit).toHaveBeenCalledWith(
        request,
        `${TEST_USER_ID}:spatial:bbox`,
      );
    });

    it.each([
      {
        code: "SPATIAL_INVALID_BBOX",
        query: "west=107&south=-7&east=107&north=-6&type=study_area&limit=20",
      },
      {
        code: "SPATIAL_INVALID_BBOX",
        query: "west=106&south=-6&east=107&north=-7&type=study_area&limit=20",
      },
      {
        code: "VALIDATION_ERROR",
        query: "west=106&south=-7&east=107&north=-6&type=study_area&limit=101",
      },
      {
        code: "VALIDATION_ERROR",
        query: "west=106&south=-7&east=107&north=-6&type=study_area&limit=20&raw_sql=drop",
      },
      {
        code: "VALIDATION_ERROR",
        query: "west=106&west=105&south=-7&east=107&north=-6&type=study_area&limit=20",
      },
    ])("rejects unsafe bbox query input as $code", async ({ code, query }) => {
      const harness = createBBoxHarness();
      const handler = createBBoxHandler(harness.dependencies);

      const response = await handler(
        new NextRequest(`http://localhost/api/spatial/bbox?${query}`),
      );

      await expectErrorResponse(response, 400, code);
      expect(harness.createService).not.toHaveBeenCalled();
      expect(harness.findWithinBBox).not.toHaveBeenCalled();
    });
  });
});
