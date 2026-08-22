import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { coordinateToEwktPoint } from "@/src/lib/spatial/coordinates";
import { prepareWgs84Geometry } from "@/src/lib/spatial/geometry";
import {
  mapStudyAreaRowToDTO,
  mapTransportCorridorRowToDTO,
  mapTransportNodeRowToDTO,
  mapUmkmProfileRowToDTO,
} from "@/src/mappers/domain.mapper";
import { WGS84_SRID } from "@/src/modules/spatial/spatial.constants";
import type { SpatialRepositoryRecord } from "@/src/modules/spatial/spatial.dto";
import {
  bboxDomainQuerySchema,
  coordinateSchema,
  createNearbyDomainQuerySchema,
} from "@/src/modules/spatial/spatial.schema";
import type {
  BBoxQuery,
  Coordinate,
  GeoJsonGeometry,
  NearbyQuery,
} from "@/src/modules/spatial/spatial.types";
import { mapDatabaseError, RepositoryError } from "@/src/repositories/errors";
import {
  mapRepositoryRows,
  normalizeRepositoryRows,
  parseRepositoryInput,
} from "@/src/repositories/repository.utils";
import { STUDY_AREA_COLUMNS } from "@/src/repositories/study-area.repository";
import { TRANSPORT_CORRIDOR_COLUMNS } from "@/src/repositories/transport-corridor.repository";
import { TRANSPORT_NODE_COLUMNS } from "@/src/repositories/transport-node.repository";
import { UMKM_PROFILE_COLUMNS } from "@/src/repositories/umkm-profile.repository";
import type {
  StudyAreaDatabaseRow,
  TransportCorridorDatabaseRow,
  TransportNodeDatabaseRow,
  UmkmProfileDatabaseRow,
} from "@/src/types/domain";

const bboxRpc = {
  study_area: {
    columns: STUDY_AREA_COLUMNS,
    name: "find_study_areas_within_bbox",
  },
  transport_corridor: {
    columns: TRANSPORT_CORRIDOR_COLUMNS,
    name: "find_transport_corridors_within_bbox",
  },
  transport_node: {
    columns: TRANSPORT_NODE_COLUMNS,
    name: "find_transport_nodes_within_bbox",
  },
  umkm_profile: {
    columns: UMKM_PROFILE_COLUMNS,
    name: "find_umkm_profiles_within_bbox",
  },
} as const;

const nearbyRpc = {
  transport_node: {
    columns: TRANSPORT_NODE_COLUMNS,
    name: "find_transport_nodes_near",
  },
  umkm_profile: {
    columns: UMKM_PROFILE_COLUMNS,
    name: "find_umkm_profiles_near",
  },
} as const;

interface SpatialRpcResult {
  data: unknown;
  error: unknown;
}

interface SpatialRpcBuilder extends PromiseLike<SpatialRpcResult> {
  limit(value: number): SpatialRpcBuilder;
  order(
    column: string,
    options: { ascending: boolean },
  ): SpatialRpcBuilder;
  select(columns: string): SpatialRpcBuilder;
}

interface SpatialRpcClient {
  rpc(name: string, parameters: Record<string, unknown>): SpatialRpcBuilder;
}

export interface SpatialRepositoryContract {
  calculateDistance(origin: Coordinate, destination: Coordinate): Promise<number>;
  findWithinBBox(query: BBoxQuery): Promise<SpatialRepositoryRecord[]>;
  findWithinRadius(query: NearbyQuery): Promise<SpatialRepositoryRecord[]>;
  getGeometrySRID(geometry: GeoJsonGeometry): Promise<number>;
  validateGeometry(geometry: GeoJsonGeometry): Promise<boolean>;
}

export class SpatialRepository implements SpatialRepositoryContract {
  private readonly rpcClient: SpatialRpcClient;

  constructor(
    supabase: SupabaseClient,
    private readonly maxRadiusMeters: number,
  ) {
    this.rpcClient = supabase as unknown as SpatialRpcClient;
  }

  async calculateDistance(
    origin: Coordinate,
    destination: Coordinate,
  ): Promise<number> {
    const parsedOrigin = parseRepositoryInput(
      coordinateSchema,
      origin,
      "spatial.calculateDistance.origin",
    );
    const parsedDestination = parseRepositoryInput(
      coordinateSchema,
      destination,
      "spatial.calculateDistance.destination",
    );
    const { data, error } = await this.rpcClient.rpc(
      "wgs84_distance_meters",
      {
        destination: coordinateToEwktPoint(parsedDestination),
        origin: coordinateToEwktPoint(parsedOrigin),
      },
    );

    if (error) throw mapDatabaseError(error, "spatial.calculateDistance");
    if (typeof data !== "number" || !Number.isFinite(data) || data < 0) {
      throw new RepositoryError("DATABASE_ERROR", "spatial.calculateDistance.map");
    }
    return data;
  }

