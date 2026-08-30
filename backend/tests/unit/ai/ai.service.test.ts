import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findNear: vi.fn(),
  findNearby: vi.fn(),
  generateStructured: vi.fn(),
  getRequestSupabaseClient: vi.fn(),
  getRoute: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/supabase/server", () => ({
  getRequestSupabaseClient: mocks.getRequestSupabaseClient,
}));
vi.mock("@/lib/ai/provider", () => ({
  generateStructured: mocks.generateStructured,
}));
vi.mock("@/src/repositories/transport-node.repository", () => ({
  TransportNodeRepository: vi.fn().mockImplementation(function TransportNodeRepository() {
    return {
    findNear: mocks.findNear,
    };
  }),
}));
vi.mock("@/src/repositories/umkm.repository", () => ({
  UmkmRepository: vi.fn().mockImplementation(function UmkmRepository() {
    return {
      findById: mocks.findById,
      findNearby: mocks.findNearby,
    };
  }),
}));
vi.mock("@/src/modules/pedestrian-network/routing.service", () => ({
  RoutingService: vi.fn().mockImplementation(function RoutingService() {
    return {
      getRoute: mocks.getRoute,
    };
  }),
}));

import { AiService } from "@/src/modules/ai/ai.service";

describe("AiService grounding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestSupabaseClient.mockReturnValue({});
    mocks.generateStructured
      .mockResolvedValueOnce({
        data: {
          confidence: 0.9,
          intent: "NEAREST_TRANSIT",
          reasoning: "closest transit question",
        },
        source: "claude",
      })
      .mockResolvedValueOnce({
        data: {
          answer: "Halte terdekat adalah Halte A, jaraknya 123 meter.",
          limitations_mentioned: [],
        },
        source: "claude",
      });
  });

  it("grounds NEAREST_TRANSIT with repository facts and map entity reference", async () => {
    mocks.findNear.mockResolvedValue({
      items: [
        {
          corridor_id: "corridor-1",
          distance_meters: 123,
          id: "node-1",
          name: "Halte A",
        },
      ],
    });

    const result = await new AiService("Bearer VALID").handleAskRequest({
      active_experience: "GENERAL",
      context: {
        origin: {
          latitude: -6.2,
          longitude: 106.8,
        },
      },
      history: [
        {
          role: "user",
          content: "Cari UMKM dekat sini",
        },
        {
          role: "assistant",
          content: "Saya menemukan beberapa kandidat.",
        },
      ],
      question: "Halte paling dekat yang mana?",
    });

    expect(mocks.findNear).toHaveBeenCalledWith(
      {
        latitude: -6.2,
        longitude: 106.8,
        radius_meters: 1500,
      },
      expect.any(Object),
    );
    expect(mocks.generateStructured.mock.calls[0][0].input).toContain(
      "Halte paling dekat yang mana?",
    );
    expect(mocks.generateStructured.mock.calls[0][0].input).toContain(
      "Cari UMKM dekat sini",
    );
    expect(mocks.generateStructured.mock.calls[1][0].instructions).toContain(
      '"distance_m": 123',
    );
    expect(result).toMatchObject({
      intent: "NEAREST_TRANSIT",
      map_action: {
        entity_id: "node-1",
        entity_type: "TRANSPORT_NODE",
        type: "FOCUS_ENTITY",
      },
      provider: "claude",
    });
  });

  it("uses selected UMKM entity for UMKM_POI grounding", async () => {
    mocks.generateStructured
      .mockReset()
      .mockResolvedValueOnce({
        data: {
          confidence: 0.9,
          intent: "UMKM_POI",
          reasoning: "selected business",
        },
        source: "claude",
      })
      .mockResolvedValueOnce({
        data: {
          answer: "Warung A sudah terhubung sebagai entity terpilih.",
          limitations_mentioned: [],
        },
        source: "claude",
      });
    mocks.findById.mockResolvedValue({
      category: "food",
      id: "merchant-1",
      name: "Warung A",
      provenance: {
        validation_status: "VALIDATED",
      },
    });

    const result = await new AiService("Bearer VALID").handleAskRequest({
      active_experience: "UMKM",
      context: {
        selected_entity_id: "merchant-1",
      },
      history: [],
      question: "Jelaskan usaha ini",
    });

    expect(mocks.findById).toHaveBeenCalledWith("merchant-1");
    expect(mocks.generateStructured.mock.calls[1][0].instructions).toContain(
      '"merchant_name": "Warung A"',
    );
    expect(result.map_action).toEqual({
      entity_id: "merchant-1",
      entity_type: "UMKM",
      label: "Warung A",
      type: "FOCUS_ENTITY",
    });
  });
});
