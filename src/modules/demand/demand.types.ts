export interface DescriptiveAggregationResult {
  environment: string;
  analysisMethod: "DESCRIPTIVE_AGGREGATION";
  sampleSize: number | "SUPPRESSED";
  
  // High-level grouping
  totalResponses: number;
  studyAreaId?: string;

  // Breakdown by specific categorical questions
  // e.g. "preferred_transport_mode" -> { "COMMUTER": 50, "BUS": 20 }
  categoricalBreakdown?: Record<string, Record<string, number>>;

  // Average for numeric questions
  // e.g. "max_walking_minutes" -> 15.5
  numericAverages?: Record<string, number>;
}
