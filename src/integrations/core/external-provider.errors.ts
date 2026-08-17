export class ExternalProviderError<TCode extends string> extends Error {
  constructor(
    readonly provider: string,
    readonly code: TCode,
    message: string,
    readonly retryable: boolean,
    readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = "ExternalProviderError";
  }
}
