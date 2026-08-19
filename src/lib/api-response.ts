import { NextResponse } from "next/server";

import {
  getHttpStatusForError,
  getPublicErrorMessage,
  RateLimitExceededError,
  type ApplicationError,
} from "@/src/lib/errors";
import type { ApiErrorResponse, ApiSuccessResponse, ApiListResponse, ApiListMeta } from "@/src/types/api";

function withStandardHeaders(requestId: string, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("x-request-id", requestId);

  return { ...init, headers };
}

export function createSuccessResponse<T>(
  requestId: string,
  data: T,
  init: ResponseInit = {},
): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    request_id: requestId,
  };

  return NextResponse.json(body, withStandardHeaders(requestId, init));
}

export function createListResponse<T>(
  requestId: string,
  data: T[],
  meta: ApiListMeta,
  init: ResponseInit = {},
): NextResponse<ApiListResponse<T>> {
  const body: ApiListResponse<T> = {
    success: true,
    data,
    meta,
    request_id: requestId,
  };

  return NextResponse.json(body, withStandardHeaders(requestId, init));
}

export function createErrorResponse(
  requestId: string,
  error: ApplicationError,
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code: error.code,
      message: getPublicErrorMessage(error.code) || error.message,
      retryable: error.retryable,
      ...(error instanceof RateLimitExceededError && {
        details: { source: error.source }
      })
    },
    request_id: requestId,
  };

  const init: ResponseInit = {
    status: getHttpStatusForError(error.code),
  };

  if (error instanceof RateLimitExceededError) {
    const headers = new Headers(init.headers);
    headers.set("Retry-After", String(error.retryAfterSeconds));
    init.headers = headers;
  }

  return NextResponse.json(
    body,
    withStandardHeaders(requestId, init),
  );
}
