import type { OwnedMerchantBrief, UmkmWorkspaceSummary } from "../types/umkm-workspace.types";

export type UmkmWorkspaceState = "NO_MERCHANT" | "HAS_DRAFT" | "PENDING_VERIFICATION" | "ACTIVE_MERCHANT" | "ACTIVE_WITH_PENDING";

export function deriveUmkmWorkspaceState(summary: UmkmWorkspaceSummary): UmkmWorkspaceState {
  const pending = summary.recent_submissions.some((item) => item.status === "PENDING_REVIEW")
    || summary.recent_claims.some((item) => item.status === "PENDING");
  if (summary.owned_merchants.length > 0) return pending ? "ACTIVE_WITH_PENDING" : "ACTIVE_MERCHANT";
  if (pending) return "PENDING_VERIFICATION";
  if (summary.recent_submissions.some((item) => item.status === "DRAFT")) return "HAS_DRAFT";
  return "NO_MERCHANT";
}

export function resolveSelectedMerchant(merchants: OwnedMerchantBrief[], selectedMerchantId: string | null) {
  return merchants.find((merchant) => merchant.id === selectedMerchantId) ?? merchants[0] ?? null;
}

export function getLatestDraft(summary: UmkmWorkspaceSummary) {
  return summary.recent_submissions.filter((item) => item.status === "DRAFT")
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0] ?? null;
}

export function merchantPublishLabel(status: string) {
  return ({ PUBLISHED: "Tayang di GETRA", DRAFT: "Belum ditayangkan", ARCHIVED: "Diarsipkan", UNPUBLISHED: "Belum ditayangkan" } as Record<string, string>)[status] ?? "Status tayang perlu diperiksa";
}
