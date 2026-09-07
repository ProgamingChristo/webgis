import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { deriveUmkmWorkspaceState, getLatestDraft, resolveSelectedMerchant } from "@/src/features/umkm-workspace/model/umkm-workspace-state";
import type { OwnedMerchantBrief, UmkmWorkspaceSummary } from "@/src/features/umkm-workspace/types/umkm-workspace.types";
import { UmkmEntryState } from "@/src/features/umkm-workspace/components/umkm-entry-state";
import { UmkmPendingState } from "@/src/features/umkm-workspace/components/umkm-pending-state";
import { MerchantSelector } from "@/src/features/umkm-workspace/components/merchant-selector";
import { UmkmWorkspaceNavigation } from "@/src/features/umkm-workspace/components/umkm-workspace-navigation";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("merchantId=two") }));
vi.mock("@/src/features/umkm-intelligence/hooks/use-umkm-intelligence", () => ({ useUmkmIntelligence: () => ({ data: null, loading: false, error: null }) }));
vi.mock("@/src/features/umkm-intelligence/components/umkm-intelligence-map", () => ({ UmkmIntelligenceMap: () => null }));
vi.mock("@/src/features/umkm-advertising/hooks/use-advertising-eligibility", () => ({ useAdvertisingEligibility: (merchantId: string) => ({ eligibility: { eligible: true, merchantId }, loading: false, error: null, refetch: vi.fn() }) }));

import { UmkmWorkspaceContent } from "@/src/features/umkm-workspace/components/umkm-workspace";
import { MerchantClaimDetailView } from "@/src/features/umkm-workspace/components/merchant-claim-detail";

const empty: UmkmWorkspaceSummary = { owned_merchants: [], recent_claims: [], recent_submissions: [], verified_merchants_count: 0, pending_submissions_count: 0, active_campaigns_count: 0 };
const one: OwnedMerchantBrief = { id: "one", name: "Warung Satu", category: "Kuliner", address: null, publish_status: "PUBLISHED", verification_status: "VERIFIED", campaigns_count: 1, active_campaigns_count: 0 };
const two = { ...one, id: "two", name: "Warung Dua" };
const draft = { id: "draft", name: "Usaha Baru", category: "Kuliner", status: "DRAFT" as const, address: null, created_at: "2026-08-01", updated_at: "2026-08-01" };
const pendingSubmission = { ...draft, status: "PENDING_REVIEW" as const };
const pendingClaim = { id: "claim", merchant_id: "external", merchant_name: "Warung Klaim", category: "Kuliner", status: "PENDING" as const, address: null, note: null, created_at: "2026-08-02", reviewed_at: null };

