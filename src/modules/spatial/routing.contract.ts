import "server-only";

import { SpatialError } from "@/src/modules/spatial/spatial.errors";
import { parseRoutingRequest } from "@/src/modules/spatial/spatial.schema";
import type {
  RoutingRequest,
  RoutingResult,
} from "@/src/modules/spatial/spatial.types";

export interface RoutingEngine {
  calculate(input: RoutingRequest): Promise<RoutingResult>;
}

export class UnavailableRoutingEngine implements RoutingEngine {
  async calculate(input: RoutingRequest): Promise<RoutingResult> {
    parseRoutingRequest(input);
    throw new SpatialError("ROUTING_GRAPH_NOT_AVAILABLE");
  }
}

