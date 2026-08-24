import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { createCommunityDemandSignalDetailHandler } from "@/app/api/community/requests/signals/[signalId]/route";
import { createCommunityDemandSignalResponsesHandlers } from "@/app/api/community/requests/signals/[signalId]/responses/route";
import { createCommunityDemandSignalsHandler } from "@/app/api/community/requests/signals/route";

const signalId = "11111111-2222-4333-8444-555555555555";

function createRequest(url: string, init: RequestInit = {}) {
  return new Request(url, {
    ...init,
    headers: {
      authorization: "Bearer test-token",
      ...(init.headers ?? {}),
    },
  }) as NextRequest;
}

function createContext() {
  return {
    params: Promise.resolve({
      signalId,
    }),
  };
}

function createDependencies(service: any) {
  return {
    authenticate: vi.fn().mockResolvedValue("user-1"),
    createService: vi.fn(() => service),
    rateLimiter: {
      checkLimit: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("Community demand signal routes", () => {
  const signal = {
    id: signalId,
    category: "FOOD",
    requestCount: 3,
    budgetMin: 15000,
    budgetMax: 25000,
    budgetMedian: 20000,
    center: {
      longitude: 106.827,
      latitude: -6.175,
      visibility: "APPROXIMATE",
    },
    clusterRadiusMeters: 1000,
    windowStart: "2026-08-16T00:00:00.000Z",
    windowEnd: "2026-08-23T00:00:00.000Z",
    latestActivityAt: "2026-08-23T00:00:00.000Z",
    status: "ACTIVE",
  };

  it("lists and reads deterministic demand signals", async () => {
    const service = {
      listDemandSignals: vi.fn().mockResolvedValue({
        items: [signal],
        page: 1,
        limit: 20,
        total: 1,
      }),
      getDemandSignal: vi.fn().mockResolvedValue(signal),
    };
    const listHandler = createCommunityDemandSignalsHandler(
      createDependencies(service),
    );
    const detailHandler = createCommunityDemandSignalDetailHandler(
      createDependencies(service),
    );

    const listResponse = await listHandler(
      createRequest("http://localhost/api/community/requests/signals?category=FOOD"),
    );
    const detailResponse = await detailHandler(
      createRequest(`http://localhost/api/community/requests/signals/${signalId}`),
      createContext(),
    );

    await expect(listResponse.json()).resolves.toMatchObject({
      success: true,
      data: [{ id: signalId, requestCount: 3 }],
    });
    await expect(detailResponse.json()).resolves.toMatchObject({
      success: true,
      data: { id: signalId, budgetMedian: 20000 },
    });
    expect(service.listDemandSignals).toHaveBeenCalledWith({
      category: "FOOD",
    });
    expect(service.getDemandSignal).toHaveBeenCalledWith(signalId);
  });

  it("lists responses and forwards only server-authenticated response payload", async () => {
    const service = {
      listDemandSignalResponses: vi.fn().mockResolvedValue([
        {
          id: "response-1",
          signalId,
          merchant: {
            id: "merchant-1",
            displayName: "Warung ABC",
          },
          status: "PREPARING",
          message: "Kami sedang menyiapkan paket Rp18.000.",
          createdAt: "2026-08-23T00:00:00.000Z",
          updatedAt: "2026-08-23T00:00:00.000Z",
        },
      ]),
      listResponseMerchants: vi.fn().mockResolvedValue([
        {
          id: "merchant-1",
          displayName: "Warung ABC",
        },
      ]),
      upsertDemandSignalResponse: vi.fn().mockResolvedValue({
        id: "response-1",
        signalId,
        merchant: {
          id: "merchant-1",
          displayName: "Warung ABC",
        },
        status: "AVAILABLE",
        message: "<script>alert(1)</script>",
        createdAt: "2026-08-23T00:00:00.000Z",
        updatedAt: "2026-08-23T00:01:00.000Z",
      }),
    };
    const handlers = createCommunityDemandSignalResponsesHandlers(
      createDependencies(service),
    );

    const getResponse = await handlers.GET(
      createRequest(
        `http://localhost/api/community/requests/signals/${signalId}/responses`,
      ),
      createContext(),
    );
    const postPayload = {
      merchant_id: "merchant-1",
      status: "AVAILABLE",
      message: "<script>alert(1)</script>",
      responder_user_id: "attacker",
      merchant_name: "Nama palsu",
    };
    const postResponse = await handlers.POST(
      createRequest(
        `http://localhost/api/community/requests/signals/${signalId}/responses`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(postPayload),
        },
      ),
      createContext(),
    );

    await expect(getResponse.json()).resolves.toMatchObject({
      success: true,
      data: {
        responses: [{ id: "response-1" }],
        ownedMerchants: [{ id: "merchant-1" }],
      },
    });
    expect(postResponse.status).toBe(201);
    expect(service.upsertDemandSignalResponse).toHaveBeenCalledWith(
      signalId,
      postPayload,
    );
  });
});
