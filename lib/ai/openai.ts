import { z, type ZodType } from "zod";
import type { AiProviderAdapter } from "@/lib/ai/provider-contract";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
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

async function requestOpenAIStructured<T>({
  schema,
  schemaName,
  instructions,
  input,
}: StructuredResponseOptions<T>): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  if (Date.now() < unavailableUntil) throw new Error("OpenAI provider is cooling down");

  const jsonSchema = toStrictJsonSchema(schema);
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      instructions,
      input,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    if ([401, 403, 429].includes(response.status) || response.status >= 500) {
      unavailableUntil = Date.now() + PROVIDER_COOLDOWN_MS;
    }
    throw new Error(`OpenAI Responses API returned ${response.status}`);
  }

  const payload = responseSchema.parse(await response.json());
  const outputText = payload.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;

  if (!outputText) throw new Error("OpenAI response did not contain output text");
  return schema.parse(JSON.parse(outputText));
}

export const openAIProvider: AiProviderAdapter = {
  id: "openai",
  isConfigured: () => Boolean(process.env.OPENAI_API_KEY),
  generateStructured: requestOpenAIStructured,
};
