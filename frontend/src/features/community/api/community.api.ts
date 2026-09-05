"use client";

import { authenticatedFetch } from "../../../lib/auth-client";
import { getGetraApiBaseUrl } from "../../../lib/api-base-url";
import type {
  CommunityComment,
  CommunityCommentResponse,
  CommunityCulturalMapItem,
  CommunityDemandSignal,
  CommunityDemandSignalResponse,
  CommunityDemandSignalResponsesPayload,
  CommuterRequestItem,
  CommuterRequestResponse,
  CommunityFindingCategory,
  CommunityFeedItem,
  CommunityFeedResponse,
  CommunityFeedMeta,
  CommunityAnalytics,
  CommunityFriendListResponse,
  CommunityFriendshipAction,
  CommunityFriendshipView,
  CommunityNotificationResponse,
  CommunityReactionSummary,
  CommunityReactionType,
  CommunityReport,
  CommunityReputation,
  CommunityUserProfile,
  CommunityUmkmResponse,
  CreateCommunityReportInput,
  CreateCommunityUmkmResponseInput,
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

const getApiBaseUrl = getGetraApiBaseUrl;

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

export async function deleteCommunityPost(postId: string): Promise<{ deletionActorRole: "OWNER" | "ADMIN" }> {
  const response = await authenticatedFetch(`${getApiBaseUrl()}/api/community/posts/${postId}`, { method: "DELETE" });
  const json = (await response.json()) as ApiSuccessEnvelope<{ deletionActorRole: "OWNER" | "ADMIN" }> | ApiFailureEnvelope;
  if (!response.ok || !json.success) {
    throw new Error(json.success ? "Posting Community gagal dihapus." : readFailureMessage(json));
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

export async function getCommunityDemandSignals(
  page = 1,
  limit = 20,
  filters: {
    category?: string | null;
  } = {},
): Promise<CommunityDemandSignalResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters.category) {
    params.set("category", filters.category);
  }

  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/requests/signals?${params.toString()}`,
    {
      method: "GET",
    },
  );
  const json =
    (await response.json()) as
      | ApiListEnvelope<CommunityDemandSignal>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Sinyal Community gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return {
    items: json.data,
    meta: json.meta,
  };
}

export async function getCommunityDemandSignal(
  signalId: string,
): Promise<CommunityDemandSignal> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/requests/signals/${signalId}`,
    {
      method: "GET",
    },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityDemandSignal>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Detail Sinyal Community gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function getCommunityDemandSignalResponses(
  signalId: string,
): Promise<CommunityDemandSignalResponsesPayload> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/requests/signals/${signalId}/responses`,
    {
      method: "GET",
    },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityDemandSignalResponsesPayload>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Respons UMKM gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function upsertCommunityDemandSignalResponse(
  signalId: string,
  input: CreateCommunityUmkmResponseInput,
): Promise<CommunityUmkmResponse> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/requests/signals/${signalId}/responses`,
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
      | ApiSuccessEnvelope<CommunityUmkmResponse>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Respons UMKM gagal dikirim."
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

export async function getCommunityNotifications(
  page = 1,
  limit = 20,
): Promise<CommunityNotificationResponse> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/notifications?page=${page}&limit=${limit}`,
    {
      method: "GET",
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityNotificationResponse>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Notifikasi Community gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function markCommunityNotificationRead(
  notificationId: string,
): Promise<void> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    },
  );

  const json =
    (await response.json()) as ApiSuccessEnvelope<{ ok: true }> | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Notifikasi Community gagal diperbarui."
        : readFailureMessage(json),
    );
  }
}

export async function markAllCommunityNotificationsRead(): Promise<void> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/notifications/read-all`,
    {
      method: "PATCH",
    },
  );

  const json =
    (await response.json()) as ApiSuccessEnvelope<{ ok: true }> | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Notifikasi Community gagal diperbarui."
        : readFailureMessage(json),
    );
  }
}

export async function createCommunityReport(
  input: CreateCommunityReportInput,
): Promise<CommunityReport> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/reports`,
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
      | ApiSuccessEnvelope<CommunityReport>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Laporan Community gagal dikirim."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function getCommunityReputation(
  userId: string,
): Promise<CommunityReputation> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/reputation/${userId}`,
    {
      method: "GET",
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityReputation>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Reputasi Community gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function getCommunityAnalytics(): Promise<CommunityAnalytics> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/admin/community/analytics`,
    {
      method: "GET",
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityAnalytics>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Analytics Community gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function getCommunityUserProfile(
  userId: string,
): Promise<CommunityUserProfile> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/users/${userId}`,
    {
      method: "GET",
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityUserProfile>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Profil Community gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function sendCommunityFriendRequest(
  userId: string,
): Promise<CommunityUserProfile> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/friends/requests`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityUserProfile>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Permintaan teman gagal dikirim."
        : readFailureMessage(json),
    );
  }

  return json.data;
}

export async function actOnCommunityFriendship(
  friendshipId: string,
  action: CommunityFriendshipAction,
): Promise<void> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/friends/${friendshipId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
      }),
    },
  );

  const json =
    (await response.json()) as ApiSuccessEnvelope<{ ok: true }> | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Status pertemanan gagal diperbarui."
        : readFailureMessage(json),
    );
  }
}

export async function getCommunityFriends(
  view: CommunityFriendshipView,
  page = 1,
  limit = 20,
): Promise<CommunityFriendListResponse> {
  const params = new URLSearchParams({
    view,
    page: String(page),
    limit: String(limit),
  });
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/friends?${params.toString()}`,
    {
      method: "GET",
    },
  );

  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityFriendListResponse>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Daftar teman gagal dimuat."
        : readFailureMessage(json),
    );
  }

  return json.data;
}
