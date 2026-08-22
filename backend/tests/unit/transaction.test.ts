import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RepositoryError } from "@/src/repositories/errors";
import { executeAtomicRpc } from "@/src/repositories/transaction";

describe("atomic repository RPC convention", () => {
  it("returns procedure data and forwards only the named parameters", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { fixture_id: "fixture-1", version: "1" },
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;
    const parameters = { fixture_name: "TEST RPC" };

    await expect(
      executeAtomicRpc<{ fixture_id: string; version: string }>(
        client,
        "create_test_fixture",
        parameters,
      ),
    ).resolves.toEqual({ fixture_id: "fixture-1", version: "1" });
    expect(rpc).toHaveBeenCalledWith("create_test_fixture", parameters);
  });

  it("maps a procedure failure to a sanitized RepositoryError", async () => {
    const internalDetail = "duplicate key SQL fixture detail";
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: internalDetail },
    });
    const client = { rpc } as unknown as SupabaseClient;

    let thrown: unknown;
    try {
      await executeAtomicRpc(client, "create_test_fixture", {});
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RepositoryError);
    expect(thrown).toMatchObject({
      code: "CONFLICT",
      message: "The repository operation conflicts with existing data",
      operation: "rpc:create_test_fixture",
    });
    expect((thrown as Error).message).not.toContain(internalDetail);
  });
});