  async findWithinRadius(query: NearbyQuery): Promise<SpatialRepositoryRecord[]> {
    const parsed = parseRepositoryInput(
      createNearbyDomainQuerySchema(this.maxRadiusMeters),
      query,
      "spatial.findWithinRadius.validate",
    );
    const rpc = nearbyRpc[parsed.entity_type];
    const builder = this.rpcClient
      .rpc(rpc.name, {
        origin: coordinateToEwktPoint(parsed.origin),
        radius_meters: parsed.radius_meters,
      })
      .select(rpc.columns)
      .limit(parsed.limit);
    const { data, error } = await builder;

    if (error) throw mapDatabaseError(error, "spatial.findWithinRadius");
    return this.mapRows(
      parsed.entity_type,
      normalizeRepositoryRows(data, "spatial.findWithinRadius.rows"),
    );
  }

  async findWithinBBox(query: BBoxQuery): Promise<SpatialRepositoryRecord[]> {
    const parsed = parseRepositoryInput(
      bboxDomainQuerySchema,
      query,
      "spatial.findWithinBBox.validate",
    );
    const rpc = bboxRpc[parsed.entity_type];
    const { bbox } = parsed;
    const { data, error } = await this.rpcClient
      .rpc(rpc.name, {
        max_lat: bbox.north,
        max_lng: bbox.east,
        min_lat: bbox.south,
        min_lng: bbox.west,
      })
      .select(rpc.columns)
      .order("created_at", { ascending: false })
      .limit(parsed.limit);

    if (error) throw mapDatabaseError(error, "spatial.findWithinBBox");
    return this.mapRows(
      parsed.entity_type,
      normalizeRepositoryRows(data, "spatial.findWithinBBox.rows"),
    );
  }

  async validateGeometry(geometry: GeoJsonGeometry): Promise<boolean> {
    let prepared: ReturnType<typeof prepareWgs84Geometry>;
    try {
      prepared = prepareWgs84Geometry(geometry);
    } catch (error) {
      throw new RepositoryError("VALIDATION_ERROR", "spatial.validateGeometry", {
        cause: error,
      });
    }

    const { data, error } = await this.rpcClient.rpc(
      "is_valid_wgs84_geometry",
      {
        allowed_types: prepared.allowed_types,
        input_geometry: prepared.ewkt,
      },
    );

    if (error) throw mapDatabaseError(error, "spatial.validateGeometry");
    if (typeof data !== "boolean") {
      throw new RepositoryError("DATABASE_ERROR", "spatial.validateGeometry.map");
    }
    return data;
  }

  async getGeometrySRID(geometry: GeoJsonGeometry): Promise<number> {
    if (!(await this.validateGeometry(geometry))) {
      throw new RepositoryError("VALIDATION_ERROR", "spatial.getGeometrySRID");
    }

    // The RPC above verifies ST_SRID(input_geometry) = 4326 before this returns.
    return WGS84_SRID;
  }

  private mapRows(
    entityType: BBoxQuery["entity_type"],
    rows: unknown[],
  ): SpatialRepositoryRecord[] {
    switch (entityType) {
      case "study_area":
        return mapRepositoryRows<StudyAreaDatabaseRow, SpatialRepositoryRecord>(
          rows,
          (row) => ({ entity_type: "study_area", record: mapStudyAreaRowToDTO(row) }),
          "spatial.studyAreas.map",
        );
      case "transport_corridor":
        return mapRepositoryRows<TransportCorridorDatabaseRow, SpatialRepositoryRecord>(
          rows,
          (row) => ({
            entity_type: "transport_corridor",
            record: mapTransportCorridorRowToDTO(row),
          }),
          "spatial.transportCorridors.map",
        );
      case "transport_node":
        return mapRepositoryRows<TransportNodeDatabaseRow, SpatialRepositoryRecord>(
          rows,
          (row) => ({
            entity_type: "transport_node",
            record: mapTransportNodeRowToDTO(row),
          }),
          "spatial.transportNodes.map",
        );
      case "umkm_profile":
        return mapRepositoryRows<UmkmProfileDatabaseRow, SpatialRepositoryRecord>(
          rows,
          (row) => ({
            entity_type: "umkm_profile",
            record: mapUmkmProfileRowToDTO(row),
          }),
          "spatial.umkmProfiles.map",
        );
    }
  }
}
