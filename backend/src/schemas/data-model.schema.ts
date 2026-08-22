import { z } from "zod";

import {
  SPATIAL_SOURCE_SORT_FIELDS,
  STUDY_AREA_SORT_FIELDS,
  TRANSPORT_CORRIDOR_SORT_FIELDS,
  TRANSPORT_NODE_SORT_FIELDS,
  TRANSPORT_ROUTE_STOP_SORT_FIELDS,
  UMKM_PROFILE_SORT_FIELDS,
} from "@/src/types/domain";
import { SORT_DIRECTIONS } from "@/src/types/entity";
import {
  SOURCE_TYPES,
  VALIDATION_STATUSES,
  type JsonObject,
  type JsonValue,
} from "@/src/types/provenance";
import {
  corridorGeometrySchema,
  lineStringGeometrySchema,
  multiPolygonGeometrySchema,
  pointGeometrySchema,
} from "@/src/schemas/spatial.schema";

export const MAX_METADATA_SERIALIZED_BYTES = 16 * 1024;
export const MAX_METADATA_DEPTH = 8;
export const MAX_METADATA_ENTRIES = 256;

const sensitiveMetadataKeyFragments = [
  "apikey",
  "authorization",
  "connectionstring",
  "cookie",
  "credential",
  "databaseurl",
  "password",
  "passwd",
  "privatekey",
  "secret",
  "servicerole",
  "token",
] as const;

const forbiddenMetadataKeys = new Set(["__proto__", "constructor", "prototype"]);

function normalizeMetadataKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveMetadataKey(key: string): boolean {
  if (forbiddenMetadataKeys.has(key.toLowerCase())) {
    return true;
  }

  const normalized = normalizeMetadataKey(key);
  return sensitiveMetadataKeyFragments.some((fragment) =>
    normalized.includes(fragment),
  );
}

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string().max(4_096),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema).max(128),
    z.record(z.string().min(1).max(128), jsonValueSchema),
  ]),
);

const metadataObjectSchema = z.record(
  z.string().min(1).max(128),
  jsonValueSchema,
);

function inspectMetadata(
  value: JsonValue,
  context: z.RefinementCtx,
  path: PropertyKey[] = [],
  depth = 0,
  state = { entries: 0 },
): void {
  if (depth > MAX_METADATA_DEPTH) {
    context.addIssue({
      code: "custom",
      message: `Metadata nesting must not exceed ${MAX_METADATA_DEPTH} levels`,
      path,
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      inspectMetadata(item, context, [...path, index], depth + 1, state),
    );
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    state.entries += 1;

    if (state.entries > MAX_METADATA_ENTRIES) {
      context.addIssue({
        code: "custom",
        message: `Metadata must not exceed ${MAX_METADATA_ENTRIES} entries`,
        path,
      });
      return;
    }

    if (isSensitiveMetadataKey(key)) {
      context.addIssue({
        code: "custom",
        message: "Metadata must not contain sensitive key names",
        path: [...path, key],
      });
    }

    inspectMetadata(nestedValue, context, [...path, key], depth + 1, state);
  }
}

export const metadataSchema = metadataObjectSchema.superRefine(
  (metadata, context) => {
    inspectMetadata(metadata, context);

    const serialized = JSON.stringify(metadata);
    const serializedBytes = new TextEncoder().encode(serialized).byteLength;

    if (serializedBytes > MAX_METADATA_SERIALIZED_BYTES) {
      context.addIssue({
        code: "custom",
        message: `Metadata must not exceed ${MAX_METADATA_SERIALIZED_BYTES} serialized bytes`,
      });
    }
  },
) satisfies z.ZodType<JsonObject>;

export const sourceTypeSchema = z.enum(SOURCE_TYPES);
export const validationStatusSchema = z.enum(VALIDATION_STATUSES);

const uuidSchema = z.string().uuid();
const nullableUuidSchema = uuidSchema.nullable();
const timestampSchema = z.string().datetime({ offset: true });
const dataVersionSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    "Data version contains unsupported characters",
  );
const sourceRecordIdSchema = z.string().trim().min(1).max(256);

type ProvenanceCandidate = {
  source_id?: string | null;
  source_type?: (typeof SOURCE_TYPES)[number] | null;
  source_record_id?: string | null;
  validated_at?: string | null;
  validation_status?: (typeof VALIDATION_STATUSES)[number];
};

