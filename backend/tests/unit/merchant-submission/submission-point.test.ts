import { describe, expect, it, vi } from "vitest";
import { parseSubmissionPoint } from "@/src/features/merchant-submission/repositories/submission-point";
import { MerchantSubmissionRepository } from "@/src/features/merchant-submission/repositories/merchant-submission.repository";

function binaryPoint(littleEndian: boolean, srid?: number) {
  const bytes = Buffer.alloc(srid === undefined ? 21 : 25);
  bytes[0] = littleEndian ? 1 : 0;
  if (littleEndian) {
    bytes.writeUInt32LE(srid === undefined ? 1 : 0x20000001, 1);
    if (srid !== undefined) bytes.writeUInt32LE(srid, 5);
    bytes.writeDoubleLE(106.75, srid === undefined ? 5 : 9);
    bytes.writeDoubleLE(-6.25, srid === undefined ? 13 : 17);
  } else {
    bytes.writeUInt32BE(srid === undefined ? 1 : 0x20000001, 1);
    if (srid !== undefined) bytes.writeUInt32BE(srid, 5);
    bytes.writeDoubleBE(106.75, srid === undefined ? 5 : 9);
    bytes.writeDoubleBE(-6.25, srid === undefined ? 13 : 17);
  }
  return bytes.toString("hex");
}

describe("Submission geometry preservation", () => {
  it.each([
    { type: "Point", coordinates: [106.75, -6.25] },
    '{"type":"Point","coordinates":[106.75,-6.25]}',
    "POINT(106.75 -6.25)",
    "SRID=4326;POINT(1.0675e2 -6.25)",
    binaryPoint(true), binaryPoint(false), binaryPoint(true, 4326), `\\x${binaryPoint(false, 4326)}`,
  ])("preserves the stored location from supported PostGIS and GeoJSON representations", (value) => {
    expect(parseSubmissionPoint(value)).toEqual({ type: "Point", coordinates: [106.75, -6.25] });
  });

  it.each([
    null, undefined, "", "unreadable-geometry", "POINT EMPTY", "POINT(200 -6.25)", "SRID=3857;POINT(106.75 -6.25)",
    { type: "Point", coordinates: [NaN, -6.25] }, binaryPoint(true, 3857), binaryPoint(true, 4326).slice(0, -2),
  ])("rejects unavailable or invalid locations instead of inventing Jakarta coordinates", (value) => {
    expect(() => parseSubmissionPoint(value)).toThrow("Lokasi pengajuan belum dapat dibaca");
  });

  it("round-trips an EWKB draft location through edit without moving the business", async () => {
    const row = { id: "draft", submitted_by: "owner", status: "DRAFT", location: binaryPoint(true, 4326) };
    const update = vi.fn().mockReturnThis();
    const builder = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), update,
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    };
    const repository = new MerchantSubmissionRepository({ from: vi.fn(() => builder) } as never);
    const draft = await repository.findById("draft");
    await repository.updateDraft("draft", "owner", { name: "Nama diperbarui", location: draft!.location });
    expect(update).toHaveBeenCalledWith({ name: "Nama diperbarui", location: "SRID=4326;POINT(106.75 -6.25)" });
  });
});
