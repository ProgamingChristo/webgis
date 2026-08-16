import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getEnvironment: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/src/lib/env", () => ({
  getEnvironment: mocks.getEnvironment,
}));

import {
  getRequestSupabaseClient,
  getServerSupabaseClient,
} from "@/src/lib/supabase/server";

describe("server Supabase clients", () => {
  beforeEach(() => {
    mocks.getEnvironment.mockReturnValue({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    });
    mocks.createClient.mockReturnValue({ client: "test" });
  });

  it("creates a non-persistent server client from validated configuration", () => {
    expect(getServerSupabaseClient()).toEqual({ client: "test" });
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "publishable-test-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });

  it("forwards only the request authorization header to an RLS-aware client", () => {
    getRequestSupabaseClient("Bearer request-token");

    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "publishable-test-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: "Bearer request-token" },
        },
      },
    );
  });
});
