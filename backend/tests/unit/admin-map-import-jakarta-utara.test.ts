import { describe, expect, it } from "vitest";
import { JAKARTA_ADMIN_BOUNDARY_REGISTRY } from "../../../data/jakarta-admin-boundaries";

describe("Admin Map Import - Jakarta Utara Boundary & Region Detection", () => {
  it("has curated Jakarta Utara boundary in registry", () => {
    const boundary = JAKARTA_ADMIN_BOUNDARY_REGISTRY["jakarta-utara"];
    expect(boundary).toBeDefined();
    expect(boundary.id).toBe("jakarta-utara");
    expect(boundary.name).toBe("Jakarta Utara");
    expect(boundary.geometry.type).toBe("MultiPolygon");
    expect(boundary.geometry.coordinates.length).toBeGreaterThan(0);
  });

  it("detects Jakarta Utara from layer name and Indonesian administrative metadata", () => {
    function detectJakartaAdminRegionName(...candidates: Array<string | undefined>) {
      const combined = candidates
        .filter((candidate): candidate is string => Boolean(candidate?.trim()))
        .join(" ")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      if (/\bjakarta\s*timur\b|\bjakarta\s*tim\b|\bjatim\b/.test(combined)) {
        return "Jakarta Timur";
      }
      if (/\bjakarta\s*pusat\b|\bjakarta\s*pus\b|\bjakpus\b/.test(combined)) {
        return "Jakarta Pusat";
      }
      if (/\bjakarta\s*selatan\b|\bjakarta\s*sel\b|\bjaksel\b/.test(combined)) {
        return "Jakarta Selatan";
      }
      if (/\bjakarta\s*barat\b|\bjakarta\s*bar\b|\bjakbar\b/.test(combined)) {
        return "Jakarta Barat";
      }
      if (/\bjakarta\s*utara\b|\bjakarta\s*ut\b|\bjakut\b/.test(combined)) {
        return "Jakarta Utara";
      }
      return null;
    }

    expect(detectJakartaAdminRegionName("KOTA ADM  JAKARTA UTARA", "PENJARINGAN", "DKI JAKARTA")).toBe("Jakarta Utara");
    expect(detectJakartaAdminRegionName(undefined, undefined, undefined, "jakarta utara")).toBe("Jakarta Utara");
    expect(detectJakartaAdminRegionName("KOTA ADM JAKARTA UTARA")).toBe("Jakarta Utara");
  });
});
