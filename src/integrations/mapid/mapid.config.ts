import "server-only";

import { z } from "zod";

import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import type { MapidProviderConfig } from "@/src/integrations/mapid/mapid.types";

export const DEFAULT_MAPID_TIMEOUT_MS = 10_000;
export const DEFAULT_MAPID_MAX_ATTEMPTS = 3;
export const DEFAULT_MAPID_RETRY_BASE_DELAY_MS = 250;

export type MapidEnvironmentInput = {
  MAPID_API_KEY?: string;
  MAPID_BASE_URL?: string;
  MAPID_TIMEOUT_MS?: string;
};

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const mapidEnvironmentSchema = z
  .object({
    MAPID_API_KEY: z.string().trim().min(1).max(4_096),
    MAPID_BASE_URL: z.string().trim().url(),
    MAPID_TIMEOUT_MS: z.preprocess(
      blankToUndefined,
      z.coerce
        .number()
        .int()
        .min(100)
        .max(120_000)
        .default(DEFAULT_MAPID_TIMEOUT_MS),
    ),
  })
  .strict();

export function parseMapidProviderConfig(
  input: MapidEnvironmentInput,
): MapidProviderConfig {
  const parsed = mapidEnvironmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new MapidError("MAPID_CONFIGURATION_ERROR");
  }

  const baseUrl = new URL(parsed.data.MAPID_BASE_URL);
  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username !== "" ||
    baseUrl.password !== "" ||
    baseUrl.search !== "" ||
    baseUrl.hash !== ""
  ) {
    throw new MapidError("MAPID_CONFIGURATION_ERROR");
  }

  return {
    apiKey: parsed.data.MAPID_API_KEY,
    baseUrl: baseUrl.toString().replace(/\/$/, ""),
    retry: {
      baseDelayMs: DEFAULT_MAPID_RETRY_BASE_DELAY_MS,
      maxAttempts: DEFAULT_MAPID_MAX_ATTEMPTS,
    },
    timeoutMs: parsed.data.MAPID_TIMEOUT_MS,
  };
}

/** Lazy server-only loading. Missing MAPID config does not break normal GETRA startup. */
export function loadMapidProviderConfig(): MapidProviderConfig {
  return parseMapidProviderConfig({
    MAPID_API_KEY: process.env.MAPID_API_KEY,
    MAPID_BASE_URL: process.env.MAPID_BASE_URL,
    MAPID_TIMEOUT_MS: process.env.MAPID_TIMEOUT_MS,
  });
}
