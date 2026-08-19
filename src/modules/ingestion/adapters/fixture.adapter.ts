import type { IngestionAdapter } from "../contracts/ingestion-adapter.interface";
import type { ImportJob } from "../ingestion.types";

export interface FixtureRawRecord {
  id: string;
  value: string;
  should_fail_validation?: boolean;
  should_fail_upsert?: boolean;
}

export class FixtureAdapter implements IngestionAdapter<FixtureRawRecord> {
  readonly sourceCode = "FIXTURE_SRC";

  constructor(private records: unknown[]) {}

  validateRaw(record: unknown): FixtureRawRecord {
    const r = record as FixtureRawRecord;
    if (r.should_fail_validation) {
      throw new Error(`Validation failed for record ${r.id}`);
    }
    return r;
  }

  async normalize(record: FixtureRawRecord): Promise<unknown | null> {
    if (record.value === "SKIP") return null;
    return {
      normalizedId: `N_${record.id}`,
      normalizedValue: record.value,
      should_fail_upsert: record.should_fail_upsert,
    };
  }

  async *fetchRecords(_job: ImportJob): AsyncGenerator<unknown, void, unknown> {
    for (const record of this.records) {
      yield record;
    }
  }

  async upsert(normalizedRecord: unknown): Promise<boolean> {
    const rec = normalizedRecord as { normalizedId: string; should_fail_upsert?: boolean };
    if (rec.should_fail_upsert) {
      throw new Error(`Upsert failed for normalized record ${rec.normalizedId}`);
    }
    // Simulate DB delay
    await new Promise((res) => setTimeout(res, 10));
    return true;
  }
}
