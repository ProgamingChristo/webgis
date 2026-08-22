import { createClient } from "@supabase/supabase-js";
import { DataQualityRepository } from "../../src/modules/data-quality/data-quality.repository";
import { QualityCheckRunner } from "../../src/modules/data-quality/quality-check.runner";
import { EnvironmentConsistencyCheck } from "../../src/modules/data-quality/environment.check";


async function runChecks() {
  console.log("--- GETRA PHASE 14: QUALITY CHECK RUNNER ---");
  
  if (!process.argv[2]) {
    console.error("Please provide a dataset_version_id as an argument.");
    process.exit(1);
  }

  const datasetVersionId = process.argv[2];
  
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const repo = new DataQualityRepository(client as any);
  
  const tablesToCheck = [
    "study_areas",
    "transport_nodes",
    "transport_corridors",
    "transport_route_stops",
    "pedestrian_nodes",
    "pedestrian_edges",
    "umkm_profiles",
    "pois",
    "surveys",
    "survey_responses",
  ];

  const checkers = [
    new EnvironmentConsistencyCheck(client as any, "DUMMY", tablesToCheck)
  ];

  const runner = new QualityCheckRunner(repo, checkers);

  console.log(`Starting quality run for version ${datasetVersionId}...`);
  const result = await runner.runAll(datasetVersionId, "DUMMY");
  
  console.log(`Run complete! Status: ${result.status}`);
  console.log(`Passed: ${result.passed_checks}`);
  console.log(`Failed: ${result.failed_checks} (${result.critical_failures} critical)`);
  console.log(`Warnings: ${result.warning_checks}`);
}

runChecks().catch(err => {
  console.error("Check runner failed:", err);
  process.exit(1);
});
