import { describe, expect, it } from "vitest";

import {
  extractMissionRecords,
  extractMissionPagination,
  mapidMissionSyncRequestSchema,
  normalizeMissionRecord,
} from "@/src/integrations/mapid/mission.schema";

const retrievedAt = "2026-08-27T02:00:00.000Z";

describe("MAPID Mission schema and normalization", () => {
  it("extracts mission records from known MAPID response envelopes", () => {
    expect(extractMissionRecords([{ id: "direct" }])).toHaveLength(1);
    expect(extractMissionRecords({ records: [{ id: "records" }] })).toHaveLength(1);
    expect(extractMissionRecords({ data: [{ id: "data" }] })).toHaveLength(1);
    expect(extractMissionRecords({ data: { records: [{ id: "nested" }] } })).toHaveLength(1);
    expect(extractMissionRecords({ data: { activities: [{ _id: "activity" }] } })).toHaveLength(1);
    expect(extractMissionRecords({ features: [{ id: "features" }] })).toHaveLength(1);
  });

  it("extracts provider pagination without inventing a page size", () => {
    expect(extractMissionPagination({
      pagination: { hasMore: true, limit: 100, offset: 0, total: 116 },
    })).toEqual({ hasMore: true, nextOffset: 100 });
    expect(extractMissionPagination({
      pagination: { hasMore: false, limit: 100, offset: 100, total: 116 },
    })).toEqual({ hasMore: false, nextOffset: null });
    expect(extractMissionPagination({ data: { activities: [] } })).toBeNull();
  });

  it("normalizes the documented Activities envelope fields", () => {
    const observation = normalizeMissionRecord(
      "ACTIVITIES",
      {
        _id: "activity-1",
        created_at: "2026-08-25T12:38:28.109Z",
        description: "Field observation",
        geometry: { coordinates: [106.81, -6.19], type: "Point" },
        medias: ["https://example.test/activity.jpg"],
        title: "Activity",
        user_full_name: "Field Observer",
      },
      retrievedAt,
    );

    expect(observation).toMatchObject({
      observed_at: "2026-08-25T12:38:28.109Z",
      source_record_id: "activity-1",
      source_type: "ACTIVITIES",
      normalized_properties: {
        author: "Field Observer",
        media: ["https://example.test/activity.jpg"],
        source_semantics: "FIELD_OBSERVATION",
        title: "Activity",
      },
    });
  });

  it("normalizes Menu Go mission observations with source semantics and provenance", () => {
    const observation = normalizeMissionRecord(
      "MENU_GO",
      {
        geometry: { coordinates: [106.78, -6.2], type: "Point" },
        id: "merchant-1",
        mission: "menugo",
        properties: {
          harga_rata_rata: 25000,
          internal_note: "must not be normalized",
          nama_tempat: "Warung Test",
          tanggal_observasi: "2026-08-26T10:00:00.000Z",
        },
      },
      retrievedAt,
    );

    expect(observation).toMatchObject({
      source_record_id: "merchant-1",
      source_type: "MENU_GO",
      freshness_status: "FRESH",
      geometry: { coordinates: [106.78, -6.2], type: "Point" },
      mission_name: "menugo",
      observed_at: "2026-08-26T10:00:00.000Z",
      provenance: {
        imported_at: retrievedAt,
        provider: "MAPID",
        source_record_id: "merchant-1",
        source_type: "MENU_GO",
      },
      verification_status: "SOURCE_OBSERVED",
    });
    expect(observation.normalized_properties).toMatchObject({
      harga_rata_rata: 25000,
      nama_tempat: "Warung Test",
      source_semantics: "FIELD_SURVEY_MERCHANT_OBSERVATION",
    });
    expect(observation.normalized_properties).not.toHaveProperty("internal_note");
    expect(observation.raw_payload_checksum).toHaveLength(64);
  });

  it("keeps shared source ids distinct by source type", () => {
    const raw = {
      geometry: { coordinates: [106.78, -6.2], type: "Point" },
      id: "shared-id",
    };

    const menu = normalizeMissionRecord("MENU_GO", raw, retrievedAt);
    const struk = normalizeMissionRecord("STRUK_GO", raw, retrievedAt);

    expect(menu.source_record_id).toBe(struk.source_record_id);
    expect(menu.source_type).toBe("MENU_GO");
    expect(struk.source_type).toBe("STRUK_GO");
    expect(struk.normalized_properties.source_semantics).toBe("TRANSACTION_OBSERVATION");
  });

  it("rejects records without stable ids or point geometry", () => {
    expect(() =>
      normalizeMissionRecord(
        "PROPERTI_GO",
        { geometry: { coordinates: [106.78, -6.2], type: "Point" } },
        retrievedAt,
      ),
    ).toThrow("MISSION_RECORD_MISSING_SOURCE_ID");

    expect(() =>
      normalizeMissionRecord("PROPERTI_GO", { id: "property-1" }, retrievedAt),
    ).toThrow("MISSION_RECORD_INVALID_GEOMETRY");
  });

  it("validates Phase 01 sync requests as polygon-only bounded batches", () => {
    const parsed = mapidMissionSyncRequestSchema.parse({
      feature: {
        coordinates: [
          [
            [106.7, -6.2],
            [106.8, -6.2],
            [106.8, -6.1],
            [106.7, -6.2],
          ],
        ],
        type: "Polygon",
      },
      sources: ["MENU_GO", "STRUK_GO"],
    });

    expect(parsed.max_pages).toBe(1);
    expect(parsed.offset).toBe(0);
    expect(parsed.page_size).toBe(500);
  });
});
