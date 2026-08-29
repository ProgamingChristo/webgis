import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260828150000_phase09_demand_intelligence.sql"), "utf8");

describe("Phase 09 demand intelligence migration", () => {
  it("is additive, private, indexed, and idempotent", () => {
    expect(migration).toContain("create table if not exists public.analytics_events");
    expect(migration).toContain("unique (dedup_key)");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.analytics_events from public, anon, authenticated");
    expect(migration).toContain("idx_analytics_events_category_time");
    expect(migration).not.toMatch(/drop\s+table|truncate|delete\s+from\s+public\.merchants/i);
  });

  it("preserves safe source semantics and formulas", () => {
    expect(migration).toContain("source_type = 'STRUK_GO'");
    expect(migration).toContain("TRANSACTION_OBSERVATION");
    expect(migration).toContain("CAMPAIGN_INTERACTION', 0.0");
    expect(migration).toContain("row.demand_score - row.supply_score");
    expect(migration).toContain("row.sample_size >= 3");
    expect(migration).toContain("GETRA_OBSERVED_PLATFORM_DEMAND_SIGNAL");
    expect(migration).not.toMatch(/revenue_score|roi_score|profit_score/i);
  });
});
