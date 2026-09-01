import { sub2ApiProvider } from "@/lib/ai/sub2api";
import type { ModelProvider, StructuredGenerationRequest } from "@/lib/ai/provider-contract";
import { AiProviderError } from "@/src/lib/errors";

type ProviderMode = "deterministic" | "sub2api";

function providerMode(): ProviderMode {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "deterministic") return "deterministic";
  if (configured === "sub2api") return configured;

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

  if (!sub2ApiProvider.isConfigured()) {
    throw new AiProviderError({
      category: "configuration",
      provider: "sub2api",
    });
  }

  return {
    data: await sub2ApiProvider.generateStructured(request),
    source: "sub2api",
  };
}

export function getConfiguredProvider(): ModelProvider | "fallback" {
  if (providerMode() === "deterministic") return "fallback";
  if (!sub2ApiProvider.isConfigured()) {
    throw new AiProviderError({
      category: "configuration",
      provider: "sub2api",
    });
  }
  return "sub2api";
}
