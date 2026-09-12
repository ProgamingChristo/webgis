import { sub2ApiProvider } from "@/lib/ai/sub2api";
import { openAIProvider } from "@/lib/ai/openai";
import type { ModelProvider, StructuredGenerationRequest } from "@/lib/ai/provider-contract";
import { AiProviderError } from "@/src/lib/errors";

type ProviderMode = "deterministic" | "openai" | "sub2api";

function providerMode(): ProviderMode {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "deterministic") return "deterministic";
  if (configured === "openai" || configured === "sub2api") return configured;

  throw new AiProviderError({
    category: "configuration",
    provider: "openai",
  });
}

export async function generateStructured<T>(
  request: StructuredGenerationRequest<T>,
): Promise<{ data: T; source: ModelProvider } | null> {
  if (providerMode() === "deterministic") {
    return null;
  }

  const mode = providerMode();
  const provider = mode === "openai" ? openAIProvider : sub2ApiProvider;
  const providerId = mode === "openai" ? "openai" : "sub2api";
  if (!provider.isConfigured()) {
    throw new AiProviderError({
      category: "configuration",
      provider: providerId,
    });
  }

  return {
    data: await provider.generateStructured(request),
    source: providerId,
  };
}

export function getConfiguredProvider(): ModelProvider | "fallback" {
  if (providerMode() === "deterministic") return "fallback";
  const mode = providerMode();
  const provider = mode === "openai" ? openAIProvider : sub2ApiProvider;
  const providerId = mode === "openai" ? "openai" : "sub2api";
  if (!provider.isConfigured()) {
    throw new AiProviderError({
      category: "configuration",
      provider: providerId,
    });
  }
  return providerId;
}
