import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import {
  createAdminAccessibilityEvidenceReviewHandler,
  type AdminAccessibilityEvidenceReviewDependencies,
} from "@/app/api/admin/accessibility/evidence/[evidenceId]/review/route";
import { ApplicationError } from "@/src/lib/errors";
import type {
  AccessibilityEvidenceDetailDTO,
  AccessibilityReviewRequest,
} from "@/src/features/accessibility-evidence";

vi.mock("server-only", () => ({}));

const safeDetail: AccessibilityEvidenceDetailDTO = {
  id: "MAPID_ACTIVITY:activity-1",
  source_type: "MAPID_ACTIVITY",
  source_record_id: "activity-1",
  geometry: { type: "Point", coordinates: [106.8, -6.2] },
  category: "ACCESSIBILITY_OBSERVATION",
  suggested_category: "ACCESSIBILITY_OBSERVATION",
  subcategory: "SIDEWALK",
  title: "Observasi aksesibilitas",
  description: "Temuan lapangan",
  media_urls: [],
  observed_at: "2026-08-28T10:00:00.000Z",
  freshness_status: "RECENT",
  validation_status: "NEEDS_REVIEW",
  relation_status: "CANDIDATE",
  routing_effect_enabled: false,
  spatial_relation: null,
};

function request(body: unknown) {
  return new NextRequest(
    "http://localhost/api/admin/accessibility/evidence/MAPID_ACTIVITY%3Aactivity-1/review",
    {
      body: JSON.stringify(body),
      headers: {
        authorization: "Bearer test",
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
}

function dependencies(options?: {
  authorize?: AdminAccessibilityEvidenceReviewDependencies["authorize"];
  review?: ReturnType<
    typeof vi.fn<
      (evidenceId: string, input: AccessibilityReviewRequest) => Promise<AccessibilityEvidenceDetailDTO>
    >
  >;
}): AdminAccessibilityEvidenceReviewDependencies & {
  review: ReturnType<
    typeof vi.fn<
      (evidenceId: string, input: AccessibilityReviewRequest) => Promise<AccessibilityEvidenceDetailDTO>
    >
  >;
} {
  const review =
    options?.review ??
    vi.fn<
      (evidenceId: string, input: AccessibilityReviewRequest) => Promise<AccessibilityEvidenceDetailDTO>
    >().mockResolvedValue(safeDetail as AccessibilityEvidenceDetailDTO);
  return {
    authorize:
      options?.authorize ??
      vi.fn().mockResolvedValue({ accountRole: "ADMIN", userId: "admin-id" }),
    createService: vi.fn(() => ({ review })),
    review,
  };
}

describe("Admin accessibility evidence review route", () => {
  it.each([
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
  ] as const)("rejects %s before review", async (code, status) => {
    const deps = dependencies({
      authorize: vi.fn().mockRejectedValue(new ApplicationError(code)),
    });
    const handler = createAdminAccessibilityEvidenceReviewHandler(deps);

    const response = await handler(request({ validation_status: "CONFIRMED" }), {
      params: Promise.resolve({ evidenceId: "MAPID_ACTIVITY%3Aactivity-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(status);
    expect(body.error.code).toBe(code);
    expect(deps.review).not.toHaveBeenCalled();
  });

  it("rejects strict invalid payloads", async () => {
    const deps = dependencies();
    const handler = createAdminAccessibilityEvidenceReviewHandler(deps);

    const response = await handler(request({
      validation_status: "CONFIRMED",
      routing_effect_enabled: true,
    }), {
      params: Promise.resolve({ evidenceId: "MAPID_ACTIVITY%3Aactivity-1" }),
    });

    expect(response.status).toBe(400);
    expect(deps.review).not.toHaveBeenCalled();
  });

  it("allows ADMIN review and returns a safe evidence DTO", async () => {
    const deps = dependencies();
    const handler = createAdminAccessibilityEvidenceReviewHandler(deps);

    const response = await handler(request({
      validation_status: "NEEDS_REVIEW",
      confirmed_category: "ACCESSIBILITY_OBSERVATION",
      confirmed_subcategory: "SIDEWALK",
      relation_status: "CANDIDATE",
    }), {
      params: Promise.resolve({ evidenceId: "MAPID_ACTIVITY%3Aactivity-1" }),
    });
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.data.routing_effect_enabled).toBe(false);
    expect(serialized).not.toContain("x-api-key");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("raw_payload");
    expect(deps.review).toHaveBeenCalledWith(
      "MAPID_ACTIVITY:activity-1",
      expect.objectContaining({ validation_status: "NEEDS_REVIEW" }),
    );
  });
});
