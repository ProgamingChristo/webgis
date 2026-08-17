import type {
  StudyAreaDTO,
  TransportCorridorDTO,
  TransportNodeDTO,
  UmkmProfileDTO,
} from "@/src/types/domain";
import type {
  BBoxResult,
  DistanceResult,
  NearbyResult,
  SpatialFeature,
  WalkingTimeResult,
} from "@/src/modules/spatial/spatial.types";

export type SpatialRepositoryRecord =
  | { entity_type: "study_area"; record: StudyAreaDTO }
  | { entity_type: "transport_corridor"; record: TransportCorridorDTO }
  | { entity_type: "transport_node"; record: TransportNodeDTO }
  | { entity_type: "umkm_profile"; record: UmkmProfileDTO };

export type SpatialFeatureDTO = SpatialFeature;
export type DistanceDTO = DistanceResult;
export type NearbyDTO = NearbyResult;
export type BBoxDTO = BBoxResult;
export type WalkingTimeDTO = WalkingTimeResult;

