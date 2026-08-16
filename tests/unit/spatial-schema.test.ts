import { describe, expect, it } from "vitest";

import {
  corridorGeometrySchema,
  multiPolygonGeometrySchema,
  pointGeometrySchema,
} from "@/src/schemas/spatial.schema";

describe("spatial input schemas", () => {
  it("accepts WGS84 point and corridor inputs", () => {
    expect(
      pointGeometrySchema.parse({ type: "Point", coordinates: [106.8, -6.2] }),
    ).toEqual({ type: "Point", coordinates: [106.8, -6.2] });

    expect(
      corridorGeometrySchema.parse({
        type: "LineString",
        coordinates: [
          [106.8, -6.2],
          [106.81, -6.21],
        ],
      }).type,
    ).toBe("LineString");
  });

  it("rejects coordinates outside WGS84 bounds", () => {
    expect(() =>
      pointGeometrySchema.parse({ type: "Point", coordinates: [181, -6.2] }),
    ).toThrow();
  });

  it("rejects an open polygon ring before it reaches PostGIS", () => {
    expect(() =>
      multiPolygonGeometrySchema.parse({
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
            ],
          ],
        ],
      }),
    ).toThrow("A polygon ring must be closed");
  });
});
