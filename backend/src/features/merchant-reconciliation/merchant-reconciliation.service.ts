import { chooseBestMerchantDecision } from "./merchant-matching";
import { MerchantReconciliationRepository } from "./merchant-reconciliation.repository";
import {
  MERCHANT_RECONCILIATION_ALGORITHM_VERSION,
  type MerchantCandidateInput,
  type MerchantReconciliationReport,
} from "./merchant-reconciliation.types";

let reconciliationActive = false;

export class MerchantReconciliationService {
  constructor(private readonly repository: MerchantReconciliationRepository) {}

  async getSummary() {
    return this.repository.getSummary();
  }

  async reconcile(): Promise<MerchantReconciliationReport> {
    if (reconciliationActive) throw new Error("MERCHANT_RECONCILIATION_ALREADY_RUNNING");
    reconciliationActive = true;
    const startedAt = new Date().toISOString();

    try {
      const [candidates, premiumEvidence, sourceIds] = await Promise.all([
        this.repository.listCandidateInputs(),
        this.repository.listPremiumEvidence(),
        this.repository.getSourceIds(),
      ]);
      const sourceLinksUpserted = await this.repository.linkPremiumEvidence(
        sourceIds.premium,
        premiumEvidence,
      );
      const grouped = groupByMenuObservation(candidates);
      const report = {
        confirmed: 0,
        high_confidence: 0,
        review_required: 0,
        no_match: 0,
        canonical_merchants_created: 0,
        canonical_merchants_reused: 0,
      };

      for (const group of grouped.values()) {
        const decision = chooseBestMerchantDecision(group);
        if (decision.status === "MATCH_CONFIRMED") report.confirmed += 1;
        if (decision.status === "MATCH_HIGH_CONFIDENCE") report.high_confidence += 1;
        if (decision.status === "MATCH_REVIEW_REQUIRED") report.review_required += 1;
        if (decision.status === "NO_MATCH") report.no_match += 1;

        const resolution = await this.repository.resolveMenuCanonical(decision);
        if (resolution.created) report.canonical_merchants_created += 1;
        else report.canonical_merchants_reused += 1;
        await this.repository.persistDecision(
          decision,
          resolution.merchantId,
          sourceIds.menuGo,
        );
      }

      return {
        algorithm_version: MERCHANT_RECONCILIATION_ALGORITHM_VERSION,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        premium_input: premiumEvidence.length,
        menu_go_input: grouped.size,
        source_links_upserted: sourceLinksUpserted + grouped.size,
        ...report,
      };
    } finally {
      reconciliationActive = false;
    }
  }
}

function groupByMenuObservation(candidates: MerchantCandidateInput[]) {
  const grouped = new Map<string, MerchantCandidateInput[]>();
  for (const candidate of candidates) {
    grouped.set(candidate.menuObservationId, [
      ...(grouped.get(candidate.menuObservationId) ?? []),
      candidate,
    ]);
  }
  return grouped;
}

