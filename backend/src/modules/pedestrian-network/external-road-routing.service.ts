import type * as GeoJSON from "geojson";

type OsrmRouteResponse = {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: {
      type?: string;
      coordinates?: unknown;
    };
  }>;
};

export type ExternalRoadRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  geometry: GeoJSON.LineString;
};

const DEFAULT_OSRM_BASE_URL =
  "https://router.project-osrm.org";

const DEFAULT_WALKING_SPEED_MPS =
  1.25;

export class ExternalRoadRoutingService {
  constructor(
    private readonly baseUrl =
      process.env.OSRM_BASE_URL ??
      DEFAULT_OSRM_BASE_URL,
    private readonly profile =
      process.env.OSRM_PROFILE ??
      "foot",
  ) {}

  async getRoute(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number,
  ): Promise<ExternalRoadRouteResult> {
    const url =
      this.buildRouteUrl(
        originLat,
        originLng,
        destinationLat,
        destinationLng,
      );

    const response =
      await fetch(
        url,
        {
          headers: {
            accept:
              "application/json",
            "user-agent":
              "GETRA/0.1 road-routing-fallback",
          },
          signal:
            AbortSignal.timeout(
              8_000,
            ),
        },
      );

    if (!response.ok) {
      throw new Error(
        `OSRM_ROUTE_FAILED: ${response.status}`,
      );
    }

    const payload =
      (await response.json()) as OsrmRouteResponse;

    if (
      payload.code !== "Ok" ||
      !payload.routes?.[0]
    ) {
      throw new Error(
        `OSRM_ROUTE_FAILED: ${payload.message ?? payload.code ?? "UNKNOWN"}`,
      );
    }

    const route =
      payload.routes[0];

    if (
      !route.geometry ||
      route.geometry.type !==
        "LineString" ||
      !Array.isArray(
        route.geometry.coordinates,
      )
    ) {
      throw new Error(
        "OSRM_ROUTE_INVALID_GEOMETRY",
      );
    }

    const coordinates =
      route.geometry.coordinates;

    if (
      coordinates.length < 2 ||
      !coordinates.every(
        isLngLatPosition,
      )
    ) {
      throw new Error(
        "OSRM_ROUTE_INVALID_COORDINATES",
      );
    }

    const distanceMeters =
      Math.round(
        Number(
          route.distance,
        ),
      );

    if (
      !Number.isFinite(
        distanceMeters,
      ) ||
      distanceMeters <= 0
    ) {
      throw new Error(
        "OSRM_ROUTE_INVALID_DISTANCE",
      );
    }

    return {
      distanceMeters,
      durationSeconds:
        Math.max(
          60,
          Math.round(
            distanceMeters /
              DEFAULT_WALKING_SPEED_MPS,
          ),
        ),
      geometry: {
        type: "LineString",
        coordinates,
      },
    };
  }

  private buildRouteUrl(
    originLat: number,
    originLng: number,
    destinationLat: number,
    destinationLng: number,
  ) {
    const baseUrl =
      this.baseUrl.replace(
        /\/+$/,
        "",
      );

    const coordinates =
      `${originLng},${originLat};${destinationLng},${destinationLat}`;

    const url =
      new URL(
        `/route/v1/${encodeURIComponent(this.profile)}/${coordinates}`,
        baseUrl,
      );

    url.searchParams.set(
      "overview",
      "full",
    );
    url.searchParams.set(
      "geometries",
      "geojson",
    );
    url.searchParams.set(
      "steps",
      "false",
    );
    url.searchParams.set(
      "alternatives",
      "false",
    );

    return url;
  }
}

function isLngLatPosition(
  value: unknown,
): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}
