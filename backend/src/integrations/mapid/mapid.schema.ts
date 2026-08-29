import { z } from "zod";

import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import type {
  MapidResponseValidator,
  MapidValidatedBatch,
} from "@/src/integrations/mapid/mapid.types";
import type { SpatialRecordValidator } from "@/src/modules/spatial-import/contracts";
import { pointGeometrySchema } from "@/src/schemas/spatial.schema";

export const MAPID_TEST_FIXTURE_NOTICE =
  "TEST FIXTURE - NOT REAL MAPID PRODUCTION DATA" as const;
export const MAPID_TEST_CONTRACT = "GETRA_MAPID_TEST_FIXTURE_V1" as const;

const queryValueSchema = z.union([
  z.string().max(2_048),
  z.array(z.string().max(2_048)).max(50),
]);

export const mapidRequestSchema = z
  .object({
    body: z.unknown().optional(),
    method: z.enum(["GET", "POST"]).default("GET"),
    path: z.string().trim().min(1).max(1_024),
    query: z.record(z.string().min(1).max(128), queryValueSchema).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const path = value.path;
    if (
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("://") ||
      /[?#\\\s]/.test(path)
    ) {
      context.addIssue({
        code: "custom",
        message: "MAPID request path must be a safe relative path",
        path: ["path"],
      });
    }

    if (value.method === "GET" && value.body !== undefined) {
      context.addIssue({
        code: "custom",
        message: "GET MAPID requests must not include a body",
        path: ["body"],
      });
    }
  });

export const mapidRequestContextSchema = z
  .object({
    data_version: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
    request_id: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9._:-]+$/),
    retrieved_at: z.string().datetime({ offset: true }),
    source_id: z.string().uuid(),
  })
  .strict();

/** PLACEHOLDER TEST CONTRACT. It must never be treated as official MAPID schema. */
export const mapidTestRecordSchema = z
  .object({
    attributes: z
      .object({
        corridor_id: z.string().uuid().nullable(),
        name: z.string().trim().min(1).max(200),
        node_type: z.string().trim().min(1).max(200),
        transport_mode: z.string().trim().min(1).max(200),
      })
      .strict(),
    entity_kind: z.literal("transport_node"),
    external_id: z.string().trim().min(1).max(256),
    geometry: pointGeometrySchema,
  })
  .strict();

/** PLACEHOLDER TEST CONTRACT. It must never be used to validate production data. */
export const mapidTestEnvelopeSchema = z
  .object({
    _fixture: z.literal(MAPID_TEST_FIXTURE_NOTICE),
    contract: z.literal(MAPID_TEST_CONTRACT),
    records: z.array(z.unknown()).max(1_000),
  })
  .strict();

export class MapidTestFixtureResponseValidator
  implements
    MapidResponseValidator<MapidValidatedBatch>,
    SpatialRecordValidator<unknown, MapidValidatedBatch>
{
  validate(raw: unknown): MapidValidatedBatch {
    const envelope = mapidTestEnvelopeSchema.safeParse(raw);

    if (!envelope.success) {
      throw new MapidError("MAPID_INVALID_RESPONSE");
    }

    const records: MapidValidatedBatch["records"] = [];
    const invalidRecords: MapidValidatedBatch["invalid_records"] = [];

    envelope.data.records.forEach((record, index) => {
      const parsedRecord = mapidTestRecordSchema.safeParse(record);

      if (parsedRecord.success) {
        records.push(parsedRecord.data);
      } else {
        invalidRecords.push({ index, reason: "INVALID_TEST_RECORD" });
      }
    });

    return {
      contract: MAPID_TEST_CONTRACT,
      invalid_records: invalidRecords,
      received_count: envelope.data.records.length,
      records,
    };
  }
}
