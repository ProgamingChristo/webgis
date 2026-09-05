import { describe, expect, it } from "vitest";
import { loginPath, postLoginPath, safeReturnPath } from "@/src/lib/auth-return-path";

describe("safe authentication return path", () => {
  it.each(["/business-space", "/community?view=requests", "/umkm?merchantId=123#visibilitas"])("retains internal %s", value => {
    expect(safeReturnPath(value)).toBe(value);
    expect(postLoginPath(new URL(loginPath(value), "https://getra.test").search, true)).toBe(value);
  });
  it.each([null, "", "https://evil.test", "//evil.test", "javascript:alert(1)", "/\\evil.test", "/%2f%2fevil.test", "/%252f%252fevil.test", "/..//evil.test", "/%00evil", "/%255cevil", "/login", "/signup", "/onboarding"])("rejects unsafe/looping target %s", value => {
    expect(safeReturnPath(value)).toBe("/app");
  });
  it("preserves a protected destination through required onboarding", () => {
    expect(postLoginPath("?returnTo=%2Fbusiness-space", false)).toBe("/onboarding?returnTo=%2Fbusiness-space");
  });
  it("uses the normal app when no target exists", () => {
    expect(postLoginPath("", true)).toBe("/app");
  });
  it("handles an unauthenticated/expired protected-page redirect identically", () => {
    expect(loginPath("/business-space")).toBe("/login?returnTo=%2Fbusiness-space");
  });
});
