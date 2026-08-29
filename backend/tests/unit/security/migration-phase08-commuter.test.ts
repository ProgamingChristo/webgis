import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase08 = [
  "20260828110000_phase08_network_commuter.sql",
  "20260828113000_phase08_graph_components.sql",
  "20260828114000_phase08_component_aware_costs.sql",
].map((name) => readFileSync(resolve(process.cwd(), "supabase/migrations", name), "utf8")).join("\n");

describe("Phase 08 routing migration", () => {
  it("uses pgRouting and a single documented walking speed", () => {
    expect(phase08).toContain("pgr_dijkstra");
    expect(phase08).toContain("pgr_drivingDistance");
    expect(phase08).toContain("walking_speed_mps', 1.4");
  });

  it("bounds snap distance and protects graph functions from anonymous callers", () => {
    expect(phase08).toContain("p_max_snap_meters > 200");
    expect(phase08).toContain("from public, anon");
    expect(phase08).toContain("grant execute");
  });

  it("persists component evidence without deleting graph nodes or edges", () => {
    expect(phase08).toContain("pedestrian_graph_components");
    expect(phase08).not.toMatch(/truncate\s+(?:table\s+)?public\.pedestrian_(?:nodes|edges)/i);
    expect(phase08).not.toMatch(/delete\s+from\s+public\.pedestrian_(?:nodes|edges)/i);
  });
});
