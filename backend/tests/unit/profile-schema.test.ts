import { describe, expect, it } from "vitest";

import { patchProfileSchema } from "@/src/schemas/profile.schema";

describe("profile update schema", () => {
  it.each([
    ["id", "00000000-0000-0000-0000-000000000001"],
    ["role", "ADMIN"],
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
});
