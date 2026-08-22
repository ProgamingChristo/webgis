import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";
import { TransportNodeCanonicalMapper } from "@/src/modules/transport-node/mappers/transport-node.canonical-mapper";

async function run() {
  const isDryRun = process.argv.includes("--dry-run");
  const isApply = process.argv.includes("--apply");

  if (!isDryRun && !isApply) {
    console.error("Usage: npx tsx run-canonical-mapping.ts [--dry-run | --apply]");
    process.exit(1);
  }

  console.log(`Starting Canonical Data Mapping (Dry Run: ${isDryRun})`);

  const supabase = getServiceRoleSupabaseClient();
  const mapper = new TransportNodeCanonicalMapper(supabase);

  // 1. Fetch all pending or available staging records for transport_node
  const { data: stagingRecords, error: fetchError } = await supabase
    .from("staging_mapid_activities")
    .select(`
      id,
      raw_mapid_evidence!inner (
        raw_payload
      )
    `);

  if (fetchError) {
    console.error("Failed to fetch staging records", fetchError);
    process.exit(1);
  }

  const transportNodeRecords = stagingRecords.filter((record: any) => 
    record.raw_mapid_evidence?.raw_payload?.entity_kind === "transport_node"
  );

  console.log(`Found ${transportNodeRecords.length} transport_node staging records.`);

  // 1.5 Ensure spatial_source exists for these records
  for (const record of transportNodeRecords) {
    const sourceId = record.raw_mapid_evidence.raw_payload.source_id;
    if (sourceId) {
      await supabase.from("spatial_sources").upsert({
        id: sourceId,
        source_name: "MAPID Test Source",
        source_type: "external"
      });
    }
  }

  if (isDryRun) {
    console.log("Dry run complete. No data was mutated.");
    return;
  }

  // 2. Map and Apply
  let successes = 0;
  let failures = 0;

  for (const stagingRecord of transportNodeRecords) {
    try {
      const result = await mapper.mapStagingActivity(stagingRecord.id);
      console.log(`Successfully mapped staging ${stagingRecord.id} -> canonical transport_node ${result.entity.id}`);
      successes++;
    } catch (e: any) {
      console.error(`Failed to map staging ${stagingRecord.id}:`, e.message);
      failures++;
    }
  }

  console.log(`Mapping Run Finished. Success: ${successes}, Failures: ${failures}`);
}

run().catch((err) => {
  console.error("Critical Failure:", err);
  process.exit(1);
});
