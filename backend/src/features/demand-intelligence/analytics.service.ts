import type { AnalyticsQuery, DemandIntelligenceResult } from "./analytics.types";
import { DemandIntelligenceRepository } from "./analytics.repository";

export class DemandIntelligenceService {
  constructor(private readonly repository: DemandIntelligenceRepository) {}

  async analyze(query: AnalyticsQuery): Promise<DemandIntelligenceResult> {
    return this.repository.get(query);
  }
}
