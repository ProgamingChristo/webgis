import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/20260905170000_community_post_delete_and_route_umkm.sql"), "utf8");

describe("community post deletion migration", () => {
  it("uses one-post soft deletion with owner/admin authorization and an audit row", () => {
    expect(sql).toContain("WHERE id = p_post_id");
    expect(sql).toContain("post_row.author_id = actor_id");
    expect(sql).toContain("community_is_admin()");
    expect(sql).toContain("moderation_status = 'REMOVED'");
    expect(sql).toContain("community_post_deletion_audit");
    expect(sql).not.toMatch(/TRUNCATE|DELETE\s+FROM\s+public\.community_posts/i);
  });

  it("keeps corridor analysis service-only and spatially bounded", () => {
    expect(sql).toContain("ST_DWithin");
    expect(sql).toContain("p_corridor_meters BETWEEN 25 AND 500");
    expect(sql).toContain("merchant.publish_status::TEXT = 'PUBLISHED'");
    expect(sql).toContain("merchant_source_links");
    expect(sql).toContain("mapid_mission_observations:MENU_GO");
    expect(sql).toContain("TO service_role");
  });
});
