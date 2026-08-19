/**
 * Phase 13: Data Privacy Foundation
 * Defines thresholds and constants for data minimization and privacy suppression.
 */

/**
 * The minimum number of responses required in a specific cohort or spatial area
 * before descriptive aggregation results can be exposed. If a group falls below
 * this threshold, the result should be suppressed or generalized to prevent
 * individual identification.
 * 
 * For Dummy Data (Phase 13), this is kept small (5) to allow testing.
 * In production, this should be evaluated by policy (e.g. 10 or 20).
 */
export const MIN_AGGREGATION_SAMPLE_SIZE = 5;

/**
 * Indicates a result has been suppressed due to falling below the sample size threshold.
 */
export const SUPPRESSED_VALUE = "SUPPRESSED";
