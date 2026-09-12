import { describe, expect, it } from "vitest";
import {
  classifyEntityQuery,
  entityRetrievalTerms,
  resolveEntityCandidates,
} from "@/types/entity-resolution";

const entities = [
  { id: "1", name: "Kopi Tuku Cipete" },
  { id: "2", name: "Apotek Roxy Manggarai" },
  { id: "3", name: "Stasiun Manggarai" },
  { id: "4", name: "Kopi Tuku Tebet" },
];

describe("general entity resolution", () => {
  it.each([
    ["tolong carikan Kopi Tuku Cipete", "1"],
    ["Apotek Roksi Manggarai", "2"],
    ["rute menuju Stasiun Mangarai", "3"],
  ])("resolves fillers, categories, and conservative typos: %s", (query, id) => {
    const result = resolveEntityCandidates(query, entities, (entity) => entity.name);
    expect(result.status).toBe("RESOLVED");
    if (result.status === "RESOLVED") expect(result.candidate.value.id).toBe(id);
  });

  it("keeps similarly named branches ambiguous", () => {
    const result = resolveEntityCandidates("Kopi Tuku", entities, (entity) => entity.name);
    expect(result.status).toBe("AMBIGUOUS");
  });

  it("separates discovery from a named place", () => {
    expect(classifyEntityQuery("cari yang enak dekat sini")).toBe("DISCOVERY");
    expect(classifyEntityQuery("Perumahan Taman Anggrek Residence")).toBe("PLACE");
    expect(classifyEntityQuery("Kopi Tuku Cipete")).toBe("ENTITY");
    expect(entityRetrievalTerms("tolong carikan Apotek Roxy Manggarai")).toContain("manggarai");
  });
});
