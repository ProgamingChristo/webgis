"use client";

import { getAccessToken } from "@/src/lib/auth-client";

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
  authenticated?: boolean;
  query?: Record<string, string | number | boolean | null | undefined>;
};

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(
    /\/$/,
    "",
  );
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, getApiBaseUrl());

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
    throw new GetraApiError(
      "Respons backend tidak valid.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
}

export async function getraApiGet<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers();

  if (options.authenticated) {
    const token = await getAccessToken();

    if (!token) {
      throw new GetraApiError("Session tidak tersedia.", "UNAUTHORIZED", 401);
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, options.query), {
      method: "GET",
      headers,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new GetraApiError(
      "Tidak bisa terhubung ke backend GETRA.",
      "NETWORK_ERROR",
    );
  }

  const body = await safeJson(response);

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "Request backend gagal.";

    throw new GetraApiError(
      message,
      errorCodeForStatus(response.status),
      response.status,
    );
  }

  return body as T;
}
