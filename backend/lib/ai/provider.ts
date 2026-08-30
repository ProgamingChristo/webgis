import { anthropicProvider } from "@/lib/ai/anthropic";
import { openAIProvider } from "@/lib/ai/openai";
import { sub2ApiProvider } from "@/lib/ai/sub2api";
import type { AiProviderAdapter, ModelProvider, StructuredGenerationRequest } from "@/lib/ai/provider-contract";

const providers: Record<ModelProvider, AiProviderAdapter> = {
  openai: openAIProvider,
  claude: anthropicProvider,
  sub2api: sub2ApiProvider,
};

function preferredProvider(): ModelProvider | undefined {
  const configured = process.env.AI_PROVIDER?.toLowerCase();
  if (!configured) return undefined;
  if (configured === "openai" || configured === "claude" || configured === "sub2api") return configured;
  throw new Error(`Unsupported AI_PROVIDER: ${configured}`);
}

function providerOrder(): AiProviderAdapter[] {
  const preferred = preferredProvider();
  if (!preferred) return [providers.openai, providers.claude, providers.sub2api];
  // An explicitly selected provider is a deployment contract. Never route a
  // Claude failure or missing Claude credential to a different paid provider.
  return [providers[preferred]];
}

export async function generateStructured<T>(
  request: StructuredGenerationRequest<T>,
): Promise<{ data: T; source: ModelProvider } | null> {
  const preferred = preferredProvider();

  for (const provider of providerOrder()) {
    if (!provider.isConfigured()) continue;

    try {
      return { data: await provider.generateStructured(request), source: provider.id };
    } catch (error) {
      if (preferred) {
        throw error;
      }
      // Try the next configured adapter; deterministic fallback remains the caller's concern.
    }
  }

  return null;
}

export function getConfiguredProvider(): ModelProvider | "fallback" {
  return providerOrder().find((provider) => provider.isConfigured())?.id ?? "fallback";
}
