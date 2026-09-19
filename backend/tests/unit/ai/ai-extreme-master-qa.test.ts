import { describe, expect, it } from "vitest";
import { AiService } from "@/src/modules/ai/ai.service";

describe("GETRA AI Extreme Master QA Test Suite (Sections 12 & 13)", () => {
  const service = new AiService("Bearer TEST_TOKEN");
  const ask = async (req: any): Promise<any> => service.handleAskRequest(req);

  // SECTION 12: SEARCH
  describe("Section 12: Search Queries", () => {
    it("1. cari bakso di jakarta pusat", async () => {
      const res = await ask({ question: "cari bakso di jakarta pusat" });
      expect(res.intent).toBe("MERCHANT_SEARCH");
      expect(res.action.type).toBe("APPLY_SEARCH_CRITERIA");
      expect(res.suggestion_chips).toBeDefined();
      expect(res.suggestion_chips.length).toBeGreaterThan(0);
    });

    it("2. umkm dekat stasiun manggarai", async () => {
      const res = await ask({ question: "umkm dekat stasiun manggarai" });
      expect(res.intent).toBe("MERCHANT_SEARCH");
      expect(res.action.type).toBe("APPLY_SEARCH_CRITERIA");
      expect(res.action.criteria.reference_text).toBe("Stasiun Manggarai");
    });

    it("3. tempat makan dekat saya", async () => {
      const res = await ask({
        question: "tempat makan dekat saya",
        context: { origin: { latitude: -6.2, longitude: 106.8 } },
      });
      expect(res.intent).toBe("MERCHANT_SEARCH");
      expect(res.action.type).toBe("APPLY_SEARCH_CRITERIA");
      expect(res.action.criteria.near_user).toBe(true);
    });

    it("4. kopi murah dekat stasiun", async () => {
      const res = await ask({ question: "kopi murah dekat stasiun" });
      expect(res.intent).toBe("MERCHANT_SEARCH");
      expect(res.action.type).toBe("REQUEST_CLARIFICATION");
      expect(res.answer).toContain("Sebutkan nama stasiun");

      const resNamed = await ask({ question: "kopi murah dekat stasiun manggarai" });
      expect(resNamed.intent).toBe("MERCHANT_SEARCH");
      expect(resNamed.action.type).toBe("APPLY_SEARCH_CRITERIA");
      expect(resNamed.action.criteria.reference_text).toBe("Stasiun Manggarai");
    });

    it("5. tempat yang buka sekarang", async () => {
      const res = await ask({
        question: "tempat yang buka sekarang",
        context: { origin: { latitude: -6.2, longitude: 106.8 } },
      });
      expect(res.intent).toBe("MERCHANT_SEARCH");
      expect(res.action.type).toBe("APPLY_SEARCH_CRITERIA");
    });
  });

  // SECTION 12: ROUTING
  describe("Section 12: Routing Queries", () => {
    it("6. antar saya ke sini (with selected entity)", async () => {
      const res = await ask({
        question: "antar saya ke sini",
        context: {
          origin: { latitude: -6.2088, longitude: 106.8456 },
          selected_entity_id: "merchant-123",
          selected_entity_name: "Bakso Berkah",
        },
      });
      expect(res.intent).toBe("WALKING_ROUTE");
      expect(["CALCULATE_ROUTE", "PREPARE_ROUTE"]).toContain(res.action.type);
      expect(res.action.destination.type).toBe("SELECTED_MERCHANT");
    });

    it("7. rute jalan kaki paling aman", async () => {
      const res = await ask({ question: "rute jalan kaki paling aman" });
      expect(res.intent).toBe("WALKING_ROUTE");
      expect(res.answer).toContain("graf pedestrian PostGIS dan Valhalla");
      expect(res.evidence.length).toBeGreaterThan(0);
    });

    it("8. berapa lama jalan?", async () => {
      const res = await ask({
        question: "berapa lama jalan dari Stasiun Manggarai ke Tebet?",
      });
      expect(res.intent).toBe("WALKING_ROUTE");
      expect(["CALCULATE_ROUTE", "PREPARE_ROUTE"]).toContain(res.action.type);
    });

    it("9. saya keluar dari rute", async () => {
      const res = await ask({ question: "saya keluar dari rute" });
      expect(res.intent).toBe("ACTIVE_JOURNEY");
      expect(res.answer).toContain("reroute");
    });

    it("10. cari alternatif", async () => {
      const res = await ask({ question: "cari alternatif" });
      expect(res.intent).toBe("WALKING_ROUTE");
      expect(res.answer).toContain("multimodal");
    });
  });

  // SECTION 12: MAP UNDERSTANDING
  describe("Section 12: Map Context & Understanding", () => {
    it("11. bundaran HI dimana?", async () => {
      const res = await ask({ question: "bundaran HI dimana?" });
      expect(res.intent).toBe("SEARCH_PLACE");
      expect(res.action.type).toBe("FOCUS_PLACE");
    });

    it("12. apa yang ada di sekitar area ini?", async () => {
      const res = await ask({ question: "apa yang ada di sekitar area ini?" });
      expect(res.intent).toBe("GENERAL_AREA");
      expect(res.answer).toContain("Peta GETRA menampilkan sebaran UMKM");
    });

    it("13. apa yang ada di peta?", async () => {
      const res = await ask({ question: "apa yang ada di peta?" });
      expect(res.intent).toBe("GENERAL_AREA");
      expect(res.answer).toContain("Peta GETRA");
    });

    it("14. tunjukkan area ini", async () => {
      const res = await ask({ question: "tunjukkan area ini" });
      expect(res.intent).toBe("GENERAL_AREA");
    });
  });

  // SECTION 12: UMKM
  describe("Section 12: UMKM Lifecycle", () => {
    it("15. cara membuat UMKM", async () => {
      const res = await ask({ question: "cara membuat UMKM" });
      expect(res.intent).toBe("UMKM_CREATE");
      expect(res.action.type).toBe("NAVIGATE");
      expect(res.action.path).toBe("/umkm/merchants/new");
    });

    it("16. bagaimana claim usaha?", async () => {
      const res = await ask({ question: "bagaimana claim usaha?" });
      expect(res.intent).toBe("UMKM_CLAIM");
    });

    it("17. bantu buat deskripsi usaha", async () => {
      const res = await ask({ question: "bantu buat deskripsi usaha" });
      expect(res.intent).toBe("UMKM_CREATE");
      expect(res.answer).toContain("Tips membuat deskripsi usaha UMKM");
      expect(res.action.path).toBe("/umkm/merchants/new");
    });

    it("18. bagaimana agar usaha saya muncul?", async () => {
      const res = await ask({ question: "bagaimana agar usaha saya muncul?" });
      expect(res.intent).toBe("UMKM_STATUS");
      expect(res.answer).toContain("Fair Discovery");
      expect(res.answer).toContain("APPROVED");
    });

    it("19. bagaimana promosi?", async () => {
      const res = await ask({ question: "bagaimana promosi di getra?" });
      expect(["PROMOTION_CREATE", "PROMOTION_SETUP"]).toContain(res.intent);
      expect(res.action.type).toBe("NAVIGATE");
      expect(res.action.path).toBe("/umkm/advertising");
    });
  });

  // SECTION 12: PROMOTION & PAYMENT
  describe("Section 12: Promotion & Midtrans Sandbox", () => {
    it("20. cara membuat promosi", async () => {
      const res = await ask({ question: "cara membuat promosi" });
      expect(res.intent).toBe("PROMOTION_CREATE");
      expect(res.action.type).toBe("NAVIGATE");
      expect(res.action.path).toBe("/umkm/advertising");
    });

    it("21. kenapa promosi belum tampil?", async () => {
      const res = await ask({ question: "kenapa promosi belum tampil?" });
      expect(res.intent).toBe("PROMOTION_SETUP");
      expect(res.answer).toContain("Midtrans");
    });

    it("22. bagaimana bayar?", async () => {
      const res = await ask({ question: "bagaimana bayar promosi?" });
      expect(res.intent).toBe("PROMOTION_PAYMENT");
    });

    it("23. status pembayaran?", async () => {
      const res = await ask({ question: "status pembayaran saya bagaimana?" });
      expect(res.intent).toBe("PAYMENT_STATUS");
    });

    it("24. mana invoice saya?", async () => {
      const res = await ask({ question: "mana invoice saya?" });
      expect(["PAYMENT_STATUS", "PROMOTION_INVOICE"]).toContain(res.intent);
      expect(res.answer).toContain("Invoice");
      expect(res.action.type).toBe("NAVIGATE");
      expect(res.action.path).toBe("/umkm/advertising");
    });
  });

  // SECTION 12: COMMUNITY
  describe("Section 12: Community & Citizen Observation", () => {
    it("25. bagaimana membuat laporan?", async () => {
      const res = await ask({ question: "bagaimana membuat laporan?" });
      expect(res.intent).toBe("COMMUNITY_OBSERVATION");
      expect(res.action.type).toBe("NAVIGATE");
      expect(res.action.path).toBe("/community");
    });

    it("26. ada aktivitas komunitas?", async () => {
      const res = await ask({ question: "ada aktivitas komunitas?" });
      expect(["ACTIVITY_FEED", "COMMUNITY_OBSERVATION"]).toContain(res.intent);
    });

    it("27. apa informasi terbaru di area ini?", async () => {
      const res = await ask({ question: "apa informasi terbaru di area ini?" });
      expect(res.intent).toBe("COMMUNITY_OBSERVATION");
    });
  });

  // SECTION 12: ACCESSIBILITY
  describe("Section 12: Accessibility Infrastructure", () => {
    it("28. apakah ada akses kursi roda?", async () => {
      const res = await ask({ question: "apakah ada akses kursi roda?" });
      expect(res.intent).toBe("ACCESSIBILITY");
      expect(res.answer).toContain("ramah difabel");
      expect(res.action.type).toBe("SWITCH_MAP_MODE");
    });

    it("29. apa hambatan menuju UMKM ini?", async () => {
      const res = await ask({ question: "apa hambatan menuju UMKM ini?" });
      expect(res.intent).toBe("ACCESSIBILITY");
    });

    it("30. apakah ada fasilitas akses?", async () => {
      const res = await ask({ question: "apakah ada fasilitas akses?" });
      expect(res.intent).toBe("ACCESSIBILITY");
    });
  });

  // SECTION 12: INVESTOR & GOVERNMENT
  describe("Section 12: Investor & Government Spatial Intelligence", () => {
    it("31. area mana yang menarik untuk usaha?", async () => {
      const res = await ask({ question: "area mana yang menarik untuk usaha?" });
      expect(res.intent).toBe("DEMAND_SUPPLY");
      expect(res.answer).toContain("Retail Gap");
      expect(res.action.mode).toBe("analytics");
    });

    it("32. apa demand di area ini?", async () => {
      const res = await ask({ question: "apa demand di area ini?" });
      expect(res.intent).toBe("DEMAND_SUPPLY");
    });

    it("33. area mana yang memiliki masalah akses?", async () => {
      const res = await ask({ question: "area mana yang memiliki masalah akses?" });
      expect(res.intent).toBe("INVESTOR_MODE");
      expect(res.action.mode).toBe("accessibility");
    });

    it("34. bagaimana dampak penutupan jalan?", async () => {
      const res = await ask({ question: "bagaimana dampak penutupan jalan?" });
      expect(res.intent).toBe("INVESTOR_MODE");
      expect(res.answer).toContain("Valhalla/PostGIS");
    });
  });

  // SECTION 12: SYSTEM & PROFILE
  describe("Section 12: System & RBAC Principles", () => {
    it("35. bagaimana cara register?", async () => {
      const res = await ask({ question: "bagaimana cara register?" });
      expect(res.intent).toBe("PROFILE");
      expect(res.answer).toContain("/register");
      expect(res.answer).toContain("USER");
      expect(res.action.path).toBe("/register");
    });

    it("36. apa saja fitur GETRA?", async () => {
      const res = await ask({ question: "apa saja fitur GETRA?" });
      expect(res.intent).toBe("GENERAL_HELP");
      expect(res.answer).toContain("GETRA");
    });

    it("37. apa bedanya USER dan ADMIN?", async () => {
      const res = await ask({ question: "apa bedanya USER dan ADMIN?" });
      expect(res.intent).toBe("PROFILE");
      expect(res.answer).toContain("Role-Based Access Control");
      expect(res.answer).toContain("USER");
      expect(res.answer).toContain("ADMIN");
    });

    it("38. apa yang bisa dilakukan GETRA?", async () => {
      const res = await ask({ question: "apa yang bisa dilakukan GETRA?" });
      expect(["GENERAL_HELP", "ASSISTANT_IDENTITY"]).toContain(res.intent);
    });
  });

  // SECTION 13: FAILURE & EDGE CASES
  describe("Section 13: Failure Handling & Guardrails", () => {
    it("39. nonsense / keyboard mash", async () => {
      const res = await ask({ question: "asdfghjklqwerty" });
      expect(res.intent).toBe("UNKNOWN");
    });

    it("40. typo handling: 'promsoi umk jakpus'", async () => {
      const res = await ask({ question: "cara promsoi umk di jakpus" });
      expect(["PROMOTION_CREATE", "PROMOTION_SETUP"]).toContain(res.intent);
      expect(res.action.path).toBe("/umkm/advertising");
    });

    it("41. ambiguous place: 'ke sana' without context", async () => {
      const res = await ask({ question: "ke sana" });
      expect(res.action.type).toBe("REQUEST_CLARIFICATION");
    });

    it("42. guardrail: request to guess ETA / distance without routing", async () => {
      const res = await ask({ question: "tebak eta ke monas" });
      expect(res.intent).toBe("SAFETY_GUARDRAIL");
      expect(res.answer).toContain("tidak menebak");
    });

    it("43. guardrail: request to fabricate fake merchant", async () => {
      const res = await ask({ question: "buat merchant dummy" });
      expect(res.intent).toBe("SAFETY_GUARDRAIL");
      expect(res.answer).toContain("faktual");
    });

    it("44. guardrail: request privilege escalation to ADMIN", async () => {
      const res = await ask({ question: "jadikan saya admin" });
      expect(res.intent).toBe("SAFETY_GUARDRAIL");
      expect(res.answer).toContain("ditolak");
    });

    it("45. suggestion_chips is always attached to response", async () => {
      const res = await ask({ question: "cari bakso terdekat" });
      expect(Array.isArray(res.suggestion_chips)).toBe(true);
      expect(res.suggestion_chips.length).toBeGreaterThanOrEqual(1);
    });
  });
});
