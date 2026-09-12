import { describe, expect, it } from "vitest";
import { determineApplicationAction } from "@/src/modules/ai/ai.service";

describe("Tanya GETRA application actions", () => {
  it("extracts the selected-merchant walking route request", () => {
    expect(determineApplicationAction(
      "kalau saya jalan kaki dari JPO Blok E berapa lama ya? dan coba berikan saya rutenya",
      { selected_entity_id: "merchant-1", selected_entity_name: "Bakso Goreng Gachor" },
    )).toEqual({
      type: "CALCULATE_ROUTE",
      mode: "walking",
      origin: { type: "PLACE_QUERY", query: "JPO Blok E" },
      destination: { type: "SELECTED_MERCHANT" },
    });
  });

  it("uses current location without asking for destination twice", () => {
    expect(determineApplicationAction(
      "rute jalan kaki dari lokasi saya ke sini",
      { selected_entity_id: "merchant-1" },
    )).toMatchObject({
      type: "CALCULATE_ROUTE",
      mode: "walking",
      origin: { type: "CURRENT_LOCATION" },
      destination: { type: "SELECTED_MERCHANT" },
    });
  });

  it("changes only the mode for an active route follow-up", () => {
    expect(determineApplicationAction("kalau naik motor?", {
      active_route: { mode: "walking", distance_meters: 850, duration_seconds: 720 },
    })).toEqual({ type: "CHANGE_ROUTE_MODE", mode: "motorcycle" });
  });

  it("keeps typo search as an application search action", () => {
    expect(determineApplicationAction("cari basko dekat sini")).toEqual({
      type: "APPLY_SEARCH_CRITERIA",
      query: "basko",
    });
  });

  it("asks for missing route context instead of guessing coordinates", () => {
    expect(determineApplicationAction("berikan saya rute")).toEqual({
      type: "REQUEST_CLARIFICATION",
      prompt: "Dari mana Anda ingin memulai perjalanan?",
    });
  });
});
