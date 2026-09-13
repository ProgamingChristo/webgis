import { describe, expect, it, vi } from "vitest";
import {
  MerchantProfileService,
  updateMerchantProfileSchema,
} from "@/src/features/merchant-ownership";

describe("MerchantProfileService - Verified Owner Profile Operations", () => {
  const merchantId = "98765432-1234-5678-1234-56789abcdef0";
  const ownerId = "11111111-2222-3333-4444-555555555555";
  const otherUserId = "99999999-8888-7777-6666-555555555555";

  const sampleMerchantRow = {
    id: merchantId,
    name: "Kopi Bundaran",
    owner_id: ownerId,
    verification_status: "VERIFIED",
    publish_status: "PUBLISHED",
    price_level: "$$",
    description: "Kedai kopi santai di pusat transit",
    opening_hours: {
      monday: { is_closed: false, opens_at: "07:00", closes_at: "22:00" },
    },
    metadata: {
      category_label: "Kedai Kopi & Minuman",
      phone: "081234567890",
      facilities: ["Wi-Fi", "Tempat Duduk", "QRIS"],
      social_media: { instagram: "@kopibundaran" },
      public_media: { storefront_url: "https://example.com/store.jpg" },
      menu_items: [
        {
          id: "menu-1",
          name: "Es Kopi Susu",
          price: 22000,
          description: "Espresso arabika dengan aren",
          is_available: true,
        },
      ],
    },
    address: "Jl. M.H. Thamrin No. 28, Menteng, Jakarta Pusat",
    location: "POINT(106.8229 -6.1931)",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  };

  it("successfully reads full authoritative profile for verified owner", async () => {
    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === "merchants") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: sampleMerchantRow,
              error: null,
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const service = new MerchantProfileService(mockSupabase);
    const profile = await service.getProfile(merchantId, ownerId);

    expect(profile.id).toBe(merchantId);
    expect(profile.name).toBe("Kopi Bundaran");
    expect(profile.verification_status).toBe("VERIFIED");
    expect(profile.address).toBe("Jl. M.H. Thamrin No. 28, Menteng, Jakarta Pusat");
    expect(profile.location).toEqual({
      type: "Point",
      coordinates: [106.8229, -6.1931],
    });
    expect(profile.metadata.phone).toBe("081234567890");
    expect(profile.metadata.menu_items).toHaveLength(1);
    expect(profile.metadata.menu_items[0].name).toBe("Es Kopi Susu");
  });

  it("rejects non-owner from reading full profile", async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: sampleMerchantRow,
          error: null,
        }),
      })),
    };

    const service = new MerchantProfileService(mockSupabase);
    await expect(service.getProfile(merchantId, otherUserId)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("validates updateMerchantProfileSchema with menu items and facilities", () => {
    const validPayload = {
      description: "Bio baru gerai kopi",
      opening_hours: { monday: { is_closed: false, opens_at: "08:00", closes_at: "21:00" } },
      metadata: {
        phone: "081298765432",
        facilities: ["Wi-Fi", "Outdoor Seating"],
        payment_methods: ["CASH", "QRIS"],
        social_media: { instagram: "@kopibundaran.id" },
        public_media: { storefront_url: "https://example.com/cover.jpg" },
        menu_items: [
          {
            id: "item-1",
            name: "Croissant Hangat",
            price: 24000,
            description: "Pastry renyah mentega Prancis",
            is_available: true,
            tag: "Favorit Sarapan",
          },
        ],
      },
    };

    const parsed = updateMerchantProfileSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);

    // Negative price should be rejected
    const invalidPayload = {
      ...validPayload,
      metadata: {
        ...validPayload.metadata,
        menu_items: [{ id: "bad", name: "Minus", price: -5000, is_available: true }],
      },
    };
    const invalidParsed = updateMerchantProfileSchema.safeParse(invalidPayload);
    expect(invalidParsed.success).toBe(false);
  });

  it("successfully updates profile with menu items via RPC", async () => {
    const mockSupabase: any = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: sampleMerchantRow,
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: {
            ...sampleMerchantRow,
            description: "Deskripsi diperbarui",
          },
          error: null,
        }),
      })),
      rpc: vi.fn((proc: string, args: any) => {
        if (proc === "update_owned_merchant_profile") {
          expect(args.p_merchant_id).toBe(merchantId);
          expect(args.p_metadata_patch.menu_items).toBeDefined();
          return Promise.resolve({ data: { status: "UPDATED" }, error: null });
        }
        throw new Error(`Unexpected RPC: ${proc}`);
      }),
    };

    const service = new MerchantProfileService(mockSupabase);
    const result = await service.updateProfile(merchantId, ownerId, {
      description: "Deskripsi diperbarui",
      metadata: {
        menu_items: [
          { id: "m1", name: "Latte", price: 25000, is_available: true },
        ],
      },
    });

    expect(result).toBeDefined();
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      "update_owned_merchant_profile",
      expect.objectContaining({
        p_merchant_id: merchantId,
      })
    );
  });
});
