import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import {
  isCommonPassword,
  evaluatePasswordStrength,
  MIN_PASSWORD_LENGTH,
} from "@/src/lib/password-policy";
import { registerSchema } from "@/src/schemas/auth.schema";
import { requireRole } from "@/src/lib/auth";
import { applyStaticSecurityHeaders } from "@/src/lib/api-security/security-headers";

// Mock Supabase server client for auth tests
vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/supabase/server", () => ({
  getServerSupabaseClient: vi.fn(),
  getRequestSupabaseClient: vi.fn(),
}));

import {
  getServerSupabaseClient,
  getRequestSupabaseClient,
} from "@/src/lib/supabase/server";

describe("ISO/IEC 27001:2022 Security Hardening Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Password Security Policy Controls", () => {
    it("enforces minimum 12 characters length baseline", () => {
      expect(MIN_PASSWORD_LENGTH).toBe(12);

      const shortPasswords = [
        "12345678",
        "Short1!",
        "pass1234",
        "Abcdef12345", // 11 chars
      ];

      for (const pwd of shortPasswords) {
        const result = registerSchema.safeParse({
          email: "user@example.com",
          display_name: "Test User",
          password: pwd,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("minimal 12 karakter");
        }
      }
    });

    it("rejects common weak passwords with localized generic message", () => {
      const commonPasswords = [
        "123456789012",
        "1234567890123",
        "qwertyuiop12",
        "password12345",
        "admin12345678",
        "indonesia1234",
        "aaaaaaaaaaaa",
        "111111111111",
      ];

      for (const pwd of commonPasswords) {
        expect(isCommonPassword(pwd)).toBe(true);

        const result = registerSchema.safeParse({
          email: "user@example.com",
          display_name: "Test User",
          password: pwd,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const hasCommonError = result.error.issues.some((issue) =>
            issue.message.includes("Password terlalu mudah ditebak"),
          );
          expect(hasCommonError).toBe(true);
        }
      }
    });

    it("accepts strong multi-word passphrases and complex passwords", () => {
      const validPasswords = [
        "kucing hitam melompat tinggi sekali",
        "kopi tubruk manis hangat di senja hari",
        "Correct-Horse-Battery-Staple-2026!",
        "P@ssw0rdPanjangDanAmanSekali2026",
      ];

      for (const pwd of validPasswords) {
        expect(isCommonPassword(pwd)).toBe(false);

        const result = registerSchema.safeParse({
          email: "user@example.com",
          display_name: "Test User",
          password: pwd,
        });
        expect(result.success).toBe(true);

        const strength = evaluatePasswordStrength(pwd);
        expect(strength.score).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("2. Public Self-Registration Privilege Escalation Prevention", () => {
    it("blocks public registration from specifying role: ADMIN (strict schema validation)", () => {
      const payloadWithAdminRole = {
        email: "attacker@example.com",
        display_name: "Attacker",
        password: "SuperSecurePassphrase2026!",
        role: "ADMIN",
      };

      const result = registerSchema.safeParse(payloadWithAdminRole);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("unrecognized_keys");
      }
    });

    it("blocks public registration from specifying is_admin flag", () => {
      const payloadWithIsAdmin = {
        email: "attacker@example.com",
        display_name: "Attacker",
        password: "SuperSecurePassphrase2026!",
        is_admin: true,
      };

      const result = registerSchema.safeParse(payloadWithIsAdmin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("unrecognized_keys");
      }
    });
  });

  describe("3. Server-Side Authorization Enforcement (USER / ADMIN)", () => {
    it("rejects unauthenticated requests to protected endpoints (401 UNAUTHORIZED)", async () => {
      const req = new NextRequest("http://localhost:8080/api/admin/merchant-submissions", {
        method: "GET",
      });

      await expect(requireRole(req, "ADMIN")).rejects.toThrow();
    });

    it("rejects non-admin users attempting to access ADMIN resources (403 FORBIDDEN)", async () => {
      const mockUser = { id: "regular-user-id" };
      vi.mocked(getServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      } as any);

      vi.mocked(getRequestSupabaseClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "regular-user-id",
                  display_name: "Regular User",
                  username: "reguser",
                  avatar_url: null,
                  phone_number: null,
                  bio: null,
                  account_role: "USER",
                  trust_score: 100,
                  onboarding_complete: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const req = new NextRequest("http://localhost:8080/api/admin/merchant-submissions", {
        method: "GET",
        headers: {
          Authorization: "Bearer valid-user-token",
        },
      });

      await expect(requireRole(req, "ADMIN")).rejects.toThrow(/Access denied for account role: USER/);
    });

    it("permits verified ADMIN users", async () => {
      const mockAdmin = { id: "admin-user-id" };
      vi.mocked(getServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: mockAdmin },
            error: null,
          }),
        },
      } as any);

      vi.mocked(getRequestSupabaseClient).mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "admin-user-id",
                  display_name: "Admin User",
                  username: "adminuser",
                  avatar_url: null,
                  phone_number: null,
                  bio: null,
                  account_role: "ADMIN",
                  trust_score: 100,
                  onboarding_complete: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      const req = new NextRequest("http://localhost:8080/api/admin/merchant-submissions", {
        method: "GET",
        headers: {
          Authorization: "Bearer valid-admin-token",
        },
      });

      const authResult = await requireRole(req, "ADMIN");
      expect(authResult.userId).toBe("admin-user-id");
      expect(authResult.accountRole).toBe("ADMIN");
    });
  });

  describe("4. Security Headers & Defense in Depth", () => {
    it("applies strict CSP, nosniff, frame protection, and referrer policy", () => {
      const headers = new Headers();
      applyStaticSecurityHeaders(headers);

      expect(headers.get("Content-Security-Policy")).toBe(
        "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      );
      expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(headers.get("X-Frame-Options")).toBe("DENY");
      expect(headers.get("Referrer-Policy")).toBe("no-referrer");
      expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
      expect(headers.get("Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=()",
      );
    });
  });
});
