import { IngestionPipelineService } from "@/src/modules/ingestion/services/ingestion-pipeline.service";
import { ImportJobRepository } from "@/src/modules/ingestion/repositories/import-job.repository";
import { DataSourceRepository } from "@/src/modules/ingestion/repositories/data-source.repository";
import { MapidIngestionAdapter } from "@/src/modules/ingestion/adapters/mapid.ingestion-adapter";
import { MapidClient } from "@/src/integrations/mapid/mapid.client";
import { loadMapidProviderConfig } from "@/src/integrations/mapid/mapid.config";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

async function run() {
  const isDryRun = process.argv.includes("--dry-run");
  const isApply = process.argv.includes("--apply");

  if (!isDryRun && !isApply) {
    console.error("Usage: npx tsx run-mapid-ingestion.ts [--dry-run | --apply]");
    process.exit(1);
  }

  console.log(`Starting MAPID Ingestion (Dry Run: ${isDryRun})`);

  const supabase = getServiceRoleSupabaseClient();
  const importJobRepo = new ImportJobRepository(supabase);
  const dataSourceRepo = new DataSourceRepository(supabase);
  const pipeline = new IngestionPipelineService(importJobRepo, dataSourceRepo);

  // 1. Ensure MAPID data source exists
  let dataSource = await dataSourceRepo.findByCode("MAPID");
  if (!dataSource) {
    dataSource = await dataSourceRepo.create({
      code: "MAPID",
      name: "MAPID API Provider",
      environment: "DEV"
    });
  }

  // 2. Configure Adapter
  const config = {
    apiKey: "mock-api-key",
    baseUrl: "http://localhost:8081",
    retry: { baseDelayMs: 250, maxAttempts: 3 },
    timeoutMs: 10000
  };
  // Using a mock authentication strategy
  const mockAuth = {
    apply: (headers: Headers, key: string) => {
      headers.set("Authorization", `Bearer ${key}`);
    }
  };
  const client = new MapidClient(config, mockAuth);
  const adapter = new MapidIngestionAdapter(client, dataSource.id);

  // 3. Start Job
  let job = await pipeline.startJob({
    data_source_id: "MAPID",
    environment: "DEV",
    is_dry_run: isDryRun
  });

  console.log(`Job Created: ${job.id}`);

  // 4. Execute Pipeline
  job = await pipeline.execute(job, adapter);

  console.log(`Job Finished: ${job.status}`);
  console.log(`Metrics:`, job.metrics);
  if (job.error_log) {
    console.error("Errors:", JSON.stringify(job.error_log, null, 2));
  }
}

run().catch((err) => {
  console.error("Critical Failure:", err);
  process.exit(1);
});
