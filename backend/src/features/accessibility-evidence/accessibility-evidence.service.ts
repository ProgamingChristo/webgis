import "server-only";

import { ApplicationError } from "@/src/lib/errors";
import type {
  AccessibilityEvidenceQuery,
  AccessibilityNeedQuery,
  AccessibilityReviewRequest,
} from "@/src/features/accessibility-evidence/accessibility-evidence.schema";
import type { AccessibilityEvidenceRepository } from "@/src/features/accessibility-evidence/accessibility-evidence.repository";

export class AccessibilityEvidenceService {
  constructor(private readonly repository: AccessibilityEvidenceRepository) {}

  list(query: AccessibilityEvidenceQuery) {
    return this.repository.list(query);
  }

  need(query: AccessibilityNeedQuery) {
    return this.repository.need(query);
  }

  async getDetail(evidenceId: string) {
    const detail = await this.repository.getDetail(evidenceId);
    if (!detail) throw new ApplicationError("NOT_FOUND");
    return detail;
  }

  review(evidenceId: string, input: AccessibilityReviewRequest) {
    return this.repository.review(evidenceId, input);
  }
}
