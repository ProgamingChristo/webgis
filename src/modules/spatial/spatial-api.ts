import "server-only";

import type { NextRequest } from "next/server";

import { ApplicationError } from "@/src/lib/errors";
import { getRequestSupabaseClient } from "@/src/lib/supabase/server";
import type { SpatialConfig } from "@/src/modules/spatial/spatial.config";
import {
  createSpatialService,
  type SpatialService,
} from "@/src/modules/spatial/spatial.service";

export function createRequestSpatialService(
  request: NextRequest,
  config: SpatialConfig,
): SpatialService {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    throw new ApplicationError("UNAUTHORIZED");
  }

  return createSpatialService(
    getRequestSupabaseClient(authorization),
    config,
  );
}

export function getStrictSearchParams(request: NextRequest): Record<string, string> {
  const values = Object.create(null) as Record<string, string>;
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (Object.hasOwn(values, key)) {
      throw new ApplicationError("VALIDATION_ERROR");
    }
    values[key] = value;
  }
  return values;
}
