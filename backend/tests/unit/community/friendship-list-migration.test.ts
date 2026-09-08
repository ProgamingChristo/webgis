import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const migration = readFileSync(new URL("../../../supabase/migrations/20260905140000_fix_friendship_list_column_ambiguity.sql", import.meta.url), "utf8");
describe("friendship list ambiguity repair", () => {
  it("qualifies each output-variable collision in the filtering CTE", () => {
    expect(migration).toContain("scoped.status = 'ACCEPTED'");
    expect(migration).toContain("scoped.status = 'PENDING' AND scoped.direction = 'INCOMING'");
    expect(migration).toContain("scoped.status = 'PENDING' AND scoped.direction = 'OUTGOING'");
    expect(migration).toContain("ORDER BY scoped.updated_at DESC, scoped.id DESC");
  });
  it("preserves the authenticated participant boundary and function contract without data writes", () => {
    expect(migration).toContain("current_user_id UUID := auth.uid()");
    expect(migration).toContain("IF current_user_id IS NULL THEN");
    expect(migration).toContain("friendship.requester_id = current_user_id");
    expect(migration).toContain("friendship.addressee_id = current_user_id");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public");
    expect(migration).not.toMatch(/\b(INSERT\s+INTO|DELETE\s+FROM|DROP\s+|TRUNCATE\s+|GRANT\s+|REVOKE\s+)\b/i);
  });
});
