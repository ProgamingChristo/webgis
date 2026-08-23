import { describe, expect, it } from "vitest";

import { patchProfileSchema } from "@/src/schemas/profile.schema";

describe("profile update schema", () => {
  it.each([
    ["id", "00000000-0000-0000-0000-000000000001"],
    ["role", "ADMIN"],
    ["account_role", "ADMIN"],
  ])("rejects immutable field %s", (field, value) => {
    const parsed = patchProfileSchema.safeParse({
      display_name: "TEST USER",
      [field]: value,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "unrecognized_keys",
            keys: expect.arrayContaining([field]),
          }),
        ]),
      );
    }
  });

  it("accepts the mutable profile fields", () => {
    const parsed = patchProfileSchema.safeParse({
      display_name: "Chris GETRA",
      username: "chris_getra",
      avatar_url: "https://example.invalid/avatar.png",
      phone_number: "+628123456789",
      bio: "Spatial intelligence builder.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid usernames", () => {
    const parsed = patchProfileSchema.safeParse({
      username: "Chris GETRA!",
    });

    expect(parsed.success).toBe(false);
  });
});