function validateSourceIdentity(
  value: ProvenanceCandidate,
  context: z.RefinementCtx,
): void {
  const hasSourceId = value.source_id !== null && value.source_id !== undefined;
  const hasSourceType =
    value.source_type !== null && value.source_type !== undefined;

  if (hasSourceId !== hasSourceType) {
    context.addIssue({
      code: "custom",
      message: "source_id and source_type must be provided together",
      path: hasSourceId ? ["source_type"] : ["source_id"],
    });
  }

  if (value.source_record_id && !hasSourceId) {
    context.addIssue({
      code: "custom",
      message: "source_record_id requires source_id",
      path: ["source_record_id"],
    });
  }
}

function validateCreateSourceIdentity(
  value: Pick<ProvenanceCandidate, "source_id" | "source_record_id">,
  context: z.RefinementCtx,
): void {
  if (value.source_record_id && !value.source_id) {
    context.addIssue({
      code: "custom",
      message: "source_record_id requires source_id",
      path: ["source_record_id"],
    });
  }
}

function validateValidationDecision(
  value: ProvenanceCandidate,
  context: z.RefinementCtx,
): void {
  if (
    (value.validation_status === "VALIDATED" ||
      value.validation_status === "REJECTED") &&
    !value.validated_at
  ) {
    context.addIssue({
      code: "custom",
      message: "validated_at is required for a validation decision",
      path: ["validated_at"],
    });
  }

  if (
    value.validation_status === "PENDING" &&
    value.validated_at !== null
  ) {
    context.addIssue({
      code: "custom",
      message: "PENDING provenance requires validated_at to be null",
      path: ["validated_at"],
    });
  }
}

export const provenanceSchema = z
  .object({
    source_id: nullableUuidSchema,
    source_type: sourceTypeSchema.nullable(),
    source_record_id: sourceRecordIdSchema.nullable(),
    data_version: dataVersionSchema,
    retrieved_at: timestampSchema,
    validated_at: timestampSchema.nullable(),
    validation_status: validationStatusSchema,
    metadata: metadataSchema,
  })
  .strict()
  .superRefine((value, context) => {
    validateSourceIdentity(value, context);
    validateValidationDecision(value, context);
  });

export const createProvenanceSchema = z
  .object({
    source_id: nullableUuidSchema.default(null),
    source_record_id: sourceRecordIdSchema.nullable().default(null),
    data_version: dataVersionSchema.default("1"),
    retrieved_at: timestampSchema.optional(),
    validated_at: timestampSchema.nullable().default(null),
    validation_status: validationStatusSchema.default("PENDING"),
    metadata: metadataSchema.default({}),
  })
  .strict()
  .superRefine((value, context) => {
    validateCreateSourceIdentity(value, context);
    validateValidationDecision(value, context);
  });

export const updateProvenanceSchema = z
  .object({
    data_version: dataVersionSchema.optional(),
    retrieved_at: timestampSchema.optional(),
    validated_at: timestampSchema.nullable().optional(),
    validation_status: validationStatusSchema.optional(),
    metadata: metadataSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: "custom",
        message: "At least one provenance field must be provided",
      });
    }

    if (value.validated_at !== undefined && value.validation_status === undefined) {
      context.addIssue({
        code: "custom",
        message: "validation_status is required when validated_at is supplied",
        path: ["validation_status"],
      });
    }

    validateValidationDecision(value, context);
  });

const pageSchema = z.coerce.number().int().min(1).optional();
const limitSchema = z.coerce.number().int().min(1).max(100).default(20);
const offsetSchema = z.coerce.number().int().min(0).optional();

const paginationShape = {
  page: pageSchema,
  limit: limitSchema,
  offset: offsetSchema,
};

type RawPagination = {
  page?: number;
  limit: number;
  offset?: number;
};

function resolvePage(value: RawPagination): number {
  if (value.page !== undefined) {
    return value.page;
  }

  if (value.offset !== undefined) {
    return Math.floor(value.offset / value.limit) + 1;
  }

  return 1;
}

function validatePaginationOffset(
  value: RawPagination,
  context: z.RefinementCtx,
): void {
  if (value.offset === undefined) {
    return;
  }

  const page = resolvePage(value);
  const expectedOffset = (page - 1) * value.limit;

  if (value.offset !== expectedOffset) {
    context.addIssue({
      code: "custom",
      message: "offset must equal (page - 1) * limit",
      path: ["offset"],
    });
  }
}

function normalizePagination<T extends RawPagination>(value: T) {
  const page = resolvePage(value);
  return {
    ...value,
    page,
    offset: value.offset ?? (page - 1) * value.limit,
  };
}

