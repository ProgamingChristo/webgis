"use client";

import { authenticatedFetch } from "@/src/lib/auth-client";
import { getGetraApiUrl } from "@/src/lib/api-base-url";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiFailure {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
}

type ApiEnvelope<T> =
  | ApiSuccess<T>
  | ApiFailure;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response =
    await authenticatedFetch(
      getGetraApiUrl(path),
      init,
    );

  let json: ApiEnvelope<T>;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("Respons GETRA tidak valid.", response.status, "INVALID_RESPONSE");
  }
  if (!json || typeof json !== "object" || typeof json.success !== "boolean") {
    throw new ApiError("Respons GETRA tidak valid.", response.status, "INVALID_RESPONSE");
  }

  if (
    !response.ok ||
    !json.success
  ) {
    throw new ApiError(
      json.success
        ? "Request GETRA gagal."
        : json.error?.message ||
          json.error?.code ||
          "Request GETRA gagal.",
      response.status,
      json.success ? undefined : json.error?.code,
    );
  }

  return json.data;
}

export const apiClient = {
  get<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "GET",
        ...options,
      },
    );
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "POST",
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      },
    );
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "PATCH",
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      },
    );
  },

  put<T>(
    path: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "PUT",
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      },
    );
  },

  delete<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {
    return request<T>(
      path,
      {
        method: "DELETE",
        ...options,
      },
    );
  },
};
