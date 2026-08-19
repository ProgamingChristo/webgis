import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { createSuccessResponse } from "@/src/lib/api-response";
import { withApiLogger } from "@/src/lib/api-logger";
import { validateBody } from "@/src/lib/validation";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

import { ImportJobRepository } from "@/src/modules/ingestion/repositories/import-job.repository";
import { DataSourceRepository } from "@/src/modules/ingestion/repositories/data-source.repository";
import { IngestionPipelineService } from "@/src/modules/ingestion/services/ingestion-pipeline.service";
import { FixtureAdapter } from "@/src/modules/ingestion/adapters/fixture.adapter";
import { ApplicationError } from "@/src/lib/errors";

export const maxDuration = 300; // 5 mins

const runJobSchema = z.object({
  job_id: z.string().uuid("Invalid job_id format"),
  records: z.array(z.unknown()), // Mock records for testing
});

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    await requireRole(req, "ADMIN");

    const payload = await validateBody(req, runJobSchema, 819200);

    const supabaseService = getServiceRoleSupabaseClient();
    const importJobRepo = new ImportJobRepository(supabaseService);
    const dataSourceRepo = new DataSourceRepository(supabaseService);
    const ingestionPipeline = new IngestionPipelineService(importJobRepo, dataSourceRepo);

    const job = await importJobRepo.findById(payload.job_id);
    if (!job) {
      throw new ApplicationError("NOT_FOUND", `Job ${payload.job_id} not found`);
    }

    if (job.status !== "PENDING") {
      throw new ApplicationError("CONFLICT", `Job is not in PENDING state. Current state: ${job.status}`);
    }

    // Use FixtureAdapter for this endpoint as it is a testing/technical foundation route
    const adapter = new FixtureAdapter(payload.records);

    // Run pipeline
    const completedJob = await ingestionPipeline.execute(job, adapter);

    return createSuccessResponse(reqId, completedJob, { status: 200 });
  });
}
