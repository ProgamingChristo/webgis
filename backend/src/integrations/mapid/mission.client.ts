import "server-only";

import { MapidClient } from "@/src/integrations/mapid/mapid.client";
import { loadMapidProviderConfig } from "@/src/integrations/mapid/mapid.config";
import { MapidError } from "@/src/integrations/mapid/mapid.errors";
import {
  extractMissionRecords,
  extractMissionPagination,
  mapidMissionSyncRequestSchema,
  missionSourceToPath,
} from "@/src/integrations/mapid/mission.schema";
import type { MapidAuthenticationStrategy } from "@/src/integrations/mapid/mapid.types";
import type { MapidMissionSource } from "@/src/integrations/mapid/mission.types";

export class XApiKeyAuthenticationStrategy implements MapidAuthenticationStrategy {
  apply(headers: Headers, apiKey: string): void {
    headers.set("x-api-key", apiKey);
  }
}

export interface FetchMissionPageInput {
  feature: unknown;
  offset: number;
  source: MapidMissionSource;
}

export interface FetchMissionPageResult {
  pagination?: {
    hasMore: boolean;
    nextOffset: number | null;
  } | null;
  records: unknown[];
  raw: unknown;
}

export class MapidMissionClient {
  constructor(
    private readonly client = new MapidClient(
      loadMapidProviderConfig(),
      new XApiKeyAuthenticationStrategy(),
    ),
    private readonly activitiesPath = process.env.MAPID_ACTIVITIES_PATH?.trim(),
  ) {}

  async fetchPage(input: FetchMissionPageInput): Promise<FetchMissionPageResult> {
    const parsed = mapidMissionSyncRequestSchema
      .pick({ feature: true, offset: true })
      .safeParse({
        feature: input.feature,
        offset: input.offset,
      });

    if (!parsed.success) {
      throw new MapidError("MAPID_CONFIGURATION_ERROR");
    }

    const path = this.resolvePath(input.source);
    const raw = await this.client.request({
      body: {
        feature: parsed.data.feature,
        offset: parsed.data.offset,
      },
      method: "POST",
      path,
    });

    return {
      pagination: extractMissionPagination(raw),
      raw,
      records: extractMissionRecords(raw),
    };
  }

  private resolvePath(source: MapidMissionSource): string {
    if (source !== "ACTIVITIES") {
      return missionSourceToPath[source];
    }

    if (!this.activitiesPath) {
      throw new MapidError("MAPID_CONFIGURATION_ERROR");
    }

    if (!this.activitiesPath.startsWith("/")) {
      throw new MapidError("MAPID_CONFIGURATION_ERROR");
    }

    return this.activitiesPath;
  }
}
