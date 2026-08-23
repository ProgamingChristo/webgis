import "server-only";

import { MapidClient } from "@/src/integrations/mapid/mapid.client";
import { MapidTestFixtureResponseValidator } from "@/src/integrations/mapid/mapid.schema";
import { MapidTestFixtureNormalizer } from "@/src/integrations/mapid/mapid.normalizer";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";
import type { IngestionAdapter } from "../contracts/ingestion-adapter.interface";
import type { ImportJob } from "../ingestion.types";
import type { MapidNormalizedRecord, MapidRequestContext } from "@/src/integrations/mapid/mapid.types";

export class MapidIngestionAdapter implements IngestionAdapter<any> {
  readonly sourceCode = "MAPID";
  
  private validator = new MapidTestFixtureResponseValidator();
  private normalizer = new MapidTestFixtureNormalizer();

  constructor(private client: MapidClient, private dataSourceId: string) {}

  validateRaw(record: any): any {
    // We validate the entire batch later, or record by record.
    // For this generic interface we return the record and we will validate properly in normalize.
    return record;
  }

  async normalize(record: any): Promise<MapidNormalizedRecord | null> {
    const context: MapidRequestContext = {
      data_version: "PHASE-6-V2",
      request_id: "ingestion-" + Date.now(),
      retrieved_at: new Date().toISOString(),
      source_id: this.dataSourceId
    };

    // Note: Our validator expects a batch. We simulate a batch of 1.
    const validated = this.validator.validate({
      _fixture: "TEST FIXTURE - NOT REAL MAPID PRODUCTION DATA",
      contract: "GETRA_MAPID_TEST_FIXTURE_V1",
      records: [record]
    });
    
    if (validated.invalid_records.length > 0) {
      throw new Error(`Record invalid: ${validated.invalid_records[0].reason}`);
    }

    const normalizedBatch = this.normalizer.normalize({ context, validated });
    return normalizedBatch.records.length > 0 ? normalizedBatch.records[0] : null;
  }

  async *fetchRecords(_job: ImportJob): AsyncGenerator<unknown, void, unknown> {
    void _job;

    const response = await this.client.request({
      path: "/mock-activity", // Hit mock server
      method: "GET"
    });
    
    // The mock server returns the validResponseFixture structure.
    const rawData = response as any;
    if (rawData && Array.isArray(rawData.records)) {
      for (const record of rawData.records) {
        yield record;
      }
    }
  }

  async upsert(normalizedRecord: MapidNormalizedRecord): Promise<boolean> {
    const supabase = getServiceRoleSupabaseClient();
    
    // 1. Raw evidence upsert (deduplication via unique external_record_id)
    const rawUpsert = await supabase.from("raw_mapid_evidence").upsert({
      external_record_id: normalizedRecord.source_record_id,
      activity_type: normalizedRecord.entity_kind,
      raw_payload: normalizedRecord, // Using normalized as raw for simplicity in this slice
      provider_timestamp: normalizedRecord.retrieved_at,
      retrieved_at: new Date().toISOString()
    }, { onConflict: "external_record_id" }).select("id").single();

    if (rawUpsert.error) {
      throw new Error(`Raw Upsert Error: ${rawUpsert.error.message}`);
    }

    const rawId = rawUpsert.data.id;

    // 2. Staging upsert
    const stagingUpsert = await supabase.from("staging_mapid_activities").upsert({
      raw_evidence_id: rawId,
      normalized_metadata: normalizedRecord.metadata,
      validation_status: normalizedRecord.validation_status
    }, { onConflict: "raw_evidence_id" });

    if (stagingUpsert.error) {
      throw new Error(`Staging Upsert Error: ${stagingUpsert.error.message}`);
    }

    return true; // We always upsert in this slice, duplicate tracking depends on caller knowing if it was inserted/updated.
  }
}
