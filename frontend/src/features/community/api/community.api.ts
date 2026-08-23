"use client";

import { authenticatedFetch } from "../../../lib/auth-client";
import type {
  CommunityComment,
  CommunityCommentResponse,
  CommunityCulturalMapItem,
  CommuterRequestItem,
  CommuterRequestResponse,
  CommunityFindingCategory,
  CommunityFeedItem,
  CommunityFeedResponse,
  CommunityFeedMeta,
  CommunityReactionSummary,
  CommunityReactionType,
  CreateCommuterRequestInput,
  CreateCommunityCommentInput,
  CreateCommunityPostInput,
} from "../types/community.types";

type ApiListEnvelope<T> = {
  success: true;
  data: T[];
  meta: CommunityFeedMeta;
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

type ApiFailureEnvelope = {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
};

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL belum dikonfigurasi.");
  }

  return baseUrl;
}

function readFailureMessage(json: ApiFailureEnvelope): string {
  return (
    json.error?.message ||
    json.error?.code ||
    "Request Community gagal."
  );
}

export async function getCommunityFeed(
  page = 1,
  limit = 20,
  filters: {
    type?: "GENERAL" | "FINDING";
    category?: CommunityFindingCategory | null;
  } = {},
): Promise<CommunityFeedResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters.type) {
    params.set("type", filters.type);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/feed?${params.toString()}`,
    {
      method: "GET",
    },
  );

  const json =
    (await response.json()) as
      | ApiListEnvelope<CommunityFeedItem>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Feed Community gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return {
    items: json.data,
    meta: json.meta,
  };
}

export async function getCommunityCulturalMap(
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  },
  categories: CommunityFindingCategory[] = [],
): Promise<CommunityCulturalMapItem[]> {
  const params = new URLSearchParams({
    west: String(bbox.west),
    south: String(bbox.south),
    east: String(bbox.east),
    north: String(bbox.north),
  });

  for (const category of categories) {
    params.append("categories", category);
  }

  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/cultural-map?${params.toString()}`,
    {
      method: "GET",
    },
  );

  const json =
    (await response.json()) as
      | ApiListEnvelope<CommunityCulturalMapItem>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Cultural Map gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function createCommunityPost(
  input: CreateCommunityPostInput,
): Promise<CommunityFeedItem> {
  const { photo, ...payload } = input;
  const body = photo ? new FormData() : JSON.stringify(payload);
  const headers: HeadersInit = {};

  if (photo && body instanceof FormData) {
    body.append("payload", JSON.stringify(payload));
    body.append("photo", photo);
  } else {
    headers["Content-Type"] = "application/json";
  }

  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/posts`,
    {
      method: "POST",
      headers,
      body,
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityFeedItem>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Posting Community gagal."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function getCommuterRequests(
  page = 1,
  limit = 20,
  filters: {
    category?: string | null;
    longitude?: number;
    latitude?: number;
    radius_meters?: number;
  } = {},
): Promise<CommuterRequestResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.longitude !== undefined && filters.latitude !== undefined) {
    params.set("longitude", String(filters.longitude));
    params.set("latitude", String(filters.latitude));
  }

  if (filters.radius_meters !== undefined) {
    params.set("radius_meters", String(filters.radius_meters));
  }

  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/requests?${params.toString()}`,
    {
      method: "GET",
    },
  );
  const json =
    (await response.json()) as
      | ApiListEnvelope<CommuterRequestItem>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Permintaan Komuter gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return {
    items: json.data,
    meta: json.meta,
  };
}

export async function createCommuterRequest(
  input: CreateCommuterRequestInput,
): Promise<CommuterRequestItem> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/requests`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommuterRequestItem>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Permintaan Komuter gagal dibuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function getCommuterRequest(
  requestId: string,
): Promise<CommuterRequestItem> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/requests/${requestId}`,
    {
      method: "GET",
    },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommuterRequestItem>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Detail Permintaan Komuter gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function getCommunityPost(
  postId: string,
): Promise<CommunityFeedItem> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/posts/${postId}`,
    {
      method: "GET",
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityFeedItem>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Detail Community gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function getCommunityComments(
  postId: string,
  page = 1,
  limit = 20,
): Promise<CommunityCommentResponse> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/posts/${postId}/comments?page=${page}&limit=${limit}`,
    {
      method: "GET",
    },
  );

  const json =
    (await response.json()) as
      | ApiListEnvelope<CommunityComment>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Balasan Community gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return {
    items: json.data,
    meta: json.meta,
  };
}

export async function createCommunityComment(
  postId: string,
  input: CreateCommunityCommentInput,
): Promise<CommunityComment> {
  const payload = {
    content: input.content,
    ...(input.parentCommentId
      ? {
          parent_comment_id: input.parentCommentId,
        }
      : {}),
  };
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/posts/${postId}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityComment>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Balasan Community gagal dikirim."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function setCommunityReaction(
  postId: string,
  reactionType: CommunityReactionType,
  active: boolean,
): Promise<CommunityReactionSummary> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/posts/${postId}/reactions/${reactionType}`,
    {
      method: active ? "PUT" : "DELETE",
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityReactionSummary>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Reaction Community gagal diperbarui."
        : readFailureMessage(json),
    );
  }

  return json.data;
}
