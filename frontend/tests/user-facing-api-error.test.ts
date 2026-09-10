import { describe, expect, it } from "vitest";
import { getUserFacingApiError } from "@/src/lib/user-facing-api-error";

describe("getUserFacingApiError", () => {
  it("hides provider details from AI failures", () => {
    expect(
      getUserFacingApiError({
        code: "AI_PROVIDER_TIMEOUT",
        status: 504,
        fallback: "Claude request timed out at provider.example",
      }),
    ).toBe("Asisten belum dapat menjawab. Coba lagi sebentar lagi.");
  });

  it("turns spatial and routing codes into a user action", () => {
    expect(
      getUserFacingApiError({ code: "ROUTING_GRAPH_UNAVAILABLE", status: 503 }),
    ).toBe("Informasi lokasi atau rute belum dapat dimuat. Coba lagi.");
    expect(
      getUserFacingApiError({ code: "SPATIAL_QUERY_FAILED", status: 500 }),
    ).toBe("Informasi lokasi atau rute belum dapat dimuat. Coba lagi.");
  });

  it("maps common HTTP errors without using a raw backend message", () => {
    expect(getUserFacingApiError({ status: 401 })).toBe(
      "Silakan masuk untuk melanjutkan.",
    );
    expect(getUserFacingApiError({ status: 429 })).toBe(
      "Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.",
    );
    expect(
      getUserFacingApiError({
        status: 500,
        fallback: "relation merchants does not exist",
      }),
    ).toBe("Layanan sedang bermasalah. Coba lagi sebentar lagi.");
  });

  it("keeps a caller-provided safe fallback for unknown failures", () => {
    expect(
      getUserFacingApiError({ fallback: "Laporan belum dapat dikirim. Coba lagi." }),
    ).toBe("Laporan belum dapat dikirim. Coba lagi.");
  });
});
