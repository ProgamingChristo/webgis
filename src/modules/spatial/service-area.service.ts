import "server-only";

import { SpatialError } from "@/src/modules/spatial/spatial.errors";
import { parseServiceAreaRequest } from "@/src/modules/spatial/spatial.schema";
import type {
  ServiceAreaRequest,
  ServiceAreaResult,
} from "@/src/modules/spatial/spatial.types";

export interface ServiceAreaEngine {
  calculate(input: ServiceAreaRequest): Promise<ServiceAreaResult>;
}

export class ServiceAreaService implements ServiceAreaEngine {
  async calculate(input: ServiceAreaRequest): Promise<ServiceAreaResult> {
    parseServiceAreaRequest(input);
    throw new SpatialError("SPATIAL_NETWORK_NOT_READY");
  }
}

