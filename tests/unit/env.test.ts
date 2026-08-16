import { describe, expect, it } from "vitest";

import {
  EnvironmentValidationError,
  parseEnvironment,
} from "@/src/lib/env";

describe("environment validation", () => {
  it("parses valid public Supabase configuration", () => {
    expect(
      parseEnvironment({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    });
  });

  it("reports a missing variable name without echoing its value", () => {
    const secretLikeValue = "sb_publishable_should_not_be_reported";

    try {
      parseEnvironment({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secretLikeValue,
        NEXT_PUBLIC_SUPABASE_URL: "",
      });
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect(error).toMatchObject({ fields: ["NEXT_PUBLIC_SUPABASE_URL"] });
      expect(String(error)).not.toContain(secretLikeValue);
    }
  });
});
