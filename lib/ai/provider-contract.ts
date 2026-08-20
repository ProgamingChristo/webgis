import type { ZodType } from "zod";
import type { AiProvider } from "@/lib/contracts/search";

export type ModelProvider = Exclude<AiProvider, "fallback">;

export type StructuredGenerationRequest<T> = {
  schema: ZodType<T>;
  schemaName: string;
  instructions: string;
  input: string;
  maxTokens?: number;
};

export interface AiProviderAdapter {
  readonly id: ModelProvider;
  isConfigured(): boolean;
  generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<T>;
}
