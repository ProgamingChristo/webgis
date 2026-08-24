import { describe, it, expect } from "vitest";
import {
  createMerchantSubmissionSchema,
  adminRejectSubmissionSchema,
} from "@/src/features/merchant-submission/schemas/merchant-submission.schema";

describe("Merchant Submission Schemas", () => {
  it("should validate valid create draft payload", () => {
    const valid = {
      name: "Warung Kopi Selamat",
      category: "Makanan & Minuman",
      description: "Kopi susu gula aren",
      address: "Jl. Kebon Jeruk No. 12",
      location: {
        type: "Point",
        coordinates: [106.78, -6.18],
      },
    };

    const parsed = createMerchantSubmissionSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("should reject invalid coordinates (out of range / NaN)", () => {
    const invalid = {
      name: "Warung Kopi",
      category: "Makanan & Minuman",
      location: {
        type: "Point",
        coordinates: [200, -95], // Invalid lng > 180, lat < -90
      },
    };

    const parsed = createMerchantSubmissionSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it("should reject injected submitted_by or status = APPROVED in strict mode", () => {
    const injected = {
      name: "Warung Kopi",
      category: "Makanan & Minuman",
      location: {
        type: "Point",
        coordinates: [106.78, -6.18],
      },
      status: "APPROVED",
      submitted_by: "spoofed-user-id",
    };

    const parsed = createMerchantSubmissionSchema.safeParse(injected);
    expect(parsed.success).toBe(false);
  });

  it("should reject empty reason in adminRejectSubmissionSchema", () => {
    const parsed = adminRejectSubmissionSchema.safeParse({ note: "  " });
    expect(parsed.success).toBe(false);
  });
});
