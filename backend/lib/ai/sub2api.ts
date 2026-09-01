import { z, type ZodType } from "zod";

import type { AiProviderAdapter } from "@/lib/ai/provider-contract";
import { AiProviderError } from "@/src/lib/errors";

const DEFAULT_BASE_URL = "https://api.mwapi.dev/v1";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_TIMEOUT_MS = 20_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 25_000;
const MAX_RESPONSE_BYTES = 262_144;
const MAX_DIAGNOSTIC_LENGTH = 240;

const responseSchema = z.object({
  output_text: z.string().optional(),
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
    }).passthrough()).optional(),
  }).passthrough()).optional(),
}).passthrough();

const upstreamErrorSchema = z.object({
  error: z.object({
    code: z.union([z.string(), z.number()]).optional(),
    message: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

type StructuredResponseOptions<T> = {
  schema: ZodType<T>;
  schemaName: string;
  instructions: string;
  input: string;
  maxTokens?: number;
};

function toStrictJsonSchema(schema: ZodType) {
  const jsonSchema = z.toJSONSchema(schema);

  const sanitize = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(sanitize);
      return;
    }

    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    for (const keyword of ["$schema", "default", "minimum", "maximum", "minLength", "maxLength"]) {
      delete record[keyword];
    }
    Object.values(record).forEach(sanitize);
  };

  sanitize(jsonSchema);
  return jsonSchema;
}

function buildStructuredInstructions(instructions: string, schemaName: string, schema: ZodType): string {
  const jsonSchema = JSON.stringify(toStrictJsonSchema(schema));
  return `${instructions}\n\nOUTPUT CONTRACT (${schemaName}):\nReturn exactly one valid JSON object matching this JSON Schema:\n${jsonSchema}\nDo not wrap the JSON in Markdown or code fences. Do not add commentary before or after the JSON.`;
}

function configurationError(): AiProviderError {
  return new AiProviderError({
    category: "configuration",
    provider: "sub2api",
  });
}

function getResponsesUrl(): string {
  const configured = process.env.SUB2API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw configurationError();
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw configurationError();
  }

  const normalizedPath = url.pathname.replace(/\/$/u, "");
  url.pathname = normalizedPath.endsWith("/responses")
    ? normalizedPath
    : `${normalizedPath}/responses`;
  return url.toString();
}

function getModel(): string {
  const model = process.env.SUB2API_MODEL?.trim() || DEFAULT_MODEL;
  if (model.length > 120 || !/^[a-zA-Z0-9._:-]+$/u.test(model)) {
    throw configurationError();
  }
  return model;
}

function getTimeoutMs(): number {
  const configured = process.env.SUB2API_TIMEOUT_MS?.trim();
  if (!configured) return DEFAULT_TIMEOUT_MS;

  const timeout = Number(configured);
  if (!Number.isInteger(timeout) || timeout < MIN_TIMEOUT_MS || timeout > MAX_TIMEOUT_MS) {
    throw configurationError();
  }
  return timeout;
}

function sanitizeDiagnostic(value: unknown, secrets: readonly string[] = []): string | undefined {
  if (typeof value !== "string") return undefined;
  let sanitized = value;
  for (const secret of secrets) {
    if (secret) sanitized = sanitized.split(secret).join("[REDACTED]");
  }
  sanitized = sanitized
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/bearer\s+\S+/giu, "Bearer [REDACTED]")
    .replace(/(?:sk|key)-[a-z0-9_-]{8,}/giu, "[REDACTED]")
    .replace(/\s+/gu, " ")
    .trim();
  return sanitized ? sanitized.slice(0, MAX_DIAGNOSTIC_LENGTH) : undefined;
}

function parseUpstreamDiagnostic(rawBody: string, apiKey: string): {
  upstreamCode?: string;
  upstreamMessage?: string;
} {
  try {
    const parsed = upstreamErrorSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success || !parsed.data.error) return {};
    return {
      upstreamCode: parsed.data.error.code === undefined
        ? undefined
        : sanitizeDiagnostic(String(parsed.data.error.code), [apiKey])?.slice(0, 80),
      upstreamMessage: sanitizeDiagnostic(parsed.data.error.message, [apiKey]),
    };
  } catch {
    return {};
  }
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name);
}

function extractOutputText(payload: z.infer<typeof responseSchema>): string | undefined {
  if (payload.output_text?.trim()) return payload.output_text;

  return payload.output
    ?.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text" && item.text?.trim())
    ?.text;
}

async function requestSub2ApiStructured<T>({
  schema,
  schemaName,
  instructions,
  input,
  maxTokens = 700,
}: StructuredResponseOptions<T>): Promise<T> {
  const apiKey = process.env.SUB2API_API_KEY?.trim();
  if (!apiKey) throw configurationError();

  let response: Response;
  try {
    response = await fetch(getResponsesUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(getTimeoutMs()),
      body: JSON.stringify({
        model: getModel(),
        instructions: buildStructuredInstructions(instructions, schemaName, schema),
        input,
        max_output_tokens: Math.min(Math.max(1, maxTokens), 1024),
        store: false,
      }),
    });
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new AiProviderError({
      category: isTimeoutError(error) ? "timeout" : "unavailable",
      provider: "sub2api",
    });
  }

  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    throw new AiProviderError({
      category: "invalid_response",
      provider: "sub2api",
      upstreamStatus: response.status,
    });
  }

  if (!response.ok) {
    const diagnostic = parseUpstreamDiagnostic(rawBody, apiKey);
    const temporarilyUnavailable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw new AiProviderError({
      category: temporarilyUnavailable ? "unavailable" : "upstream",
      provider: "sub2api",
      upstreamStatus: response.status,
      ...diagnostic,
    });
  }

  if (!rawBody || rawBody.length > MAX_RESPONSE_BYTES) {
    throw new AiProviderError({
      category: "invalid_response",
      provider: "sub2api",
      upstreamStatus: response.status,
    });
  }

  let payload: z.infer<typeof responseSchema>;
  try {
    payload = responseSchema.parse(JSON.parse(rawBody));
  } catch {
    throw new AiProviderError({
      category: "invalid_response",
      provider: "sub2api",
      upstreamStatus: response.status,
    });
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new AiProviderError({
      category: "invalid_response",
      provider: "sub2api",
      upstreamStatus: response.status,
    });
  }

  try {
    return schema.parse(JSON.parse(outputText));
  } catch {
    throw new AiProviderError({
      category: "invalid_response",
      provider: "sub2api",
      upstreamStatus: response.status,
    });
  }
}

export const sub2ApiProvider: AiProviderAdapter = {
  id: "sub2api",
  isConfigured: () => Boolean(process.env.SUB2API_API_KEY?.trim()),
  generateStructured: requestSub2ApiStructured,
};
