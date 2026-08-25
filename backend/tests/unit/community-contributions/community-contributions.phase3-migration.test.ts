import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824060000_harden_community_contribution_submission.sql",
  ),
  "utf8",
);

const phase4Migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824070000_community_contribution_history_points.sql",
  ),
  "utf8",
);

const phase6Migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260824090000_community_contribution_trust_score.sql",
  ),
  "utf8",
);

describe("community contribution Phase 3 migration", () => {
  it("centralizes deterministic validation thresholds", () => {
    expect(migration).toContain(
      "community_contribution_validation_settings_v1",
    );
    expect(migration).toContain("10");
    expect(migration).toContain("365");
    expect(migration).toContain("20");
    expect(migration).toContain("60");
    expect(migration).toContain("25");
    expect(migration).toContain("24");
  });

  it("uses PostGIS and a per-user transaction lock for duplicate and limit checks", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("ST_DWithin");
    expect(migration).toContain("location::extensions.geography");
    expect(migration).toContain("idx_community_contributions_location_geog_gist");
    expect(migration).toContain(
      "idx_community_contributions_pending_author_type_target_created",
    );
  });

  it("closes direct authenticated insert bypass and keeps contributions pending", () => {
    expect(migration).toContain(
      "DROP POLICY IF EXISTS community_contributions_insert_own_pending",
    );
    expect(migration).toContain(
      "REVOKE INSERT ON public.community_contributions FROM authenticated",
    );
    expect(migration).toContain("'PENDING'");
    expect(migration).not.toContain("trust_score");
    expect(migration).not.toContain("award");
  });
});

describe("community contribution Phase 4 migration", () => {
  it("adds an auditable idempotent points ledger separate from profiles", () => {
    expect(phase4Migration).toContain(
      "community_contribution_point_events",
    );
    expect(phase4Migration).toContain("UNIQUE (contribution_id)");
    expect(phase4Migration).toContain("CHECK (points > 0)");
    expect(phase4Migration).toContain("SELECT 1");
    expect(phase4Migration).not.toContain("profiles.trust_score");
    expect(phase4Migration).not.toContain("profiles.contribution_points");
  });

  it("keeps ordinary users read-only for point events", () => {
    expect(phase4Migration).toContain(
      "REVOKE ALL ON public.community_contribution_point_events",
    );
    expect(phase4Migration).toContain(
      "GRANT SELECT ON public.community_contribution_point_events TO authenticated",
    );
    expect(phase4Migration).toContain(
      "REVOKE ALL ON FUNCTION public.award_community_contribution_points_v1(UUID)",
    );
    expect(phase4Migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.award_community_contribution_points_v1(UUID)",
    );
    expect(phase4Migration).toContain("TO service_role");
  });

  it("derives history from canonical contributions without N+1 target lookups", () => {
    expect(phase4Migration).toContain(
      "list_community_contribution_history_v1",
    );
    expect(phase4Migration).toContain("LEFT JOIN public.merchants");
    expect(phase4Migration).toContain("LEFT JOIN point_totals");
    expect(phase4Migration).toContain("ORDER BY filtered.created_at DESC");
  });
});

describe("community contribution Phase 6 migration", () => {
  it("uses the MVP trust formula from moderated outcomes only", () => {
    expect(phase6Migration).toContain(
      "calculate_community_contribution_trust_score_v1",
    );
    expect(phase6Migration).toContain("WHEN stats.reviewed_contributions = 0 THEN 50");
    expect(phase6Migration).toContain("stats.approved_contributions + 1");
    expect(phase6Migration).toContain(
      "stats.approved_contributions + stats.rejected_contributions + 2",
    );
    expect(phase6Migration).not.toContain("contribution_points = trust_score");
    expect(phase6Migration).not.toContain("HELPFUL");
    expect(phase6Migration).not.toContain("embedding");
    expect(phase6Migration).not.toContain("llm");
  });

  it("keeps trust score bounded and direct recalculation internal", () => {
    expect(phase6Migration).toContain("profiles_trust_score_range");
    expect(phase6Migration).toContain("CHECK (trust_score BETWEEN 0 AND 100)");
    expect(phase6Migration).toContain(
      "REVOKE ALL ON FUNCTION public.recalculate_community_contribution_trust_score_v1(UUID)",
    );
    expect(phase6Migration).toContain("TO service_role");
    expect(phase6Migration).not.toContain("GRANT UPDATE(trust_score)");
  });

  it("integrates trust recalculation into moderation without manual score input", () => {
    expect(phase6Migration).toContain(
      "PERFORM public.recalculate_community_contribution_trust_score_v1",
    );
    expect(phase6Migration).not.toContain("p_trust_score");
    expect(phase6Migration).not.toContain("trust_score +");
  });
});
