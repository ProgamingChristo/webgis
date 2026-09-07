import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../../..");
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260901120000_archive_owned_merchant.sql"),
  "utf8",
);
const route = readFileSync(resolve(root, "app/api/umkm/merchants/[id]/route.ts"), "utf8");

describe("owner-only published merchant archive", () => {
  it("derives the owner from auth context and locks the canonical merchant", () => {
    expect(migration).toMatch(/caller_id uuid := auth\.uid\(\)/);
    expect(migration).toMatch(/merchant_owner_id IS DISTINCT FROM caller_id/);
    expect(migration).toMatch(/FROM public\.merchants[\s\S]*FOR UPDATE/);
    expect(migration).not.toMatch(/DELETE FROM public\.merchants/i);
  });

  it("blocks running campaign lifecycles before archiving", () => {
    expect(migration).toMatch(/status IN \('READY', 'SCHEDULED', 'ACTIVE', 'PAUSED'\)/);
    expect(migration).toMatch(/'status', 'ACTIVE_CAMPAIGNS'/);
    expect(migration).toMatch(/publish_status = 'ARCHIVED'/);
  });

  it("keeps an audit trail and exposes the function only to authenticated users", () => {
    expect(migration).toMatch(/MERCHANT_ARCHIVED_BY_OWNER/);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.archive_owned_merchant\(uuid\) FROM PUBLIC/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.archive_owned_merchant\(uuid\) TO authenticated/);
  });

  it("validates UUIDs and uses the authenticated request Supabase client", () => {
    expect(route).toMatch(/z\.string\(\)\.uuid\(\)/);
    expect(route).toMatch(/requireAuthenticatedUser\(req\)/);
    expect(route).toMatch(/getRequestSupabaseClient\(authHeader\)/);
    expect(route).toMatch(/archiveOwnedMerchant/);
  });
});
