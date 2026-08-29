import { describe, expect, it, vi } from "vitest";

import { ContextualObservationService } from "@/src/features/contextual-observations/contextual-observation.service";
import type { MapidMissionObservationDTO } from "@/src/integrations/mapid/mission.types";
import type { JsonObject } from "@/src/types/provenance";

vi.mock("server-only", () => ({}));

function observation(
  source: "PROPERTI_GO" | "STRUK_GO" | "ACTIVITIES",
  properties: JsonObject,
): MapidMissionObservationDTO {
  return {
    id: `${source}-id`,
    geometry: { type: "Point", coordinates: [106.8, -6.2] },
    source_type: source,
    source_id: `${source}-source-id`,
    properties,
    provenance: {
      imported_at: "2026-08-28T00:00:00.000Z",
      provider: "MAPID",
      internal_checksum: "must-not-leak",
    },
    observed_at: null,
    freshness_status: "UNKNOWN",
    verification_status: "SOURCE_OBSERVED",
  };
}

async function list(item: MapidMissionObservationDTO) {
  const repository = {
    listObservations: vi.fn().mockResolvedValue({ items: [item], total: 2 }),
  };
  const service = new ContextualObservationService(repository as never);
  const result = await service.list({
    source: item.source_type as "PROPERTI_GO" | "STRUK_GO" | "ACTIVITIES",
    west: 106.7,
    south: -6.3,
    east: 106.9,
    north: -6.1,
    limit: 1,
    offset: 0,
  });
  return { feature: result.feature_collection.features[0], result, repository };
}

describe("contextual observation service", () => {
  it("maps property fields and only allows known HTTPS MAPID media", async () => {
    const { feature, result, repository } = await list(observation("PROPERTI_GO", {
      alamat: "Jakarta Selatan",
      foto_spanduk: "javascript:alert(1)",
      foto_tampak_depan: "https://mapidstorage.cdn.mapid.io/property.jpg",
      jenis_properti: "Disewa",
      kategori_properti: "Ruko",
      raw_payload: "hidden",
    }));
    expect(feature?.properties).toMatchObject({
      address: "Jakarta Selatan",
      banner_photo_url: null,
      facade_photo_url: "https://mapidstorage.cdn.mapid.io/property.jpg",
      property_category: "Ruko",
      property_transaction_type: "Disewa",
      semantics: "PROPERTY_OBSERVATION",
    });
    expect(result.has_more).toBe(true);
    expect(repository.listObservations).toHaveBeenCalledWith(expect.objectContaining({
      bbox: { minLng: 106.7, minLat: -6.3, maxLng: 106.9, maxLat: -6.1 },
      limit: 1,
    }));
    expect(JSON.stringify(feature)).not.toContain("raw_payload");
    expect(JSON.stringify(feature)).not.toContain("internal_checksum");
  });

  it("preserves transaction-observation semantics without revenue claims", async () => {
    const { feature } = await list(observation("STRUK_GO", {
      foto_struk: "https://mapid-app-chat.cdn.mapid.io/receipt.jpg",
      kategori_tempat: "Restoran/kafe",
      metode_pembayaran: "QRIS",
      nama_tempat: "Tempat Uji",
      revenue: 9_999_999,
    }));
    expect(feature?.properties).toMatchObject({
      payment_method: "QRIS",
      place_category: "Restoran/kafe",
      place_name: "Tempat Uji",
      semantics: "TRANSACTION_OBSERVATION",
    });
    expect(feature?.properties).not.toHaveProperty("revenue");
  });

  it("maps supported Activity categories and falls back safely", async () => {
    const supported = await list(observation("ACTIVITIES", {
      category: "transit observation",
      description: "Kondisi halte",
      media: [
        "https://mapid-app-chat.cdn.mapid.io/activity.jpg",
        "https://attacker.example/tracker.jpg",
      ],
      title: "Observasi halte",
    }));
    expect(supported.feature?.properties).toMatchObject({
      activity_category: "TRANSIT_OBSERVATION",
      media_urls: ["https://mapid-app-chat.cdn.mapid.io/activity.jpg"],
      semantics: "FIELD_OBSERVATION",
    });

    const fallback = await list(observation("ACTIVITIES", { category: "mystery" }));
    expect(fallback.feature?.properties.activity_category).toBe("UNCLASSIFIED");
  });
});
