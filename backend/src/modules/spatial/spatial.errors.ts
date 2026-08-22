import {
  ApplicationError,
  type ApplicationErrorCode,
} from "@/src/lib/errors";
import { RepositoryError } from "@/src/repositories/errors";

export const spatialErrorCodes = [
  "SPATIAL_INVALID_CONFIGURATION",
  "SPATIAL_INVALID_COORDINATE",
  "SPATIAL_INVALID_DISTANCE",
  "SPATIAL_INVALID_GEOMETRY",
  "SPATIAL_INVALID_BBOX",
  "SPATIAL_INVALID_RADIUS",
  "SPATIAL_ENTITY_NOT_FOUND",
  "SPATIAL_QUERY_FAILED",
  "SPATIAL_NETWORK_NOT_READY",
  "SPATIAL_REQUEST_TOO_LARGE",
  "ROUTING_GRAPH_NOT_AVAILABLE",
] as const satisfies readonly ApplicationErrorCode[];

export type SpatialErrorCode = (typeof spatialErrorCodes)[number];

export class SpatialError extends ApplicationError {
  constructor(code: SpatialErrorCode, retryable = code === "SPATIAL_QUERY_FAILED") {
    super(code, undefined, retryable);
    this.name = "SpatialError";
  }
}

export function mapSpatialRepositoryError(error: unknown): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (error instanceof RepositoryError) {
    if (error.code === "FORBIDDEN") {
      return new ApplicationError("FORBIDDEN");
    }

    if (error.code === "NOT_FOUND") {
      return new SpatialError("SPATIAL_ENTITY_NOT_FOUND");
    }

    return new SpatialError(
      "SPATIAL_QUERY_FAILED",
      error.code === "DATABASE_ERROR",
    );
  }

  return new SpatialError("SPATIAL_QUERY_FAILED");
}
