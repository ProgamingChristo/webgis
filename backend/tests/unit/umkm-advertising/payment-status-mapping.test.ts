import { describe, it, expect } from "vitest";
import { mapMidtransStatusToPaymentStatus } from "@/src/features/umkm-advertising/payment/providers/midtrans/midtrans.mapper";
import { canTransitionPaymentStatus } from "@/src/features/umkm-advertising/payment/constants/payment.constants";

describe("Payment Status Mapping & Legal Transitions", () => {
  describe("mapMidtransStatusToPaymentStatus", () => {
    it("maps settlement to PAID", () => {
      expect(mapMidtransStatusToPaymentStatus("settlement")).toBe("PAID");
    });

    it("maps capture with accept fraud_status to PAID", () => {
      expect(mapMidtransStatusToPaymentStatus("capture", "accept")).toBe("PAID");
      expect(mapMidtransStatusToPaymentStatus("capture")).toBe("PAID");
    });

    it("maps capture with challenge fraud_status to PENDING", () => {
      expect(mapMidtransStatusToPaymentStatus("capture", "challenge")).toBe("PENDING");
    });

    it("maps pending to PENDING", () => {
      expect(mapMidtransStatusToPaymentStatus("pending")).toBe("PENDING");
    });

    it("maps deny to FAILED", () => {
      expect(mapMidtransStatusToPaymentStatus("deny")).toBe("FAILED");
    });

    it("maps expire to EXPIRED", () => {
      expect(mapMidtransStatusToPaymentStatus("expire")).toBe("EXPIRED");
    });

    it("maps cancel to CANCELLED", () => {
      expect(mapMidtransStatusToPaymentStatus("cancel")).toBe("CANCELLED");
    });

    it("maps refund to REFUNDED", () => {
      expect(mapMidtransStatusToPaymentStatus("refund")).toBe("REFUNDED");
      expect(mapMidtransStatusToPaymentStatus("partial_refund")).toBe("REFUNDED");
    });

    it("safely maps unknown status to FAILED and never to PAID", () => {
      expect(mapMidtransStatusToPaymentStatus("unknown_status_xyz")).toBe("FAILED");
    });
  });

  describe("canTransitionPaymentStatus", () => {
    it("allows CREATED to PENDING or PAID", () => {
      expect(canTransitionPaymentStatus("CREATED", "PENDING")).toBe(true);
      expect(canTransitionPaymentStatus("CREATED", "PAID")).toBe(true);
    });

    it("allows PENDING to PAID or FAILED", () => {
      expect(canTransitionPaymentStatus("PENDING", "PAID")).toBe(true);
      expect(canTransitionPaymentStatus("PENDING", "FAILED")).toBe(true);
    });

    it("prevents PAID from reverting to PENDING, FAILED, or EXPIRED", () => {
      expect(canTransitionPaymentStatus("PAID", "PENDING")).toBe(false);
      expect(canTransitionPaymentStatus("PAID", "FAILED")).toBe(false);
      expect(canTransitionPaymentStatus("PAID", "EXPIRED")).toBe(false);
    });

    it("allows PAID to transition to REFUNDED", () => {
      expect(canTransitionPaymentStatus("PAID", "REFUNDED")).toBe(true);
    });

    it("allows idempotent transition to same status", () => {
      expect(canTransitionPaymentStatus("PAID", "PAID")).toBe(true);
      expect(canTransitionPaymentStatus("PENDING", "PENDING")).toBe(true);
    });
  });
});
