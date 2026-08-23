import type {
  NextRequest,
  NextResponse,
} from "next/server";

import { withApiLogger } from "@/src/lib/api-logger";
import { createOptionsHandler } from "@/src/lib/api-security";
import { createSuccessResponse } from "@/src/lib/api-response";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import { ApplicationError } from "@/src/lib/errors";
import { rateLimiter } from "@/src/lib/rate-limit";
import { getRequestId } from "@/src/lib/request-id";

export const runtime = "nodejs";
export const maxDuration = 20;

const DEFAULT_MAPID_FOOD_BEVERAGE_LAYER_URL =
  "https://geoserver.mapid.io/layers_new/get_layer?api_key=088b84f22a7d43f6a30e3742c7777759&layer_id=6a8a0c594da1860f1342c221&project_id=6a7dc2492456fcd172136867";

const MAPID_FETCH_TIMEOUT_MS =
  15_000;

type MapidFoodFeature = {
  id?: string;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
};

type MapidFoodLayerResponse = {
  layer_id?: string;
  layer_name?: string;
  type?: string;
  features?: MapidFoodFeature[];
};

type NormalizedMapidMerchant = {
  id: string;
  name: string;
  category: string;
  brand: string;
  longitude: number;
  latitude: number;
  walkingMinutes: number;
  distanceMeters: number;
  accessibilityScore: number;
  priceLabel: "Hemat" | "Sedang" | "Premium";
  openNow: boolean;
  source: string;
  status: "verified";
  updatedAt: string;
  limitation: string;
  address?: string;
  phone?: string;
  district?: string;
  village?: string;
  city?: string;
  province?: string;
  collectedAt?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId =
    getRequestId(
      request,
    );

  return withApiLogger(
    request,
    requestId,
    async () => {
      const userId =
        await requireAuthenticatedUser(
          request,
        );

      await rateLimiter.checkLimit(
        request,
        `${userId}:mapid:food-beverage`,
      );

      const layer =
        await fetchMapidFoodLayer();

      const merchants =
        normalizeFoodLayer(
          layer,
        );

      return createSuccessResponse(
        requestId,
        {
          layer_id:
            layer.layer_id ??
            "unknown",
          layer_name:
            layer.layer_name ??
            "MAPID makanan dan minuman",
          source:
            "MAPID Open API",
          city:
            "KOTA ADM. JAKARTA PUSAT",
          collected_at:
            getFirstStringProperty(
              layer,
              "TANGGAL PENGUMPULAN",
            ) ??
            "2025",
          total_features:
            merchants.length,
          merchants,
        },
      );
    },
  );
}

export const OPTIONS =
  createOptionsHandler(
    "/api/mapid/food-beverage",
  );

async function fetchMapidFoodLayer():
Promise<MapidFoodLayerResponse> {
  const url =
    process.env.MAPID_FOOD_BEVERAGE_LAYER_URL?.trim() ||
    DEFAULT_MAPID_FOOD_BEVERAGE_LAYER_URL;

  const response =
    await fetch(
      url,
      {
        headers: {
          accept:
            "application/json",
          "user-agent":
            "GETRA/0.1 MAPID food-beverage layer",
        },
        signal:
          AbortSignal.timeout(
            MAPID_FETCH_TIMEOUT_MS,
          ),
      },
    );

  if (!response.ok) {
    throw new ApplicationError(
      "DATABASE_UNAVAILABLE",
      "MAPID food-beverage layer is unavailable",
      true,
    );
  }

  const layer =
    (await response.json()) as MapidFoodLayerResponse;

  if (
    layer.type !==
      "FeatureCollection" ||
    !Array.isArray(
      layer.features,
    )
  ) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "MAPID food-beverage layer response is invalid",
    );
  }

  return layer;
}

function normalizeFoodLayer(
  layer: MapidFoodLayerResponse,
): NormalizedMapidMerchant[] {
  return (
    layer.features ??
    []
  )
    .map(
      (
        feature,
        index,
      ) =>
        normalizeFeature(
          feature,
          index,
          layer.layer_name ??
            "MAPID makanan dan minuman Jakarta Pusat",
        ),
    )
    .filter(
      (
        merchant,
      ): merchant is NormalizedMapidMerchant =>
        merchant !== null,
    );
}

function normalizeFeature(
  feature: MapidFoodFeature,
  index: number,
  sourceName: string,
): NormalizedMapidMerchant | null {
  const properties =
    feature.properties ??
    {};

  const coordinates =
    Array.isArray(
      feature.geometry?.coordinates,
    )
      ? feature.geometry.coordinates
      : null;

  const longitude =
    toFiniteNumber(
      properties.LONGITUDE,
    ) ??
    toFiniteNumber(
      coordinates?.[0],
    );

  const latitude =
    toFiniteNumber(
      properties.LATITUDE,
    ) ??
    toFiniteNumber(
      coordinates?.[1],
    );

  if (
    longitude === null ||
    latitude === null
  ) {
    return null;
  }

  const name =
    readString(
      properties.NAMA,
    ) ||
    `MAPID Food Beverage ${index + 1}`;

  const category =
    readString(
      properties.TIPE_3,
    ) ||
    readString(
      properties.TIPE_2,
    ) ||
    "Makanan dan Minuman";

  const brand =
    readString(
      properties.TIPE_2,
    ) ||
    "Makanan dan Minuman";

  const openNow =
    readString(
      properties.STATUS,
    ).toUpperCase() !==
    "TUTUP";

  return {
    id:
      `mapid-food-${feature.id ?? `${longitude}-${latitude}-${index}`}`,
    name,
    category,
    brand,
    longitude,
    latitude,
    walkingMinutes:
      0,
    distanceMeters:
      0,
    accessibilityScore:
      80,
    priceLabel:
      "Sedang",
    openNow,
    source:
      sourceName,
    status:
      "verified",
    updatedAt:
      readString(
        properties["TANGGAL UPDATE"],
      ) ||
      "2025",
    limitation:
      "Titik berasal dari MAPID Open API. Walking time dihitung dinamis dari lokasi pengguna atau route planner GETRA.",
    address:
      readOptionalString(
        properties.ALAMAT,
      ),
    phone:
      readOptionalString(
        properties.TELEPON,
      ),
    district:
      readOptionalString(
        properties.KECAMATAN,
      ),
    village:
      readOptionalString(
        properties.DESA,
      ),
    city:
      readOptionalString(
        properties.KABKOT,
      ),
    province:
      readOptionalString(
        properties.PROVINSI,
      ),
    collectedAt:
      readOptionalString(
        properties["TANGGAL PENGUMPULAN"],
      ),
  };
}

function getFirstStringProperty(
  layer: MapidFoodLayerResponse,
  propertyName: string,
) {
  for (const feature of layer.features ?? []) {
    const value =
      readOptionalString(
        feature.properties?.[propertyName],
      );

    if (value) {
      return value;
    }
  }

  return null;
}

function readOptionalString(
  value: unknown,
) {
  const text =
    readString(
      value,
    );

  return text || undefined;
}

function readString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function toFiniteNumber(
  value: unknown,
) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(
    number,
  )
    ? number
    : null;
}
