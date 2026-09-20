import type { Geometry, Position } from "geojson";
import type { InternationalResult, DataQuality } from "@/types/international";

function position(p: Position) { return p.length >= 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90; }
function geometry(g: Geometry): boolean {
  if (!g) return false;
  switch (g.type) {
    case "Point": return position(g.coordinates);
    case "MultiPoint": return g.coordinates.length > 0 && g.coordinates.every(position);
    case "LineString": return g.coordinates.length >= 2 && g.coordinates.every(position);
    case "MultiLineString": return g.coordinates.length > 0 && g.coordinates.every(c => c.length >= 2 && c.every(position));
    case "Polygon": return g.coordinates.length > 0 && g.coordinates.every(c => c.length >= 4 && c.every(position) && c[0][0] === c.at(-1)![0] && c[0][1] === c.at(-1)![1]);
    case "MultiPolygon": return g.coordinates.length > 0 && g.coordinates.every(c => geometry({ type: "Polygon", coordinates: c }));
    case "GeometryCollection": return g.geometries.length > 0 && g.geometries.every(geometry);
    default: return false;
  }
}
/** Validate before data reaches GIS or AI. Unknown timestamps remain unknown. */
export function assessQuality(result: InternationalResult, now = Date.now()): InternationalResult {
  const original = result.data.features;
  const features = original.filter(f => {
    const p = f.properties;
    return geometry(f.geometry) && p && [p.name, p.source, p.dataset, p.license].every(s => typeof s === "string" && s.trim()) &&
      (p.timestamp === null || Number.isFinite(Date.parse(p.timestamp)) && Date.parse(p.timestamp) <= now + 300000);
  });
  const rejected = original.length - features.length;
  const unknown = features.filter(f => f.properties.timestamp === null).length;
  const stale = result.status === "STALE" || features.some(f => f.properties.freshness === "STALE");
  const quality: DataQuality = {
    status: !result.fetched_at ? "UNAVAILABLE" : original.length > 0 && !features.length ? "INVALID" : stale ? "STALE" : rejected || unknown || result.truncated ? "PARTIAL" : "FRESH",
    freshness: stale ? "STALE" : result.last_updated === null ? "UNKNOWN" : "FRESH",
    completeness: features.length ? (features.length - unknown) / features.length : null,
    validity: original.length ? features.length / original.length : null,
    source_reliability: "PROVIDER_REPORTED",
    timestamp_quality: features.length === 0 ? "NO_RECORDS" : unknown === 0 ? "PRESENT" : unknown === features.length ? "UNKNOWN" : "PARTIAL",
    accepted_records: features.length, rejected_records: rejected,
  };
  return { ...result, status: quality.status === "INVALID" ? "ERROR" : result.status, message: quality.status === "INVALID" ? "Data sumber tidak lolos validasi; tidak ditampilkan pada peta." : result.message, quality, data: { ...result.data, features }, warnings: rejected ? [...result.warnings, `${rejected} catatan tidak valid disembunyikan.`] : result.warnings };
}
