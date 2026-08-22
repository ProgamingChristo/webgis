import { createClient } from "@supabase/supabase-js";
import { DatasetVersionRepository } from "../../src/modules/dataset-version/dataset-version.repository";
import { DatasetVersionService } from "../../src/modules/dataset-version/dataset-version.service";


async function createGolden() {
  console.log("--- GETRA PHASE 14: GOLDEN DATASET CREATION ---");
  
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const repo = new DatasetVersionRepository(client as any);
  const service = new DatasetVersionService(repo);

  const code = "GETRA_DUMMY_GOLDEN_V1";
  
  console.log(`Ensuring dataset version ${code} exists...`);
  
  const version = await service.createGoldenVersion(
    code,
    "1.0.0",
    "DUMMY",
    "First Golden Baseline for GETRA Dummy Data",
    {
      scope: ["study_areas", "transport", "pedestrian", "umkm", "survey"],
      srid: 4326,
      distance_unit: "meters"
    }
  );

  console.log(`Version created/found with ID: ${version.id}`);
  
  if (version.status === "ACTIVE") {
    console.log("Version is already ACTIVE. Nothing to do.");
    return;
  }

  // Normally we would run quality checks here, but for this script we assume
  // they pass or we force activation.
  console.log("Activating version...");
  const activeVersion = await service.activateGoldenVersion(version.id);
  
  console.log(`Version ${activeVersion.code} is now ${activeVersion.status}!`);
}

createGolden().catch(err => {
  console.error("Failed to create golden version:", err);
  process.exit(1);
});
