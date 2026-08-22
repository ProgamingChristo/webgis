import "server-only";

import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import {
  MAPID_TEST_CONTRACT,
  mapidRequestContextSchema,
} from "@/src/integrations/mapid/mapid.schema";
import {
  MAPID_PROVIDER,
  type MapidNormalizedBatch,
  type MapidRequestContext,
  type MapidSafeMetadata,
  type MapidValidatedBatch,
} from "@/src/integrations/mapid/mapid.types";
import type { SpatialRecordNormalizer } from "@/src/modules/spatial-import/contracts";
import { metadataSchema } from "@/src/schemas/data-model.schema";

export interface MapidNormalizationInput {
  context: MapidRequestContext;
  validated: MapidValidatedBatch;
}

export class MapidTestFixtureNormalizer
  implements SpatialRecordNormalizer<MapidNormalizationInput, MapidNormalizedBatch>
{
  normalize(input: MapidNormalizationInput): MapidNormalizedBatch {
    const context = mapidRequestContextSchema.safeParse(input.context);
    if (!context.success) {
      throw new MapidError("MAPID_CONFIGURATION_ERROR");
    }

    const metadata = metadataSchema.parse({
      contract: MAPID_TEST_CONTRACT,
      fixture: true,
      provider: MAPID_PROVIDER,
    }) as MapidSafeMetadata;

    return {
      contract: MAPID_TEST_CONTRACT,
      invalid_records: input.validated.invalid_records,
      received_count: input.validated.received_count,
      records: input.validated.records.map((record) => ({
        data_version: context.data.data_version,
        entity_kind: "transport_node",
        geometry: record.geometry,
        metadata,
        properties: record.attributes,
        provider: MAPID_PROVIDER,
        retrieved_at: context.data.retrieved_at,
        source_id: context.data.source_id,
        source_record_id: record.external_id,
        validation_status: "PENDING",
      })),
    };
  }
}
