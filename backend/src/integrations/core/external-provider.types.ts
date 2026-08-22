export interface ExternalDataProvider<
  TQuery,
  TContext,
  TValidated,
  TNormalized,
> {
  fetch(query: TQuery, context: TContext): Promise<unknown>;
  validate(raw: unknown): TValidated;
  normalize(validated: TValidated, context: TContext): TNormalized;
}

export interface ExternalIntegrationMetrics {
  provider: string;
  started_at: string;
  finished_at: string;
  records_received: number;
  records_valid: number;
  records_invalid: number;
  duplicates: number;
}