export const paginationQuerySchema = z
  .object(paginationShape)
  .strict()
  .superRefine(validatePaginationOffset)
  .transform(normalizePagination);

const nonemptyTextSchema = z.string().trim().min(1).max(200);
const descriptionSchema = z.string().trim().max(2_000).nullable();
const addressSchema = z.string().trim().max(500).nullable();

function requireAtLeastOneField(
  value: Record<string, unknown>,
  context: z.RefinementCtx,
): void {
  if (Object.keys(value).length === 0) {
    context.addIssue({
      code: "custom",
      message: "At least one field must be provided",
    });
  }
}

export const createSpatialSourceSchema = z
  .object({
    source_name: nonemptyTextSchema,
    source_type: sourceTypeSchema,
    description: descriptionSchema.optional(),
    metadata: metadataSchema.default({}),
  })
  .strict();

export const updateSpatialSourceSchema = z
  .object({
    source_name: nonemptyTextSchema.optional(),
    description: descriptionSchema.optional(),
    metadata: metadataSchema.optional(),
  })
  .strict()
  .superRefine(requireAtLeastOneField);

export const createStudyAreaSchema = z
  .object({
    name: nonemptyTextSchema,
    description: descriptionSchema.optional(),
    geometry: multiPolygonGeometrySchema,
    provenance: createProvenanceSchema,
  })
  .strict();

export const updateStudyAreaSchema = z
  .object({
    name: nonemptyTextSchema.optional(),
    description: descriptionSchema.optional(),
    geometry: multiPolygonGeometrySchema.optional(),
    provenance: updateProvenanceSchema.optional(),
  })
  .strict()
  .superRefine(requireAtLeastOneField);

export const createTransportCorridorSchema = z
  .object({
    name: nonemptyTextSchema,
    transport_mode: nonemptyTextSchema,
    description: descriptionSchema.optional(),
    geometry: corridorGeometrySchema,
    provenance: createProvenanceSchema,
  })
  .strict();

export const updateTransportCorridorSchema = z
  .object({
    name: nonemptyTextSchema.optional(),
    transport_mode: nonemptyTextSchema.optional(),
    description: descriptionSchema.optional(),
    geometry: corridorGeometrySchema.optional(),
    provenance: updateProvenanceSchema.optional(),
  })
  .strict()
  .superRefine(requireAtLeastOneField);

export const createTransportNodeSchema = z
  .object({
    corridor_id: nullableUuidSchema.optional(),
    name: nonemptyTextSchema,
    node_type: nonemptyTextSchema,
    transport_mode: nonemptyTextSchema,
    geometry: pointGeometrySchema,
    provenance: createProvenanceSchema,
  })
  .strict();

export const updateTransportNodeSchema = z
  .object({
    corridor_id: nullableUuidSchema.optional(),
    name: nonemptyTextSchema.optional(),
    node_type: nonemptyTextSchema.optional(),
    transport_mode: nonemptyTextSchema.optional(),
    geometry: pointGeometrySchema.optional(),
    provenance: updateProvenanceSchema.optional(),
  })
  .strict()
  .superRefine(requireAtLeastOneField);

export const createTransportRouteStopSchema = z
  .object({
    corridor_id: uuidSchema,
    node_id: uuidSchema,
    stop_sequence: z.number().int().min(0),
  })
  .strict();

