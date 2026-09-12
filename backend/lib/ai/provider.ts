import { openAIProvider } from "@/lib/ai/openai";
import { sub2ApiProvider } from "@/lib/ai/sub2api";
import type { ModelProvider, StructuredGenerationRequest } from "@/lib/ai/provider-contract";
import { AiProviderError } from "@/src/lib/errors";

type ProviderMode = "deterministic" | "sub2api" | "openai";

function providerMode(): ProviderMode {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "deterministic") return "deterministic";
  if (configured === "sub2api" || configured === "openai") return configured;

  throw new AiProviderError({
    category: "configuration",
    provider: "sub2api",
  });
}

export async function generateStructured<T>(
  request: StructuredGenerationRequest<T>,
): Promise<{ data: T; source: ModelProvider } | null> {
  if (providerMode() === "deterministic") {
    return null;
  }

  const selected = providerMode() === "openai" ? openAIProvider : sub2ApiProvider;
  if (!selected.isConfigured()) {
    throw new AiProviderError({
      category: "configuration",
      provider: selected.id === "openai" ? "openai" : "sub2api",
    });
  }

  return {
    data: await selected.generateStructured(request),
    source: selected.id,
  };
}

export function getConfiguredProvider(): ModelProvider | "fallback" {
  if (providerMode() === "deterministic") return "fallback";
  const selected = providerMode() === "openai" ? openAIProvider : sub2ApiProvider;
  if (!selected.isConfigured()) {
    throw new AiProviderError({
      category: "configuration",
      provider: selected.id === "openai" ? "openai" : "sub2api",
    });
  }
  return selected.id;
}
