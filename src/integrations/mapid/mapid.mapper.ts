import "server-only";

import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import type { MapidNormalizedRecord } from "@/src/integrations/mapid/mapid.types";
import {
  createTransportNodeSchema,
  updateTransportNodeSchema,
} from "@/src/schemas/data-model.schema";
import type { ExternalEntityWrite } from "@/src/types/integrations/external-record";

export function mapMapidRecordToExternalEntityInput(
  record: MapidNormalizedRecord,
): ExternalEntityWrite {
  const createInput = createTransportNodeSchema.safeParse({
    corridor_id: record.properties.corridor_id,
    geometry: record.geometry,
    name: record.properties.name,
    node_type: record.properties.node_type,
    provenance: {
      data_version: record.data_version,
      metadata: record.metadata,
      retrieved_at: record.retrieved_at,
      source_id: record.source_id,
      source_record_id: record.source_record_id,
      validated_at: null,
      validation_status: "PENDING",
    },
    transport_mode: record.properties.transport_mode,
  });
  const updateInput = updateTransportNodeSchema.safeParse({
    corridor_id: record.properties.corridor_id,
    geometry: record.geometry,
    name: record.properties.name,
    node_type: record.properties.node_type,
    provenance: {
      data_version: record.data_version,
      metadata: record.metadata,
      retrieved_at: record.retrieved_at,
      validated_at: null,
      validation_status: "PENDING",
    },
    transport_mode: record.properties.transport_mode,
  });

  if (!createInput.success || !updateInput.success) {
    throw new MapidError("MAPID_INVALID_RESPONSE");
  }

  return {
    create_input: createInput.data,
    entity_kind: "transport_node",
    update_input: updateInput.data,
  };
}
