import type { NormalizedSpatialRecord } from "@/src/modules/spatial-import/contracts";
import type { JsonObject } from "@/src/types/provenance";
import type { PointGeometry } from "@/src/types/spatial";

export const MAPID_PROVIDER = "MAPID" as const;

export type MapidRawResponse = unknown;

export interface MapidRequest {
  method?: "GET";
  path: string;
  query?: Readonly<Record<string, string | readonly string[]>>;
}

export interface MapidRetryConfig {
  baseDelayMs: number;
  maxAttempts: number;
}

export interface MapidProviderConfig {
  apiKey: string;
  baseUrl: string;
  retry: MapidRetryConfig;
  timeoutMs: number;
}

/**
 * No implementation is supplied until MAPID's official authentication contract
 * is verified. Server-owned code must explicitly provide the strategy.
 */
export interface MapidAuthenticationStrategy {
  apply(headers: Headers, apiKey: string): void;
}

export interface MapidRequestContext {
  data_version: string;
  request_id: string;
  retrieved_at: string;
  source_id: string;
}

/** TEST CONTRACT ONLY. This is not MAPID's production response schema. */
export interface MapidTestTransportNodeRecord {
  attributes: {
    corridor_id: string | null;
    name: string;
    node_type: string;
    transport_mode: string;
  };
  entity_kind: "transport_node";
  external_id: string;
  geometry: PointGeometry;
}

export interface MapidInvalidRecord {
  index: number;
  reason: "INVALID_TEST_RECORD";
}

export interface MapidValidatedBatch {
  contract: "GETRA_MAPID_TEST_FIXTURE_V1";
  invalid_records: MapidInvalidRecord[];
  received_count: number;
  records: MapidTestTransportNodeRecord[];
}

export interface MapidTransportNodeProperties {
  corridor_id: string | null;
  name: string;
  node_type: string;
  transport_mode: string;
}

export type MapidNormalizedRecord = NormalizedSpatialRecord<
  PointGeometry,
  MapidTransportNodeProperties
> & {
  entity_kind: "transport_node";
  provider: typeof MAPID_PROVIDER;
};

export interface MapidNormalizedBatch {
  contract: "GETRA_MAPID_TEST_FIXTURE_V1";
  invalid_records: MapidInvalidRecord[];
  received_count: number;
  records: MapidNormalizedRecord[];
}

export interface MapidClientPort {
  request(request: MapidRequest): Promise<MapidRawResponse>;
}

export interface MapidResponseValidator<TValidated> {
  validate(raw: unknown): TValidated;
}

export interface MapidSafeMetadata extends JsonObject {
  contract: "GETRA_MAPID_TEST_FIXTURE_V1";
  fixture: true;
  provider: typeof MAPID_PROVIDER;
}
