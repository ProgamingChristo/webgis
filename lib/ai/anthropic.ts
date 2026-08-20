import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AiProviderAdapter } from "@/lib/ai/provider-contract";

export const anthropicProvider: AiProviderAdapter = {
  id: "claude",
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async generateStructured({ schema, instructions, input, maxTokens = 700 }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
      max_tokens: maxTokens,
      system: instructions,
      messages: [{ role: "user", content: input }],
      output_format: zodOutputFormat(schema),
    });

    return schema.parse(response.parsed_output);
  },
};
