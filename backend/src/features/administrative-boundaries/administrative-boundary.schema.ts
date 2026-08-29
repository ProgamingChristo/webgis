import type { NextRequest } from "next/server";
import { z } from "zod";

import {
  GLOBAL_SEARCH_REGION_IDS,
  MAX_GLOBAL_SEARCH_REGIONS,
} from "@/src/features/global-search/global-search-regions";
import { ApplicationError } from "@/src/lib/errors";
import { getStrictSearchParams } from "@/src/modules/spatial/spatial-api";

const boundaryQuerySchema = z.object({
  ids: z.string().trim().min(1).transform((value) =>
    value.split(",").map((item) => item.trim()).filter(Boolean)
  ).pipe(
    z.array(z.enum(GLOBAL_SEARCH_REGION_IDS as [string, ...string[]]))
      .min(1)
      .max(MAX_GLOBAL_SEARCH_REGIONS),
  ),
}).strict().superRefine((value, context) => {
  if (new Set(value.ids).size !== value.ids.length) {
    context.addIssue({ code: "custom", message: "region identifiers must be unique" });
  }
});

export interface AdministrativeBoundaryQuery {
  ids: string[];
}

export function parseAdministrativeBoundaryRequest(
  request: NextRequest,
): AdministrativeBoundaryQuery {
  const parsed = boundaryQuerySchema.safeParse(getStrictSearchParams(request));
  if (!parsed.success) throw new ApplicationError("VALIDATION_ERROR");
  return parsed.data;
}
