import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database.types";
import { DataSourceRepository } from "@/src/modules/ingestion/repositories/data-source.repository";
import { ImportJobRepository } from "@/src/modules/ingestion/repositories/import-job.repository";
import { TransportCorridorRepository } from "@/src/repositories/transport-corridor.repository";
import { createSpatialService } from "@/src/modules/spatial/spatial.service";
import { loadSpatialConfig } from "@/src/modules/spatial/spatial.config";
import type { ImportJobStatus } from "@/src/modules/ingestion/ingestion.types";
import type { MultiLineStringGeometry } from "@/src/types/spatial";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);
const dataSourceRepo = new DataSourceRepository(supabase);
const importJobRepo = new ImportJobRepository(supabase);
const transportCorridorRepo = new TransportCorridorRepository(supabase);
const spatialConfig = loadSpatialConfig();
const spatialService = createSpatialService(supabase, spatialConfig);

async function main() {
  console.log("Starting Phase 10 Transport Corridors Import...");

  try {
    const dataSource = await dataSourceRepo.findByCode("PHASE_09_DUMMY_PILOT");
    if (!dataSource) {
      throw new Error("Data Source PHASE_09_DUMMY_PILOT not found. Run phase 09 first.");
    }

    const { data: spatialSource, error: spatialError } = await supabase
      .from("spatial_sources")
      .select("*")
      .eq("source_name", "GETRA_INTERNAL")
      .maybeSingle();

    if (spatialError || !spatialSource) {
      throw new Error("Spatial Source GETRA_INTERNAL not found.");
    }

    const importJob = await importJobRepo.create({
      data_source_id: dataSource.id,
      environment: dataSource.environment,
      metadata: { total_records: 0 } as any,
    });

    console.log(`Import Job created: ${importJob.id}`);
    await importJobRepo.update(importJob.id, { status: "RUNNING" as ImportJobStatus });

    const geoJsonPath = path.join(process.cwd(), "tests/fixtures/phase-10/transport-corridors.valid.json");
    const geoJsonRaw = await fs.readFile(geoJsonPath, "utf-8");
    const featureCollection = JSON.parse(geoJsonRaw);

    let total = 0;
    let valid = 0;
    let inserted = 0;
    let updated = 0;
    let invalid = 0;

    for (const feature of featureCollection.features) {
      total++;
      
      const properties = feature.properties;
      const geometry = feature.geometry;

      try {
        const srid = await spatialService.validateGeometry(geometry);
        if (srid !== 4326) {
          throw new Error(`Invalid SRID: ${srid}`);
        }
        valid++;

        const { data: existing, error: findError } = await supabase
          .from("transport_corridors")
          .select("id")
          .eq("source_id", spatialSource.id)
          .eq("source_record_id", properties.source_record_id)
          .maybeSingle();

        if (findError) throw findError;

        if (existing) {
          await transportCorridorRepo.update(existing.id, {
            name: properties.name,
            transport_mode: properties.transport_mode,
            description: properties.description,
            geometry: geometry as MultiLineStringGeometry,
            provenance: {
              data_version: "1",
              metadata: { environment: "DUMMY" }
            }
          });
          updated++;
        } else {
          await transportCorridorRepo.create({
            name: properties.name,
            transport_mode: properties.transport_mode,
            description: properties.description,
            geometry: geometry as MultiLineStringGeometry,
            provenance: {
              source_id: spatialSource.id,
              source_record_id: properties.source_record_id,
              data_version: "1",
              metadata: { environment: "DUMMY" }
            }
          });
          inserted++;
        }
      } catch (err) {
        console.error(`Validation/Insert failed for feature ${properties.name}:`, err);
        invalid++;
      }
    }

    await importJobRepo.update(importJob.id, {
      status: "COMPLETED" as ImportJobStatus,
      completed_at: new Date().toISOString(),
      metrics: {
        total_records: total,
        processed_records: valid,
        failed_records: invalid,
        inserted_records: inserted,
        updated_records: updated,
      }
    });

    console.log("\nGETRA PHASE 10 — TRANSPORT CORRIDORS FINAL REPORT");
    console.log("STATUS: COMPLETED");
    console.log(`RECORD COUNT: total=${total} valid=${valid} inserted=${inserted} updated=${updated} invalid=${invalid}`);
    console.log(`IMPORT JOB ID: ${importJob.id}`);
    
  } catch (error) {
    console.error("Error importing transport corridors:", error);
    process.exit(1);
  }
}

main();
