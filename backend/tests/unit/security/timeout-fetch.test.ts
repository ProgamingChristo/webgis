import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createTimeoutFetch, HttpTimeoutError } from "@/src/lib/http/timeout-fetch";

const TEST_URL = "https://upstream.test/resource";

function pendingUntilAborted() {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }
      signal?.addEventListener(
        "abort",
        () => reject(signal.reason),
        { once: true },
      );
    }),
  );
}

describe("timeout fetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects invalid timeout configuration before issuing a request", () => {
    const fetchImplementation = vi.fn();

    for (const timeoutMs of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        createTimeoutFetch(timeoutMs, fetchImplementation as typeof fetch),
      ).toThrow("HTTP timeout configuration is invalid");
    }
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("aborts a hanging upstream request at the configured deadline", async () => {
    const fetchImplementation = pendingUntilAborted();
    const timeoutFetch = createTimeoutFetch(
      250,
      fetchImplementation as typeof fetch,
    );
    const operation = timeoutFetch(TEST_URL);
    const rejection = expect(operation).rejects.toBeInstanceOf(HttpTimeoutError);

    await vi.advanceTimersByTimeAsync(249);
    expect(fetchImplementation).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await rejection;

    const forwardedInit = fetchImplementation.mock.calls[0]?.[1];
    expect(forwardedInit?.signal?.aborted).toBe(true);
  });

  it("forwards caller cancellation and its reason", async () => {
    const fetchImplementation = pendingUntilAborted();
    const timeoutFetch = createTimeoutFetch(
      10_000,
      fetchImplementation as typeof fetch,
    );
    const caller = new AbortController();
    const reason = new Error("TEST caller cancellation");
    const operation = timeoutFetch(TEST_URL, { signal: caller.signal });
    const rejection = expect(operation).rejects.toBe(reason);

    caller.abort(reason);
    await rejection;

    const forwardedInit = fetchImplementation.mock.calls[0]?.[1];
    expect(forwardedInit?.signal?.aborted).toBe(true);
    expect(forwardedInit?.signal?.reason).toBe(reason);
  });

  it("forwards an already-aborted caller signal", async () => {
    const fetchImplementation = pendingUntilAborted();
    const timeoutFetch = createTimeoutFetch(
      10_000,
      fetchImplementation as typeof fetch,
    );
    const caller = new AbortController();
    const reason = new Error("TEST pre-aborted caller");
    caller.abort(reason);

    await expect(
      timeoutFetch(TEST_URL, { signal: caller.signal }),
    ).rejects.toBe(reason);
    expect(fetchImplementation.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("clears the timeout and removes caller listeners after success", async () => {
    const response = new Response(null, { status: 204 });
    let forwardedSignal: AbortSignal | null | undefined;
    const fetchImplementation = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        forwardedSignal = init?.signal;
        return response;
      },
    );
    const timeoutFetch = createTimeoutFetch(
      250,
      fetchImplementation as typeof fetch,
    );
    const caller = new AbortController();
    const addListener = vi.spyOn(caller.signal, "addEventListener");
    const removeListener = vi.spyOn(caller.signal, "removeEventListener");

    await expect(
      timeoutFetch(TEST_URL, { signal: caller.signal }),
    ).resolves.toBe(response);
    expect(addListener).toHaveBeenCalledWith(
      "abort",
      expect.any(Function),
      { once: true },
    );
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));

    await vi.advanceTimersByTimeAsync(1_000);
    expect(forwardedSignal?.aborted).toBe(false);
  });
});
