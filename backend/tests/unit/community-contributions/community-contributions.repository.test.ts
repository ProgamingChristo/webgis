import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { SupabaseCommunityContributionRepository } from "@/src/features/community-contributions";
import { RepositoryError } from "@/src/repositories/errors";

const authorId = "99999999-aaaa-4bbb-8ccc-dddddddddddd";
const contributionId = "11111111-2222-4333-8444-555555555555";
const merchantId = "22222222-3333-4444-8555-666666666666";
const timestamp = "2026-08-24T09:30:00.000Z";

function createRow(overrides = {}) {
  return {
    id: contributionId,
    author_id: authorId,
    report_type: "MERCHANT_LOCATION_CHANGED",
    status: "PENDING",
    location_longitude: 106.8272,
    location_latitude: -6.1754,
    observed_at: timestamp,
    report_data: {
      notes: "Moved two doors down",
    },
    target_merchant_id: merchantId,
    reported_new_longitude: 106.828,
    reported_new_latitude: -6.176,
    submitted_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

function createClient(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const rpcBuilder = {
    single,
  };
  const rpc = vi.fn().mockReturnValue(rpcBuilder);
  const from = vi.fn();
  const client = {
    rpc,
    from,
  } as unknown as SupabaseClient & {
    rpc: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
  };

  return {
    client,
    from,
    rpc,
    single,
  };
}

function createHistoryClient(results: { data: unknown; error: unknown }[]) {
  const rpc = vi.fn();
  const single = vi.fn();

  for (const result of results) {
    const builder = {
      single: vi.fn().mockResolvedValue(result),
      then: (resolve: (value: typeof result) => unknown) => resolve(result),
    };
    rpc.mockReturnValueOnce(builder);
    single.mockResolvedValueOnce(result);
  }

  return {
    client: {
      rpc,
    } as unknown as SupabaseClient & {
      rpc: ReturnType<typeof vi.fn>;
    },
    rpc,
  };
}

async function captureRepositoryError(
  operation: Promise<unknown>,
): Promise<RepositoryError> {
  let thrown: unknown;

  try {
    await operation;
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(RepositoryError);
  return thrown as RepositoryError;
}

describe("SupabaseCommunityContributionRepository", () => {
  it("creates through the append-only RPC and preserves PostGIS longitude/latitude order", async () => {
    const { client, from, rpc } = createClient({
      data: createRow(),
      error: null,
    });
    const repository = new SupabaseCommunityContributionRepository(client);

    await expect(
      repository.create({
        authorId,
        reportType: "MERCHANT_LOCATION_CHANGED",
        location: {
          longitude: 106.8272,
          latitude: -6.1754,
        },
        observedAt: timestamp,
        reportData: {
          notes: "Moved two doors down",
        },
        targetMerchantId: merchantId,
        reportedNewLocation: {
          longitude: 106.828,
          latitude: -6.176,
        },
      }),
    ).resolves.toMatchObject({
      location: {
        longitude: 106.8272,
        latitude: -6.1754,
      },
      reportedNewLocation: {
        longitude: 106.828,
        latitude: -6.176,
      },
      status: "PENDING",
    });

    expect(rpc).toHaveBeenCalledWith("create_community_contribution_v1", {
      p_report_type: "MERCHANT_LOCATION_CHANGED",
      p_longitude: 106.8272,
      p_latitude: -6.1754,
      p_observed_at: timestamp,
      p_report_data: {
        notes: "Moved two doors down",
      },
      p_target_merchant_id: merchantId,
      p_reported_new_longitude: 106.828,
      p_reported_new_latitude: -6.176,
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("authorId");
    expect(JSON.stringify(rpc.mock.calls)).not.toContain("status");
    expect(from).not.toHaveBeenCalled();
  });

  it("reads owner-scoped detail through the owner RPC", async () => {
    const { client, rpc } = createClient({
      data: createRow({
        reported_new_longitude: null,
        reported_new_latitude: null,
      }),
      error: null,
    });
    const repository = new SupabaseCommunityContributionRepository(client);

    await expect(repository.getOwn(contributionId)).resolves.toMatchObject({
      id: contributionId,
      reportedNewLocation: null,
    });

    expect(rpc).toHaveBeenCalledWith("get_community_contribution_v1", {
      p_contribution_id: contributionId,
    });
  });

  it("maps database failures to sanitized repository errors", async () => {
    const { client } = createClient({
      data: null,
      error: {
        code: "PGRST116",
        message: "no row",
      },
    });
    const repository = new SupabaseCommunityContributionRepository(client);

    const error = await captureRepositoryError(repository.getOwn(contributionId));

    expect(error).toMatchObject({
      code: "NOT_FOUND",
      operation: "community_contributions.getOwn",
    });
  });

  it("lists own contribution history and summary without table N+1 calls", async () => {
    const { client, rpc } = createHistoryClient([
      {
        data: [
          {
            id: contributionId,
            report_type: "SIDEWALK_OBSTRUCTION",
            status: "PENDING",
            observed_at: timestamp,
            submitted_at: timestamp,
            created_at: timestamp,
            location_summary: "Koordinat -6.1754, 106.8272",
            target_merchant_id: null,
            target_name: null,
            points_awarded: 0,
            total_count: 2,
          },
        ],
        error: null,
      },
      {
        data: {
          total_contributions: 2,
          pending_count: 1,
          approved_count: 1,
          rejected_count: 0,
          contribution_points: 1,
        },
        error: null,
      },
    ]);
    const repository = new SupabaseCommunityContributionRepository(client);

    await expect(
      repository.listOwnHistory({
        page: 2,
        limit: 10,
        status: "PENDING",
        reportType: "SIDEWALK_OBSTRUCTION",
      }),
    ).resolves.toMatchObject({
      items: [
        {
          id: contributionId,
          pointsAwarded: 0,
          locationSummary: "Koordinat -6.1754, 106.8272",
        },
      ],
      summary: {
        totalContributions: 2,
        contributionPoints: 1,
      },
      pagination: {
        page: 2,
        limit: 10,
        total: 2,
        hasMore: false,
      },
    });

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "list_community_contribution_history_v1",
      {
        p_limit: 10,
        p_offset: 10,
        p_status: "PENDING",
        p_report_type: "SIDEWALK_OBSTRUCTION",
      },
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "get_community_contribution_summary_v1",
    );
  });

  it("lists approved map projections through the safe bbox RPC", async () => {
    const { client, rpc } = createHistoryClient([
      {
        data: [
          {
            id: contributionId,
            report_type: "MERCHANT_PRICE_CHANGED",
            observed_at: timestamp,
            reviewed_at: timestamp,
            target_merchant_id: merchantId,
            target_name: "Warung A",
            public_longitude: 106.828,
            public_latitude: -6.176,
            projection_source: "CANONICAL_MERCHANT_LOCATION",
          },
        ],
        error: null,
      },
    ]);
    const repository = new SupabaseCommunityContributionRepository(client);

    await expect(
      repository.listMapFeatures({
        minLng: 106.7,
        minLat: -6.3,
        maxLng: 106.9,
        maxLat: -6.1,
        limit: 250,
      }),
    ).resolves.toEqual([
      {
        id: contributionId,
        reportType: "MERCHANT_PRICE_CHANGED",
        observedAt: timestamp,
        reviewedAt: timestamp,
        targetMerchantId: merchantId,
        targetName: "Warung A",
        location: {
          longitude: 106.828,
          latitude: -6.176,
        },
        projectionSource: "CANONICAL_MERCHANT_LOCATION",
      },
    ]);

    expect(rpc).toHaveBeenCalledWith(
      "list_community_contribution_map_features_v1",
      {
        p_min_lng: 106.7,
        p_min_lat: -6.3,
        p_max_lng: 106.9,
        p_max_lat: -6.1,
        p_limit: 250,
      },
    );
  });
});
