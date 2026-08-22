import "server-only";

import type { SpatialRepositoryContract } from "@/src/modules/spatial/spatial.repository";
import { mapSpatialRepositoryError } from "@/src/modules/spatial/spatial.errors";
import { mapBBoxRecordsToDTO } from "@/src/modules/spatial/spatial.mapper";
import { parseBBoxDomainQuery } from "@/src/modules/spatial/spatial.schema";
import {
  DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
  DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
} from "@/src/modules/spatial/spatial.constants";
import type {
  BBoxResult,
  SpatialLimitationFlag,
} from "@/src/modules/spatial/spatial.types";

type BBoxRepository = Pick<SpatialRepositoryContract, "findWithinBBox">;

export class BBoxService {
  constructor(
    private readonly repository: BBoxRepository,
    private readonly limitationFlags: SpatialLimitationFlag[] = [
      "NO_PRODUCTION_DATA",
    ],
    private readonly maximumLongitudeDegrees =
      DEFAULT_SPATIAL_MAX_BBOX_LONGITUDE_DEGREES,
    private readonly maximumLatitudeDegrees =
      DEFAULT_SPATIAL_MAX_BBOX_LATITUDE_DEGREES,
  ) {}

  async findWithinBBox(input: unknown): Promise<BBoxResult> {
    const query = parseBBoxDomainQuery(
      input,
      this.maximumLongitudeDegrees,
      this.maximumLatitudeDegrees,
    );
    try {
      const records = await this.repository.findWithinBBox(query);
      return mapBBoxRecordsToDTO(query, records, this.limitationFlags);
    } catch (error) {
      throw mapSpatialRepositoryError(error);
    }
  }
}