describe("state-driven UMKM workspace", () => {
  it("derives NO_MERCHANT from real arrays, ignoring mismatched aggregate counters", () => {
    expect(deriveUmkmWorkspaceState({ ...empty, verified_merchants_count: 8, pending_submissions_count: 3 })).toBe("NO_MERCHANT");
    const html = renderToStaticMarkup(<UmkmEntryState summary={empty} />);
    expect(html).toContain("Mulai kelola usaha Anda di GETRA");
    expect(html.match(/href=/g)).toHaveLength(1);
    expect(html).toContain('href="/umkm/merchants/new"');
    expect(html).not.toMatch(/Intelligence|Promosi|locked|Discoverability/i);
  });
  it("resumes the most recently updated actual draft", () => {
    const summary = { ...empty, recent_submissions: [draft, { ...draft, id: "latest", updated_at: "2026-09-01" }] };
    expect(deriveUmkmWorkspaceState(summary)).toBe("HAS_DRAFT");
    expect(getLatestDraft(summary)?.id).toBe("latest");
    const html = renderToStaticMarkup(<UmkmEntryState summary={summary} />);
    expect(html).toContain("Lanjutkan Pendaftaran");
    expect(html).toContain('/umkm/merchants/new?edit=latest');
  });
  it.each([
    { ...empty, recent_submissions: [pendingSubmission, draft] },
    { ...empty, recent_claims: [pendingClaim], recent_submissions: [draft] },
  ])("prioritizes pending verification over drafts and shows actual details", (summary) => {
    expect(deriveUmkmWorkspaceState(summary)).toBe("PENDING_VERIFICATION");
    const html = renderToStaticMarkup(<UmkmPendingState summary={summary} />);
    expect(html).toContain("Pengajuan Anda sedang diperiksa");
    expect(html).toContain("Menunggu Review");
    expect(html).toContain("Langkah berikutnya");
    expect(html).toContain("Pengajuan dibuat");
    expect(html).not.toMatch(/Intelligence|Promosi|locked/i);
  });
  it("activates workspace from ownership only; approvals in history are not ownership", () => {
    expect(deriveUmkmWorkspaceState({ ...empty, recent_claims: [{ ...pendingClaim, status: "APPROVED" }], recent_submissions: [{ ...draft, status: "APPROVED" }] })).toBe("NO_MERCHANT");
    expect(deriveUmkmWorkspaceState({ ...empty, owned_merchants: [one] })).toBe("ACTIVE_MERCHANT");
  });
  it.each([
    { ...empty, owned_merchants: [one], recent_claims: [pendingClaim] },
    { ...empty, owned_merchants: [one], recent_submissions: [pendingSubmission] },
  ])("preserves active workspace when another application is pending", (summary) => {
    expect(deriveUmkmWorkspaceState(summary)).toBe("ACTIVE_WITH_PENDING");
  });
  it("closed workflows never masquerade as pending verification", () => {
    expect(deriveUmkmWorkspaceState({ ...empty, recent_submissions: [{ ...draft, status: "CANCELLED" }, { ...draft, status: "REJECTED" }], recent_claims: [{ ...pendingClaim, status: "REJECTED" }] })).toBe("NO_MERCHANT");
  });
  it("switches to the chosen owned merchant and recovers if ownership disappears", () => {
    expect(resolveSelectedMerchant([one], null)?.id).toBe("one");
    expect(resolveSelectedMerchant([one, two], "two")?.id).toBe("two");
    expect(resolveSelectedMerchant([one], "two")?.id).toBe("one");
    expect(resolveSelectedMerchant([], "two")).toBeNull();
    expect(renderToStaticMarkup(<MerchantSelector merchants={[one]} selectedMerchantId="one" onSelect={vi.fn()} />)).toBe("");
    const html = renderToStaticMarkup(<MerchantSelector merchants={[one, two]} selectedMerchantId="two" onSelect={vi.fn()} />);
    expect(html).toContain('value="two" selected=""');
    expect(html).toContain("Usaha yang sedang dikelola");
  });
  it("offers five task sections with a single active section", () => {
    const html = renderToStaticMarkup(<UmkmWorkspaceNavigation section="visibilitas" onChange={vi.fn()} />);
    expect(html.match(/<button/g)).toHaveLength(5);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain("Peluang di Sekitar");
    expect(html).not.toContain("Copilot");
  });
  it("renders the selected merchant overview using active campaign count, with promotion scoped to that merchant", () => {
    const html = renderToStaticMarkup(<UmkmWorkspaceContent summary={{ ...empty, owned_merchants: [one, two] }} />);
    expect(html).toContain('data-workspace-state="ACTIVE_MERCHANT"');
    expect(html).toContain('data-selected-merchant-id="two"');
    expect(html).toContain("Yang perlu dilakukan");
    expect(html).toContain("Siap Dipromosikan");
    expect(html).toContain('/umkm/advertising?merchantId=two#buat-promosi');
    expect(html).not.toContain('/umkm/advertising?merchantId=one');
    expect(html).toMatch(/Promosi aktif<\/dt><dd[^>]*>0<\/dd>/);
  });
  it("keeps an active overview ahead of secondary pending status", () => {
    const html = renderToStaticMarkup(<UmkmWorkspaceContent summary={{ ...empty, owned_merchants: [one], recent_claims: [pendingClaim] }} />);
    expect(html).toContain('data-workspace-state="ACTIVE_WITH_PENDING"');
    expect(html.indexOf("Yang perlu dilakukan")).toBeLessThan(html.indexOf("Status pengajuan usaha lain"));
    expect(html).toContain("Warung Klaim");
    expect(html).not.toContain("Pengajuan Anda sedang diperiksa");
  });
  it("shows approved claim history as approved with the actual merchant management link", () => {
    const html = renderToStaticMarkup(<MerchantClaimDetailView claim={{ ...pendingClaim, status: "APPROVED" }} />);
    expect(html).toContain("Disetujui");
    expect(html).toContain("Kelola Usaha");
    expect(html).toContain('/umkm?merchantId=external');
    expect(html).not.toContain("Ditolak");
  });
});
