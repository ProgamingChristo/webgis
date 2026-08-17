import "server-only";

import type { ExternalDataProvider } from "@/src/integrations/core";
import type {
  MapidClientPort,
  MapidNormalizedBatch,
  MapidRequest,
  MapidRequestContext,
  MapidResponseValidator,
  MapidValidatedBatch,
} from "@/src/integrations/mapid/mapid.types";
import type {
  MapidNormalizationInput,
} from "@/src/integrations/mapid/mapid.normalizer";
import type { SpatialRecordNormalizer } from "@/src/modules/spatial-import/contracts";

export class MapidAdapter
  implements
    ExternalDataProvider<
      MapidRequest,
      MapidRequestContext,
      MapidValidatedBatch,
      MapidNormalizedBatch
    >
{
  constructor(
    private readonly client: MapidClientPort,
    private readonly validator: MapidResponseValidator<MapidValidatedBatch>,
    private readonly normalizer: SpatialRecordNormalizer<
      MapidNormalizationInput,
      MapidNormalizedBatch
    >,
  ) {}

  fetch(query: MapidRequest): Promise<unknown> {
    return this.client.request(query);
  }

  validate(raw: unknown): MapidValidatedBatch {
    return this.validator.validate(raw);
  }

  normalize(
    validated: MapidValidatedBatch,
    context: MapidRequestContext,
  ): MapidNormalizedBatch {
    return this.normalizer.normalize({ context, validated });
  }
}
