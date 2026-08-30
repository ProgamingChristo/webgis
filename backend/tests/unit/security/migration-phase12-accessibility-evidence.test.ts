import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..", "..", "..");
const sql = readFileSync(
  resolve(
    root,
    "supabase/migrations/20260828170000_phase12_accessibility_evidence_foundation.sql",
  ),
  "utf8",
);

describe("Phase 12 accessibility evidence migration", () => {
  it("adds review metadata without destructive source or graph operations", () => {
    expect(sql).toContain("accessibility_evidence_reviews");
    expect(sql).toContain("list_accessibility_evidence_v1");
    expect(sql).toContain("get_accessibility_need_summary_v1");
    expect(sql).not.toMatch(/\b(drop|truncate|delete)\s+(?:table\s+)?public\.(mapid_mission_observations|community_contributions|pedestrian_edges)/i);
  });

  it("keeps accessibility evidence separated from routing effects", () => {
    expect(sql).toContain("routing_effect_enabled BOOLEAN NOT NULL DEFAULT FALSE");
    expect(sql).toContain("CHECK (routing_effect_enabled = FALSE)");
    expect(sql).not.toMatch(/update\s+public\.pedestrian_edges\s+set\s+(cost|reverse_cost|walkable)/i);
    expect(sql).not.toMatch(/edge_cost\s*\+=|reverse_cost\s*\+=/i);
  });

  it("keeps admin review on canonical account_role authorization", () => {
    expect(sql).toContain("v_profile.account_role <> 'ADMIN'::public.account_role");
    expect(sql).not.toMatch(/moderator|accessibility_role|app_role|profiles\.role/i);
  });
});
