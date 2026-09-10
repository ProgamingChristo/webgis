"use client";

import { authenticatedFetch, AuthSessionError } from "@/src/lib/auth-client";
import { getGetraApiBaseUrl, getGetraApiUrl } from "@/src/lib/api-base-url";
import { getUserFacingApiError } from "@/src/lib/user-facing-api-error";

export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "INVALID_RESPONSE"
  | "UNKNOWN_ERROR";

export class GetraApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;

  constructor(message: string, code: ApiErrorCode, status?: number) {
    super(message);
    this.name = "GetraApiError";
    this.code = code;
    this.status = status;
  }
}

export type ApiRequestOptions = {
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export function getApiBaseUrl(): string {
  return getGetraApiBaseUrl();
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const url = new URL(getGetraApiUrl(path));

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function errorCodeForStatus(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 422 || status === 400) return "VALIDATION_ERROR";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    if (!response.ok) return null;
    throw new GetraApiError(
      getUserFacingApiError({ code: "INVALID_RESPONSE", status: response.status }),
      "INVALID_RESPONSE",
      response.status,
    );
  }
}

export async function getraApiGet<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  options.signal?.throwIfAborted();
  const url = buildUrl(path, options.query);
  let response: Response;

  try {
    response = await authenticatedFetch(url, {
      method: "GET",
      signal: options.signal,
    });
  } catch (error) {
    options.signal?.throwIfAborted();
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof AuthSessionError) {
      throw new GetraApiError("Session tidak tersedia.", "UNAUTHORIZED", 401);
    }

    throw new GetraApiError(
      "Tidak bisa terhubung ke backend GETRA.",
      "NETWORK_ERROR",
    );
  }

  options.signal?.throwIfAborted();
  const body = await safeJson(response);
  options.signal?.throwIfAborted();

  if (!response.ok) {
    const detail = typeof body === "object" && body !== null && "error" in body
      ? body.error
      : null;
    const backendCode =
      typeof detail === "object" && detail !== null && "code" in detail && typeof detail.code === "string"
        ? detail.code
        : undefined;

    throw new GetraApiError(
      getUserFacingApiError({ code: backendCode, status: response.status }),
      errorCodeForStatus(response.status),
      response.status,
    );
  }

  return body as T;
}
