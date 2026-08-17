import "server-only";

import { readBoundedJsonBody as readGenericBoundedJsonBody } from "@/src/lib/request-body";

export async function readBoundedJsonBody(
  request: Request,
  maximumBytes: number,
): Promise<unknown> {
  return readGenericBoundedJsonBody(
    request,
    maximumBytes,
    "SPATIAL_REQUEST_TOO_LARGE",
  );
}
