import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function migration(name: string): string {
  return readFileSync(join(process.cwd(), "supabase", "migrations", name), "utf8");
}

describe("database authorization reconciliation", () => {
  it("keeps the guarded security hotfix syntactically quoted", () => {
    const sql = migration("0003_getra_security_hotfix.sql");
    expect(sql).not.toContain("EXECUTE ''grant");
    expect(sql).toContain("EXECUTE 'grant insert");
    expect(sql).toContain("EXECUTE 'grant update");
  });

  it("replaces recursive legacy admin policies with canonical account_role authorization", () => {
    const sql = migration("20260824103000_database_reconciliation_role_and_profiles.sql");
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can read all profiles"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Admins can update all profiles"');
    expect(sql.match(/SELECT private\.is_admin\(\)/g)).toHaveLength(3);
    expect(sql).toContain("account_role = 'ADMIN'::public.account_role");
  });
});
