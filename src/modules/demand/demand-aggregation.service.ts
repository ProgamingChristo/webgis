import { SupabaseClient } from "@supabase/supabase-js";
import { MIN_AGGREGATION_SAMPLE_SIZE, SUPPRESSED_VALUE } from "@/src/modules/privacy/privacy.constants";
import { DescriptiveAggregationResult } from "./demand.types";

export class DemandAggregationService {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Generates a descriptive aggregation of survey responses for a specific survey in a given environment.
   * Does NOT perform any AI analysis, predictions, or scoring.
   * If the total sample size is below the privacy threshold, it suppresses the result.
   */
  async aggregateDescriptiveDemand(
    surveyId: string, 
    environment: string,
    studyAreaId?: string
  ): Promise<DescriptiveAggregationResult> {
    
    // 1. Fetch raw responses
    let query = this.client
      .from("survey_responses")
      .select("answers")
      .eq("survey_id", surveyId)
      .eq("environment", environment)
      .eq("validation_status", "VALIDATED");

    if (studyAreaId) {
      query = query.eq("study_area_id", studyAreaId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch responses for aggregation: ${error.message}`);

    const totalResponses = data.length;

    // 2. Privacy Suppression Check
    if (totalResponses < MIN_AGGREGATION_SAMPLE_SIZE) {
      return {
        environment,
        analysisMethod: "DESCRIPTIVE_AGGREGATION",
        sampleSize: SUPPRESSED_VALUE,
        totalResponses: 0,
        studyAreaId
      };
    }

    // 3. Perform basic descriptive counting
    const categoricalBreakdown: Record<string, Record<string, number>> = {};
    const numericSums: Record<string, number> = {};
    const numericCounts: Record<string, number> = {};

    for (const row of data) {
      const answers = row.answers as Record<string, any>;
      
      for (const [key, val] of Object.entries(answers)) {
        if (typeof val === "string") {
          // Categorical (e.g. SINGLE_CHOICE)
          if (!categoricalBreakdown[key]) categoricalBreakdown[key] = {};
          categoricalBreakdown[key][val] = (categoricalBreakdown[key][val] || 0) + 1;
        } else if (typeof val === "number") {
          // Numeric (e.g. NUMBER)
          numericSums[key] = (numericSums[key] || 0) + val;
          numericCounts[key] = (numericCounts[key] || 0) + 1;
        }
      }
    }

    const numericAverages: Record<string, number> = {};
    for (const key of Object.keys(numericSums)) {
      numericAverages[key] = numericSums[key] / numericCounts[key];
    }

    return {
      environment,
      analysisMethod: "DESCRIPTIVE_AGGREGATION",
      sampleSize: totalResponses,
      totalResponses,
      studyAreaId,
      categoricalBreakdown,
      numericAverages
    };
  }
}
