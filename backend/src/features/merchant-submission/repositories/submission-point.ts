import { ApplicationError } from "@/src/lib/errors";
import { pointGeometrySchema } from "@/src/schemas/spatial.schema";

/** Decode the existing geometry(Point, 4326) column without substituting a location. */
export function parseSubmissionPoint(value: unknown): { type: "Point"; coordinates: [number, number] } {
  let point: unknown = value;
  if (typeof value === "string") {
    const serialized = value.trim();
    if (serialized.startsWith("{")) {
      try { point = JSON.parse(serialized); } catch { point = null; }
    } else {
      const number = "([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?)";
      const wkt = new RegExp(`^(?:SRID=4326;)?POINT\\s*\\(\\s*${number}\\s+${number}\\s*\\)$`, "i").exec(serialized);
      point = wkt
        ? { type: "Point", coordinates: [Number(wkt[1]), Number(wkt[2])] }
        : decodePointBinary(serialized);
    }
  }
  const parsed = pointGeometrySchema.safeParse(point);
  if (!parsed.success) {
    throw new ApplicationError("DATABASE_ERROR", "Lokasi pengajuan belum dapat dibaca. Muat ulang atau hubungi admin untuk memeriksa lokasi usaha.");
  }
  return parsed.data;
}

function decodePointBinary(serialized: string): unknown {
  const hex = serialized.replace(/^\\x/i, "");
  // The column is a two-dimensional point: WKB is 21 bytes, EWKB with SRID is 25.
  if (!/^(?:[0-9a-f]{42}|[0-9a-f]{50})$/i.test(hex)) return null;
  const bytes = Buffer.from(hex, "hex");
  if (bytes[0] !== 0 && bytes[0] !== 1) return null;
  const littleEndian = bytes[0] === 1;
  const type = littleEndian ? bytes.readUInt32LE(1) : bytes.readUInt32BE(1);
  if (type !== 1 && type !== 0x20000001) return null;
  const hasSrid = type === 0x20000001;
  if (bytes.length !== (hasSrid ? 25 : 21)) return null;
  if (hasSrid && (littleEndian ? bytes.readUInt32LE(5) : bytes.readUInt32BE(5)) !== 4326) return null;
  const offset = hasSrid ? 9 : 5;
  return {
    type: "Point",
    coordinates: littleEndian
      ? [bytes.readDoubleLE(offset), bytes.readDoubleLE(offset + 8)]
      : [bytes.readDoubleBE(offset), bytes.readDoubleBE(offset + 8)],
  };
}
