import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { StudyAreaRepository } from "@/src/repositories/study-area.repository";

// Integration test membutuhkan Supabase credential.
// Jika credential tidak tersedia, seluruh suite dilewati.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "http://127.0.0.1:54321";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseKey);

const describeIntegration = hasSupabaseCredentials
  ? describe
  : describe.skip;

describeIntegration("StudyAreaRepository Integration", () => {
  let supabase: ReturnType<typeof createClient>;
  let repo: StudyAreaRepository;

  let testSourceId: string | null = null;
  let testAreaId: string | null = null;

  beforeAll(async () => {
    supabase = createClient(
      supabaseUrl,
      supabaseKey!
    );

    repo = new StudyAreaRepository(supabase);

    // Setup dummy spatial source
const { data, error } = await supabase
  .from("spatial_sources")
  .insert({
    source_name: "TEST_SOURCE",
    source_type: "system",
  } as any)
  .select("id")
  .single();

if (error) {
  throw new Error(
    `Failed to create integration test spatial source: ${error.message}`
  );
}

const source = data as { id: string } | null;

if (!source?.id) {
  throw new Error(
    "Integration test spatial source was created without an id."
  );
}

testSourceId = source.id;
  });

  afterAll(async () => {
    if (!supabase) {
      return;
    }

    if (testAreaId) {
      const { error } = await supabase
        .from("study_areas")
        .delete()
        .eq("id", testAreaId);

      if (error) {
        console.warn(
          `Failed to clean up test study area: ${error.message}`
        );
      }
    }

    if (testSourceId) {
      const { error } = await supabase
        .from("spatial_sources")
        .delete()
        .eq("id", testSourceId);

      if (error) {
        console.warn(
          `Failed to clean up test spatial source: ${error.message}`
        );
      }
    }
  });

  it("should create and fetch a study area idempotently", async () => {
    expect(testSourceId).not.toBeNull();

    const input = {
      name: "TEST_DUMMY_PILOT",
      description: "Integration test pilot",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        ],
      } as any,
      provenance: {
        source_id: testSourceId!,
        source_record_id: "TEST_DUMMY_PILOT",
        data_version: "1",
        metadata: {
          environment: "DUMMY",
        },
      },
    };

    const created = await repo.create(input);

    expect(created).toBeDefined();
    expect(created.name).toBe("TEST_DUMMY_PILOT");

    testAreaId = created.id;

    const fetched = await repo.findById(testAreaId);

    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(testAreaId);

    const bbox = {
      min_lng: 0.1,
      min_lat: 0.1,
      max_lng: 0.9,
      max_lat: 0.9,
    };

    const within = await repo.findWithinBBox(bbox, {
      limit: 10,
      offset: 0,
      page: 1,
      sort: "created_at",
      order: "asc",
    });

    expect(within.items.length).toBeGreaterThanOrEqual(1);
  });
});