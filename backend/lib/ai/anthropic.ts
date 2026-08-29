import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AiProviderAdapter } from "@/lib/ai/provider-contract";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

/**
 * Hard upper bound for a single AI generation to protect Claude spend.
 * The service may request fewer tokens but never more.
 */
const MAX_TOKENS_CEILING = 1024;

export const anthropicProvider: AiProviderAdapter = {
  id: "claude",
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async generateStructured({ schema, instructions, input, maxTokens = 700 }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const client = new Anthropic({
      apiKey,
      ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}),
      timeout: 30_000,
      maxRetries: 1,
    });

    const response = await client.messages.parse({
      model: DEFAULT_MODEL,
      max_tokens: Math.min(Math.max(1, maxTokens), MAX_TOKENS_CEILING),
      system: instructions,
      messages: [{ role: "user", content: input }],
      output_config: {
        format: zodOutputFormat(schema),
      },
    });

    if (!response.parsed_output) {
      throw new Error("Claude returned no structured output");
    }

    return schema.parse(response.parsed_output);
  },
};
