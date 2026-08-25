"use client";

import { authenticatedFetch } from "@/src/lib/auth-client";
import type {
  CommunityContribution,
  CommunityContributionHistoryFilters,
  CommunityContributionHistoryResult,
  CommunityContributionMapBounds,
  CommunityContributionMapFeature,
  CommunityContributionMerchant,
  CommunityContributionModerationDetail,
  CommunityContributionModerationFilters,
  CommunityContributionModerationResult,
  CommunityContributionRejectionReason,
  CreateCommunityContributionPayload,
} from "../types/community-contributions.types";

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

function readFailureMessage(json: ApiFailureEnvelope, fallback: string) {
  if (json.error?.code === "CONTRIBUTION_RATE_LIMITED") {
    return "Batas laporan sementara tercapai. Coba lagi nanti.";
  }

  if (json.error?.code === "CONTRIBUTION_DUPLICATE") {
    return "Laporan serupa sudah Anda kirim baru-baru ini.";
  }

  if (json.error?.code === "INVALID_OBSERVATION_TIME") {
    return "Waktu pengamatan tidak valid.";
  }

  if (json.error?.code === "INVALID_TARGET_LOCATION") {
    return "Lokasi baru terlalu dekat dengan lokasi usaha saat ini.";
  }

  if (json.error?.code === "VALIDATION_ERROR") {
    return "Data laporan belum sesuai. Periksa kembali isian Anda.";
  }

  return json.error?.message || json.error?.code || fallback;
}

export async function createCommunityContribution(
  input: CreateCommunityContributionPayload,
): Promise<CommunityContribution> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/contributions`,
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
      | ApiSuccessEnvelope<CommunityContribution>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Laporan gagal dikirim."
        : readFailureMessage(json, "Laporan gagal dikirim."),
    );
  }

  return json.data;
}

export async function getCommunityContributionHistory(
  page: number,
  limit: number,
  filters: CommunityContributionHistoryFilters = {},
): Promise<CommunityContributionHistoryResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.reportType) {
    params.set("report_type", filters.reportType);
  }

  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/contributions?${params.toString()}`,
    {
      method: "GET",
    },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityContributionHistoryResult>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Riwayat kontribusi gagal dimuat."
        : readFailureMessage(json, "Riwayat kontribusi gagal dimuat."),
    );
  }

  return json.data;
}

export async function getCommunityContributionMapFeatures(
  bounds: CommunityContributionMapBounds,
  limit = 250,
): Promise<CommunityContributionMapFeature[]> {
  const params = new URLSearchParams({
    min_lng: String(bounds.minLng),
    min_lat: String(bounds.minLat),
    max_lng: String(bounds.maxLng),
    max_lat: String(bounds.maxLat),
    limit: String(limit),
  });

  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/contributions/map?${params.toString()}`,
    { method: "GET" },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityContributionMapFeature[]>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Peta kontribusi gagal dimuat."
        : readFailureMessage(json, "Peta kontribusi gagal dimuat."),
    );
  }

  return json.data;
}

export async function searchContributionMerchants(
  query: string,
): Promise<CommunityContributionMerchant[]> {
  const params = new URLSearchParams({
    query,
  });
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/community/contributions/merchants?${params.toString()}`,
    {
      method: "GET",
    },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityContributionMerchant[]>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Daftar usaha gagal dimuat."
        : readFailureMessage(json, "Daftar usaha gagal dimuat."),
    );
  }

  return json.data;
}

export async function getCommunityContributionModerationQueue(
  page: number,
  limit: number,
  filters: CommunityContributionModerationFilters = {},
): Promise<CommunityContributionModerationResult> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status: filters.status ?? "PENDING",
  });

  if (filters.reportType) {
    params.set("report_type", filters.reportType);
  }

  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/admin/community/contributions?${params.toString()}`,
    { method: "GET" },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityContributionModerationResult>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Antrean moderasi gagal dimuat."
        : readFailureMessage(json, "Antrean moderasi gagal dimuat."),
    );
  }

  return json.data;
}

export async function getCommunityContributionModerationDetail(
  contributionId: string,
): Promise<CommunityContributionModerationDetail> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/admin/community/contributions/${contributionId}`,
    { method: "GET" },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityContributionModerationDetail>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Detail kontribusi gagal dimuat."
        : readFailureMessage(json, "Detail kontribusi gagal dimuat."),
    );
  }

  return json.data;
}

export async function confirmCommunityContribution(
  contributionId: string,
): Promise<CommunityContributionModerationDetail> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/admin/community/contributions/${contributionId}/confirm`,
    { method: "POST" },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityContributionModerationDetail>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Konfirmasi kontribusi gagal."
        : readFailureMessage(json, "Konfirmasi kontribusi gagal."),
    );
  }

  return json.data;
}

export async function rejectCommunityContribution(
  contributionId: string,
  reason: CommunityContributionRejectionReason,
): Promise<CommunityContributionModerationDetail> {
  const response = await authenticatedFetch(
    `${getApiBaseUrl()}/api/admin/community/contributions/${contributionId}/reject`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    },
  );
  const json =
    (await response.json()) as
      | ApiSuccessEnvelope<CommunityContributionModerationDetail>
      | ApiFailureEnvelope;

  if (!response.ok || !json.success) {
    throw new Error(
      json.success
        ? "Penolakan kontribusi gagal."
        : readFailureMessage(json, "Penolakan kontribusi gagal."),
    );
  }

  return json.data;
}
