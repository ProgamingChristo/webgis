import "server-only";

export type FetchImplementation = typeof fetch;

export class HttpTimeoutError extends Error {
  constructor() {
    super("HTTP_TIMEOUT");
    this.name = "HttpTimeoutError";
  }
}

export function createTimeoutFetch(
  timeoutMs: number,
  fetchImplementation: FetchImplementation = globalThis.fetch,
): FetchImplementation {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("HTTP timeout configuration is invalid");
  }

  return async (input, init = {}) => {
    const controller = new AbortController();
    const upstreamSignal = init.signal;
    const forwardAbort = () => controller.abort(upstreamSignal?.reason);

    if (upstreamSignal?.aborted) {
      forwardAbort();
    } else {
      upstreamSignal?.addEventListener("abort", forwardAbort, { once: true });
    }

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      return await fetchImplementation(input, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut && !upstreamSignal?.aborted) throw new HttpTimeoutError();
      throw error;
    } finally {
      clearTimeout(timeout);
      upstreamSignal?.removeEventListener("abort", forwardAbort);
    }
  };
}