export const updateTransportRouteStopSchema = z
  .object({
    corridor_id: uuidSchema.optional(),
    node_id: uuidSchema.optional(),
    stop_sequence: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine(requireAtLeastOneField);

export const createUmkmProfileSchema = z
  .object({
    business_name: nonemptyTextSchema,
    category: nonemptyTextSchema,
    description: descriptionSchema.optional(),
    address: addressSchema.optional(),
    geometry: pointGeometrySchema,
  })
  .strict();

export const updateUmkmProfileSchema = z
  .object({
    business_name: nonemptyTextSchema.optional(),
    category: nonemptyTextSchema.optional(),
    description: descriptionSchema.optional(),
    address: addressSchema.optional(),
    geometry: pointGeometrySchema.optional(),
  })
  .strict()
  .superRefine(requireAtLeastOneField);

const spatialSourceFilterShape = {
  source_type: sourceTypeSchema.optional(),
};
const studyAreaFilterShape = {
  source_id: uuidSchema.optional(),
  validation_status: validationStatusSchema.optional(),
};
const transportCorridorFilterShape = {
  source_id: uuidSchema.optional(),
  transport_mode: nonemptyTextSchema.optional(),
  validation_status: validationStatusSchema.optional(),
};
const transportNodeFilterShape = {
  source_id: uuidSchema.optional(),
  corridor_id: uuidSchema.optional(),
  transport_mode: nonemptyTextSchema.optional(),
  node_type: nonemptyTextSchema.optional(),
  validation_status: validationStatusSchema.optional(),
};
const transportRouteStopFilterShape = {
  corridor_id: uuidSchema.optional(),
  node_id: uuidSchema.optional(),
};
const umkmProfileFilterShape = {
  owner_id: uuidSchema.optional(),
  source_id: uuidSchema.optional(),
  category: nonemptyTextSchema.optional(),
  validation_status: validationStatusSchema.optional(),
};

export const spatialSourceFilterSchema = z
  .object(spatialSourceFilterShape)
  .strict();
export const studyAreaFilterSchema = z.object(studyAreaFilterShape).strict();
export const transportCorridorFilterSchema = z
  .object(transportCorridorFilterShape)
  .strict();
export const transportNodeFilterSchema = z
  .object(transportNodeFilterShape)
  .strict();
export const transportRouteStopFilterSchema = z
  .object(transportRouteStopFilterShape)
  .strict();
export const umkmProfileFilterSchema = z
  .object(umkmProfileFilterShape)
  .strict();

export const spatialSourceSortSchema = z
  .object({
    sort: z.enum(SPATIAL_SOURCE_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict();
export const studyAreaSortSchema = z
  .object({
    sort: z.enum(STUDY_AREA_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict();
export const transportCorridorSortSchema = z
  .object({
    sort: z.enum(TRANSPORT_CORRIDOR_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict();
export const transportNodeSortSchema = z
  .object({
    sort: z.enum(TRANSPORT_NODE_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict();
export const transportRouteStopSortSchema = z
  .object({
    sort: z.enum(TRANSPORT_ROUTE_STOP_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict();
export const umkmProfileSortSchema = z
  .object({
    sort: z.enum(UMKM_PROFILE_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict();

export const spatialSourceListQuerySchema = z
  .object({
    ...paginationShape,
    ...spatialSourceFilterShape,
    sort: z.enum(SPATIAL_SOURCE_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict()
  .superRefine(validatePaginationOffset)
  .transform(normalizePagination);

export const studyAreaListQuerySchema = z
  .object({
    ...paginationShape,
    ...studyAreaFilterShape,
    sort: z.enum(STUDY_AREA_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict()
  .superRefine(validatePaginationOffset)
  .transform(normalizePagination);

export const transportCorridorListQuerySchema = z
  .object({
    ...paginationShape,
    ...transportCorridorFilterShape,
    sort: z.enum(TRANSPORT_CORRIDOR_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict()
  .superRefine(validatePaginationOffset)
  .transform(normalizePagination);

export const transportNodeListQuerySchema = z
  .object({
    ...paginationShape,
    ...transportNodeFilterShape,
    sort: z.enum(TRANSPORT_NODE_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict()
  .superRefine(validatePaginationOffset)
  .transform(normalizePagination);

export const transportRouteStopListQuerySchema = z
  .object({
    ...paginationShape,
    ...transportRouteStopFilterShape,
    sort: z.enum(TRANSPORT_ROUTE_STOP_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict()
  .superRefine(validatePaginationOffset)
  .transform(normalizePagination);

export const umkmProfileListQuerySchema = z
  .object({
    ...paginationShape,
    ...umkmProfileFilterShape,
    sort: z.enum(UMKM_PROFILE_SORT_FIELDS).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict()
  .superRefine(validatePaginationOffset)
  .transform(normalizePagination);

export const createPedestrianNodeSchema = z
  .object({
    code: nonemptyTextSchema,
    geometry: pointGeometrySchema,
    study_area_id: uuidSchema,
    provenance: createProvenanceSchema,
  })
  .strict();

export const updatePedestrianNodeSchema = z
  .object({
    code: nonemptyTextSchema.optional(),
    geometry: pointGeometrySchema.optional(),
    study_area_id: uuidSchema.optional(),
    provenance: updateProvenanceSchema.optional(),
  })
  .strict()
  .superRefine(requireAtLeastOneField);

export const createPedestrianEdgeSchema = z
  .object({
    code: nonemptyTextSchema,
    source: z.number().int().positive(),
    target: z.number().int().positive(),
    geometry: lineStringGeometrySchema,
    length_meters: z.number().positive(),
    cost: z.number(),
    reverse_cost: z.number(),
    walkable: z.boolean(),
    study_area_id: uuidSchema,
    environment: z.string(),
    provenance: createProvenanceSchema,
  })
  .strict();

export const updatePedestrianEdgeSchema = z
  .object({
    geometry: lineStringGeometrySchema.optional(),
    length_meters: z.number().positive().optional(),
    cost: z.number().optional(),
    reverse_cost: z.number().optional(),
    walkable: z.boolean().optional(),
    provenance: updateProvenanceSchema.optional(),
  })
  .strict()
  .superRefine(requireAtLeastOneField);

const pedestrianNodeFilterShape = {
  source_id: uuidSchema.optional(),
  study_area_id: uuidSchema.optional(),
  validation_status: validationStatusSchema.optional(),
};

const pedestrianEdgeFilterShape = {
  source_id: uuidSchema.optional(),
  study_area_id: uuidSchema.optional(),
  validation_status: validationStatusSchema.optional(),
};

export const pedestrianNodeFilterSchema = z.object(pedestrianNodeFilterShape).strict();
export const pedestrianEdgeFilterSchema = z.object(pedestrianEdgeFilterShape).strict();

export const pedestrianNodeSortSchema = z
  .object({
    sort: z.enum(["created_at", "updated_at", "code"]).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict();

export const pedestrianEdgeSortSchema = z
  .object({
    sort: z.enum(["created_at", "updated_at", "code", "length_meters"]).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict();

export const pedestrianNodeListQuerySchema = z
  .object({
    ...paginationShape,
    ...pedestrianNodeFilterShape,
    sort: z.enum(["created_at", "updated_at", "code"]).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict()
  .superRefine(validatePaginationOffset)
  .transform(normalizePagination);

export const pedestrianEdgeListQuerySchema = z
  .object({
    ...paginationShape,
    ...pedestrianEdgeFilterShape,
    sort: z.enum(["created_at", "updated_at", "code", "length_meters"]).default("created_at"),
    order: z.enum(SORT_DIRECTIONS).default("desc"),
  })
  .strict()
  .superRefine(validatePaginationOffset)
  .transform(normalizePagination);

export const createTransportAccessLinkSchema = z
  .object({
    transport_node_id: uuidSchema,
    pedestrian_node_id: uuidSchema,
    distance_meters: z.number().nonnegative(),
    environment: nonemptyTextSchema,
  })
  .strict();

// ==========================================
// Phase 12: UMKM / POI Entity Schemas
// ==========================================

export const UMKM_SORT_FIELDS = ["created_at", "updated_at", "name", "distance"] as const;
export const POI_SORT_FIELDS = ["created_at", "updated_at", "name", "distance"] as const;

export const createUmkmSchema = z
  .object({
    code: nonemptyTextSchema,
    name: nonemptyTextSchema,
    category: nonemptyTextSchema,
    description: z.string().optional(),
    geometry: pointGeometrySchema,
    studyAreaId: uuidSchema,
    environment: z.literal("DUMMY"), // Strictly forcing DUMMY in phase 12
    provenance: createProvenanceSchema,
  })
  .strict();

export const updateUmkmSchema = z
  .object({
    name: nonemptyTextSchema.optional(),
    category: nonemptyTextSchema.optional(),
    description: z.string().optional(),
    geometry: pointGeometrySchema.optional(),
    provenance: updateProvenanceSchema.optional(),
  })
  .strict();

export const createPoiSchema = z
  .object({
    code: nonemptyTextSchema,
    name: nonemptyTextSchema,
    category: nonemptyTextSchema,
    geometry: pointGeometrySchema,
    studyAreaId: uuidSchema,
    environment: z.literal("DUMMY"),
    provenance: createProvenanceSchema,
  })
  .strict();

export const updatePoiSchema = z
  .object({
    name: nonemptyTextSchema.optional(),
    category: nonemptyTextSchema.optional(),
    geometry: pointGeometrySchema.optional(),
    provenance: updateProvenanceSchema.optional(),
  })
  .strict();

export const createEntityNetworkAccessSchema = z
  .object({
    entityType: z.enum(["UMKM", "POI"]),
    entityId: uuidSchema,
    pedestrianNodeId: uuidSchema,
    snapDistanceMeters: z.number().nonnegative(),
    environment: z.literal("DUMMY"),
  })
  .strict();

export const spatialNearbyQuerySchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radiusMeters: z.number().positive().max(5000), // Hard limit to 5km max
    limit: z.number().positive().max(100).optional().default(20),
    category: z.string().optional(),
    environment: z.literal("DUMMY").optional().default("DUMMY"),
  })
  .strict();

