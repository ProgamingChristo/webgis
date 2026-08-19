import { z } from "zod";
import type { ValidationStatus } from "@/src/types/provenance";

export const TRANSPORT_MODES = [
  "BUS",
  "TRAIN",
  "MRT",
  "LRT",
  "TRAM",
  "FERRY",
  "CABLE_CAR",
  "MONORAIL",
  "OTHER"
] as const;

export const TRANSPORT_NODE_TYPES = [
  "STATION",
  "STOP",
  "INTERCHANGE",
  "TERMINAL",
  "PORT",
  "AIRPORT",
  "OTHER"
] as const;

export const transportModeSchema = z.enum(TRANSPORT_MODES);
export const transportNodeTypeSchema = z.enum(TRANSPORT_NODE_TYPES);

export type TransportMode = z.infer<typeof transportModeSchema>;
export type TransportNodeType = z.infer<typeof transportNodeTypeSchema>;

export interface TransportValidationResult {
  isValid: boolean;
  issues: string[];
  status: ValidationStatus;
}
