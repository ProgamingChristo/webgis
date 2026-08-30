import { z, type ZodType } from "zod";
import type { AiProviderAdapter } from "@/lib/ai/provider-contract";

const DEFAULT_BASE_URL = "https://api.mwapi.dev/v1";
const DEFAULT_MODEL =
  process.env.SUB2API_MODEL ?? "claude-sonnet-4-6";
const PROVIDER_COOLDOWN_MS = 60_000;
let unavailableUntil = 0;

const responseSchema = z.object({
  output: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
    })).optional(),
  })),
});

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

function getResponsesUrl(): string {
  const baseUrl = process.env.SUB2API_BASE_URL ?? DEFAULT_BASE_URL;
  return baseUrl.endsWith("/responses")
    ? baseUrl
    : `${baseUrl.replace(/\/$/, "")}/responses`;
}

async function requestSub2ApiStructured<T>({
  schema,
  schemaName,
  instructions,
  input,
  maxTokens = 700,
}: StructuredResponseOptions<T>): Promise<T> {
  const apiKey = process.env.SUB2API_API_KEY;
  if (!apiKey) throw new Error("SUB2API_API_KEY is not configured");
  if (Date.now() < unavailableUntil) throw new Error("Sub2API provider is cooling down");

  const response = await fetch(getResponsesUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      instructions,
      input,
      max_output_tokens: Math.min(Math.max(1, maxTokens), 1024),
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema: toStrictJsonSchema(schema),
        },
      },
    }),
  });

  if (!response.ok) {
    if ([401, 403, 429].includes(response.status) || response.status >= 500) {
      unavailableUntil = Date.now() + PROVIDER_COOLDOWN_MS;
    }
    throw new Error(`Sub2API Responses API returned ${response.status}`);
  }

  const payload = responseSchema.parse(await response.json());
  const outputText = payload.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;

  if (!outputText) throw new Error("Sub2API response did not contain output text");
  return schema.parse(JSON.parse(outputText));
}

export const sub2ApiProvider: AiProviderAdapter = {
  id: "sub2api",
  isConfigured: () => Boolean(process.env.SUB2API_API_KEY),
  generateStructured: requestSub2ApiStructured,
};
