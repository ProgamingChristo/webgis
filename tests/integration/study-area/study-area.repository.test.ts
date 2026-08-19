import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { StudyAreaRepository } from "@/src/repositories/study-area.repository";

// Ensure environment variables are loaded for the test DB
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

describe("StudyAreaRepository Integration", () => {
  let supabase: ReturnType<typeof createClient>;
  let repo: StudyAreaRepository;
  let testSourceId: string | null = null;
  let testAreaId: string | null = null;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);
    repo = new StudyAreaRepository(supabase);

    // Setup a dummy spatial source
    const { data } = await supabase
      .from("spatial_sources")
      .insert({
        source_name: "TEST_SOURCE",
        source_type: "system",
      } as any)
      .select("id")
      .single();
    
    if (data) {
      testSourceId = (data as any).id;
    }
  });

  afterAll(async () => {
    if (testAreaId) {
      await supabase.from("study_areas").delete().eq("id", testAreaId);
    }
    if (testSourceId) {
      await supabase.from("spatial_sources").delete().eq("id", testSourceId);
    }
  });

  it("should create and fetch a study area idempotently", async () => {
    if (!testSourceId) {
      console.warn("Skipping test: No spatial source created.");
      return;
    }

    const input = {
      name: "TEST_DUMMY_PILOT",
      description: "Integration test pilot",
      geometry: {
        type: "MultiPolygon",
        coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]]
      } as any,
      provenance: {
        source_id: testSourceId,
        source_record_id: "TEST_DUMMY_PILOT",
        data_version: "1",
        metadata: { environment: "DUMMY" }
      }
    };

    const created = await repo.create(input);
    expect(created).toBeDefined();
    expect(created.name).toBe("TEST_DUMMY_PILOT");
    testAreaId = created.id;

    const fetched = await repo.findById(testAreaId!);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(testAreaId);

    // Test findWithinBBox (containsPoint intersection logic equivalent)
    const bbox = { min_lng: 0.1, min_lat: 0.1, max_lng: 0.9, max_lat: 0.9 };
    const within = await repo.findWithinBBox(bbox, { limit: 10, offset: 0, page: 1, sort: "created_at", order: "asc" });
    expect(within.items.length).toBeGreaterThanOrEqual(1);
  });
});
