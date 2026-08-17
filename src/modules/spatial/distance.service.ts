import "server-only";

import type { SpatialRepositoryContract } from "@/src/modules/spatial/spatial.repository";
import { mapSpatialRepositoryError } from "@/src/modules/spatial/spatial.errors";
import { mapPostgisDistanceToDTO } from "@/src/modules/spatial/spatial.mapper";
import { parseDistanceRequest } from "@/src/modules/spatial/spatial.schema";
import type { DistanceResult } from "@/src/modules/spatial/spatial.types";

type DistanceRepository = Pick<SpatialRepositoryContract, "calculateDistance">;

export class DistanceService {
  constructor(private readonly repository: DistanceRepository) {}

  async calculate(input: unknown): Promise<DistanceResult> {
    const request = parseDistanceRequest(input);
    try {
      const distance = await this.repository.calculateDistance(
        request.origin,
        request.destination,
      );
      return mapPostgisDistanceToDTO(distance);
    } catch (error) {
      throw mapSpatialRepositoryError(error);
    }
  }
}

