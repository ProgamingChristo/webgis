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
  const [queueError, setQueueError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
      setQueueError(null);
    } catch (cause) {
      setQueueError(
        cause instanceof Error ? cause.message : "Pemeriksaan UMKM belum dapat dimuat. Coba lagi."
      );
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
    setActionError(null);
    setActionSuccess(null);
    try {
      if (item.kind === "CLAIM") {
        await adminUmkmReviewService.approveMerchantClaim(item.id);
      } else {
        await adminUmkmReviewService.approveMerchantSubmission(item.id);
      }
      setActionSuccess(`"${item.merchantName}" berhasil disetujui dan diverifikasi.`);
      await loadQueue();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Persetujuan usaha gagal diproses. Coba lagi."
      );
    } finally {
      setActionId(null);
    }
  }

  async function rejectItem(item: ReviewItem) {
    const note = window.prompt("Tuliskan alasan penolakan untuk user.");
    if (!note?.trim()) return;

    setActionId(`${item.kind}:${item.id}:reject`);
    setActionError(null);
    setActionSuccess(null);
    try {
      if (item.kind === "CLAIM") {
        await adminUmkmReviewService.rejectMerchantClaim(item.id, note.trim());
      } else {
        await adminUmkmReviewService.rejectMerchantSubmission(item.id, note.trim());
      }
      setActionSuccess(`"${item.merchantName}" berhasil ditolak dengan catatan.`);
      await loadQueue();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "Penolakan usaha gagal diproses. Coba lagi."
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <AdminUmkmView
      actionError={actionError}
      actionId={actionId}
      actionSuccess={actionSuccess}
      claims={claims}
      error={queueError}
      isAdmin={isAdmin}
      loading={loading}
      onApprove={(item) => void approveItem(item)}
      onDismissActionError={() => setActionError(null)}
      onDismissActionSuccess={() => setActionSuccess(null)}
      onRefresh={() => void loadQueue(true)}
      onReject={(item) => void rejectItem(item)}
      refreshing={refreshing}
      submissions={submissions}
    />
  );
}
