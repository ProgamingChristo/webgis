import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as RegisterPOST } from "@/app/api/auth/register/route";
import { POST as LoginPOST } from "@/app/api/auth/login/route";

vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/supabase/server", () => ({
  getServerSupabaseClient: vi.fn(),
}));

import { getServerSupabaseClient } from "@/src/lib/supabase/server";

describe("Auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should allow COMMUTER registration", async () => {
      const mockSupabaseClient = {
        auth: {
          signUp: vi.fn().mockResolvedValue({ data: { user: { id: "123", email: "test@example.com" } }, error: null }),
        },
      };
      vi.mocked(getServerSupabaseClient).mockReturnValue(
        mockSupabaseClient as unknown as ReturnType<typeof getServerSupabaseClient>,
      );

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "PasswordDevelopment123!", display_name: "Commuter", role: "COMMUTER" }),
      });
      const res = await RegisterPOST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.profile.role).toBe("COMMUTER");
    });

    it("should reject ADMIN registration", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "admin@example.com", password: "PasswordDevelopment123!", display_name: "Admin", role: "ADMIN" }),
      });
      const res = await RegisterPOST(req);
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("FORBIDDEN");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should return user and profile on success", async () => {
      const mockSupabaseClient = {
        auth: {
          signInWithPassword: vi.fn().mockResolvedValue({ 
            data: { user: { id: "123", email: "test@example.com" }, session: { access_token: "token" } }, 
            error: null 
          }),
        },
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { display_name: "Test User", role: "COMMUTER" }, error: null }),
      };
      vi.mocked(getServerSupabaseClient).mockReturnValue(
        mockSupabaseClient as unknown as ReturnType<typeof getServerSupabaseClient>,
      );

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "PasswordDevelopment123!" }),
      });
      const res = await LoginPOST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.profile.role).toBe("COMMUTER");
    });
  });
});
