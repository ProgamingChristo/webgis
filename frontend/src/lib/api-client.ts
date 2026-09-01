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

async function request<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response =
    await authenticatedFetch(
      getGetraApiUrl(path),
      init,
    );

  const json =
    (await response.json()) as ApiEnvelope<T>;

  if (
    !response.ok ||
    !json.success
  ) {
    throw new Error(
      json.success
        ? "Request GETRA gagal."
        : json.error?.message ||
          json.error?.code ||
          "Request GETRA gagal.",
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
