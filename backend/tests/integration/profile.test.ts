import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "@/app/api/profile/route";

// Mock the dependencies
vi.mock("server-only", () => ({}));
vi.mock("@/src/lib/supabase/server", () => ({
  getServerSupabaseClient: vi.fn(),
  getRequestSupabaseClient: vi.fn(),
}));

import {
  getRequestSupabaseClient,
  getServerSupabaseClient,
} from "@/src/lib/supabase/server";

describe("Profile API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/profile", () => {
    it("should return 401 if unauthorized", async () => {
      const req = new NextRequest("http://localhost:3000/api/profile");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("should return profile if authenticated", async () => {
      const mockUser = { id: "user-123" };
      const mockProfile = { id: "user-123", display_name: "Test User" };
      
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };

      const mockUserClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      };

      vi.mocked(getServerSupabaseClient).mockReturnValue(
        mockSupabaseClient as unknown as ReturnType<typeof getServerSupabaseClient>,
      );
      vi.mocked(getRequestSupabaseClient).mockReturnValue(
        mockUserClient as unknown as ReturnType<typeof getRequestSupabaseClient>,
      );

      const req = new NextRequest("http://localhost:3000/api/profile", {
        headers: { Authorization: "Bearer valid-token" },
      });
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.id).toBe("user-123");
      expect(json.data.display_name).toBe("Test User");
    });
  });

  describe("PATCH /api/profile", () => {
    it("should return validation error for invalid data", async () => {
      const mockUser = { id: "user-123" };
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };
      vi.mocked(getServerSupabaseClient).mockReturnValue(
        mockSupabaseClient as unknown as ReturnType<typeof getServerSupabaseClient>,
      );

      const req = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        headers: { 
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ display_name: "a" }), // Too short
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("should update and return profile if valid", async () => {
      const mockUser = { id: "user-123" };
      const updatedProfile = { id: "user-123", display_name: "John Doe" };
      
      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      };

      const mockUserClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
      };

      vi.mocked(getServerSupabaseClient).mockReturnValue(
        mockSupabaseClient as unknown as ReturnType<typeof getServerSupabaseClient>,
      );
      vi.mocked(getRequestSupabaseClient).mockReturnValue(
        mockUserClient as unknown as ReturnType<typeof getRequestSupabaseClient>,
      );

      const req = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        headers: { 
          Authorization: "Bearer valid-token",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ display_name: "New Name" }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.display_name).toBe("John Doe");
    });
  });
});
