"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/src/components/providers/AuthProvider";
import type { MerchantSubmissionRecord } from "@/src/features/merchant-submission";
import {
  AdminUmkmView,
  type ReviewItem,
} from "@/src/features/umkm-workspace/components/admin-umkm-view";
import {
  adminUmkmReviewService,
  type AdminMerchantClaimRecord,
} from "@/src/services/admin-umkm-review.service";

export default function AdminUmkmPage() {
  const { context } = useAuth();
  const isAdmin = context?.profile?.account_role === "ADMIN";
  const [claims, setClaims] = useState<AdminMerchantClaimRecord[]>([]);
  const [submissions, setSubmissions] = useState<MerchantSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async (showRefresh = false) => {
    if (!isAdmin) return;
    if (showRefresh) setRefreshing(true);
    try {
      const [nextClaims, nextSubmissions] = await Promise.all([
        adminUmkmReviewService.listMerchantClaims(),
        adminUmkmReviewService.listMerchantSubmissions(),
      ]);
      setClaims(nextClaims);
      setSubmissions(nextSubmissions);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pemeriksaan UMKM belum dapat dimuat. Coba lagi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadQueue(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadQueue]);

  async function approveItem(item: ReviewItem) {
    setActionId(`${item.kind}:${item.id}:approve`);
    setError(null);
    try {
      if (item.kind === "CLAIM") {
        await adminUmkmReviewService.approveMerchantClaim(item.id);
      } else {
        await adminUmkmReviewService.approveMerchantSubmission(item.id);
      }
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Approval gagal.");
    } finally {
      setActionId(null);
    }
  }

  async function rejectItem(item: ReviewItem) {
    const note = window.prompt("Tuliskan alasan penolakan untuk user.");
    if (!note?.trim()) return;

    setActionId(`${item.kind}:${item.id}:reject`);
    setError(null);
    try {
      if (item.kind === "CLAIM") {
        await adminUmkmReviewService.rejectMerchantClaim(item.id, note.trim());
      } else {
        await adminUmkmReviewService.rejectMerchantSubmission(item.id, note.trim());
      }
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Penolakan gagal.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <AdminUmkmView
      actionId={actionId}
      claims={claims}
      error={error}
      isAdmin={isAdmin}
      loading={loading}
      onApprove={(item) => void approveItem(item)}
      onRefresh={() => void loadQueue(true)}
      onReject={(item) => void rejectItem(item)}
      refreshing={refreshing}
      submissions={submissions}
    />
  );
}
