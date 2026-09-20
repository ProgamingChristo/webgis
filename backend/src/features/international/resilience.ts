export class ProviderUnavailable extends Error {
  constructor(public code: "CIRCUIT_OPEN" | "TIMEOUT", message: string) { super(message); }
}
type Circuit = { failures: number; until: number; probing: boolean };
const circuits = new Map<string, Circuit>();
const metrics = new Map<string, { requests: number; successes: number; failures: number; retries: number; circuit_rejections: number; latency_ms: number }>();
export function providerMetrics() { return Object.fromEntries([...metrics].map(([key, value]) => [key, { ...value, circuit: (circuits.get(key)?.until ?? 0) > Date.now() ? "OPEN" : "CLOSED" }])); }
export function resetProviderResilience() { circuits.clear(); metrics.clear(); }

/** GET/Overpass read requests only. Bounded retry budget, no retry of auth/404. */
export async function resilientRequest<T>(provider: string, execute: (signal: AbortSignal) => Promise<T>, options: {
  signal?: AbortSignal; timeoutMs?: number; retryable?: (error: unknown) => boolean; delayMs?: number;
} = {}): Promise<T> {
  if (circuits.size >= 200 && !circuits.has(provider)) { circuits.delete(circuits.keys().next().value!); metrics.delete(metrics.keys().next().value!); }
  const circuit = circuits.get(provider) ?? { failures: 0, until: 0, probing: false };
  circuits.set(provider, circuit);
  const meter = metrics.get(provider) ?? { requests: 0, successes: 0, failures: 0, retries: 0, circuit_rejections: 0, latency_ms: 0 };
  metrics.set(provider, meter);
  if (circuit.until > Date.now() || circuit.probing) { meter.circuit_rejections++; throw new ProviderUnavailable("CIRCUIT_OPEN", "Provider sedang dalam masa pemulihan. Coba kembali dalam satu menit."); }
  if (circuit.failures >= 3) circuit.probing = true;
  const started = Date.now();
  const signal = AbortSignal.any([AbortSignal.timeout(options.timeoutMs ?? 30000), ...(options.signal ? [options.signal] : [])]);
  meter.requests++;
  let lastError: unknown;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      signal.throwIfAborted();
      try {
        const value = await execute(signal);
        circuit.failures = 0; circuit.until = 0; meter.successes++;
        return value;
      } catch (error) {
        lastError = error;
        if (signal.aborted || !(options.retryable?.(error) ?? true) || attempt === 2) throw error;
        meter.retries++;
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => signal.removeEventListener("abort", abort);
          const timer = setTimeout(() => { cleanup(); resolve(); }, (options.delayMs ?? 250) * 2 ** attempt);
          const abort = () => { clearTimeout(timer); cleanup(); reject(signal.reason); };
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
        });
      }
    }
    throw lastError;
  } catch (error) {
    // Explicit caller cancellation is not evidence that the provider failed.
    if (!options.signal?.aborted) {
      meter.failures++;
      if (options.retryable?.(error) ?? true) { circuit.failures++; if (circuit.failures >= 3) circuit.until = Date.now() + 60000; }
    }
    throw error;
  } finally {
    circuit.probing = false; meter.latency_ms += Date.now() - started;
  }
}
