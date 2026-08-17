import "server-only";

import type { SpatialRepositoryContract } from "@/src/modules/spatial/spatial.repository";
import { mapSpatialRepositoryError } from "@/src/modules/spatial/spatial.errors";
import { mapNearbyRecordsToDTO } from "@/src/modules/spatial/spatial.mapper";
import { parseNearbyDomainQuery } from "@/src/modules/spatial/spatial.schema";
import type {
  NearbyResult,
  SpatialLimitationFlag,
} from "@/src/modules/spatial/spatial.types";

type ProximityRepository = Pick<SpatialRepositoryContract, "findWithinRadius">;

export class ProximityService {
  constructor(
    private readonly repository: ProximityRepository,
    private readonly maxRadiusMeters: number,
    private readonly limitationFlags: SpatialLimitationFlag[] = [
      "NO_PRODUCTION_DATA",
    ],
  ) {}

  async findNearby(input: unknown): Promise<NearbyResult> {
    const query = parseNearbyDomainQuery(input, this.maxRadiusMeters);
    try {
      const records = await this.repository.findWithinRadius(query);
      return mapNearbyRecordsToDTO(query, records, this.limitationFlags);
    } catch (error) {
      throw mapSpatialRepositoryError(error);
    }
  }
}
