import { anthropicProvider } from "@/lib/ai/anthropic";
import { openAIProvider } from "@/lib/ai/openai";
import type { AiProviderAdapter, ModelProvider, StructuredGenerationRequest } from "@/lib/ai/provider-contract";

const providers: Record<ModelProvider, AiProviderAdapter> = {
  openai: openAIProvider,
  claude: anthropicProvider,
};

function preferredProvider(): ModelProvider | undefined {
  const configured = process.env.AI_PROVIDER?.toLowerCase();
  return configured === "openai" || configured === "claude" ? configured : undefined;
}

function providerOrder(): AiProviderAdapter[] {
  const preferred = preferredProvider();
  if (!preferred) return [providers.openai, providers.claude];
  return [providers[preferred], ...Object.values(providers).filter((provider) => provider.id !== preferred)];
}

export async function generateStructured<T>(
  request: StructuredGenerationRequest<T>,
): Promise<{ data: T; source: ModelProvider } | null> {
  for (const provider of providerOrder()) {
    if (!provider.isConfigured()) continue;

    try {
      return { data: await provider.generateStructured(request), source: provider.id };
    } catch {
      // Try the next configured adapter; deterministic fallback remains the caller's concern.
    }
  }

  return null;
}

export function getConfiguredProvider(): ModelProvider | "fallback" {
  return providerOrder().find((provider) => provider.isConfigured())?.id ?? "fallback";
}
