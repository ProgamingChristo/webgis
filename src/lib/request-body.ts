import { ApplicationError, type ApplicationErrorCode } from "@/src/lib/errors";

export const MAX_AUTH_JSON_BODY_BYTES = 8_192;
export const MAX_PROFILE_JSON_BODY_BYTES = 4_096;

type RequestTooLargeCode = Extract<
  ApplicationErrorCode,
  "REQUEST_TOO_LARGE" | "SPATIAL_REQUEST_TOO_LARGE"
>;

function ensureJsonContentType(request: Request): void {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new ApplicationError("VALIDATION_ERROR");
  }
}

export async function readBoundedJsonBody(
  request: Request,
  maximumBytes: number,
  tooLargeCode: RequestTooLargeCode = "REQUEST_TOO_LARGE",
): Promise<unknown> {
  ensureJsonContentType(request);

  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
    throw new ApplicationError("INTERNAL_ERROR");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new ApplicationError("VALIDATION_ERROR");
    }
    if (length > maximumBytes) {
      throw new ApplicationError(tooLargeCode);
    }
  }

  if (!request.body) {
    throw new ApplicationError("VALIDATION_ERROR");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new ApplicationError(tooLargeCode);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError("VALIDATION_ERROR");
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApplicationError("VALIDATION_ERROR");
  }
}
