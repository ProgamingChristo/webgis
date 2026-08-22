import { NextRequest } from "next/server";
import { requireRole } from "@/src/lib/auth";
import { getRequestId } from "@/src/lib/request-id";
import { createSuccessResponse } from "@/src/lib/api-response";
import { withApiLogger } from "@/src/lib/api-logger";
import { validateBody } from "@/src/lib/validation";
import { getServiceRoleSupabaseClient } from "@/src/lib/supabase/server";

import { ImportJobRepository } from "@/src/modules/ingestion/repositories/import-job.repository";
import { DataSourceRepository } from "@/src/modules/ingestion/repositories/data-source.repository";
import { IngestionPipelineService } from "@/src/modules/ingestion/services/ingestion-pipeline.service";
import { createImportJobSchema } from "@/src/modules/ingestion/ingestion.schemas";
import type { CreateImportJobInput } from "@/src/modules/ingestion/ingestion.types";

export const maxDuration = 60; // 1 min

export async function POST(req: NextRequest) {
  const reqId = getRequestId(req);

  return withApiLogger(req, reqId, async () => {
    // 1. Authenticate & Authorize as ADMIN
    await requireRole(req, "ADMIN");

    // 2. Parse request
    const payload = await validateBody(req, createImportJobSchema, 8192);

    // 3. Setup repositories with SERVICE ROLE to bypass RLS for ingestion logic
    const supabaseService = getServiceRoleSupabaseClient();
    const importJobRepo = new ImportJobRepository(supabaseService);
    const dataSourceRepo = new DataSourceRepository(supabaseService);
    const ingestionPipeline = new IngestionPipelineService(importJobRepo, dataSourceRepo);

    // 4. Create Job
    const job = await ingestionPipeline.startJob(payload as unknown as CreateImportJobInput);

    return createSuccessResponse(reqId, job, { status: 201 });
  });
}
