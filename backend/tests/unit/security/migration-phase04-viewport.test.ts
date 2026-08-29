import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260827150000_phase04_canonical_merchant_viewport.sql"),
  "utf8",
);

describe("Phase 04 canonical viewport migration", () => {
  it("uses PostGIS bbox filtering, a spatial index, and service-role-only execution", () => {
    expect(migration).toContain("using gist (location)");
    expect(migration).toContain("extensions.st_intersects");
    expect(migration).toContain("extensions.st_makeenvelope");
    expect(migration).toContain("limit greatest(1, least(coalesce(p_limit, 100), 250))");
    expect(migration).toContain("revoke all on function");
    expect(migration).toContain("to service_role");
  });
});
