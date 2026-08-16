import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url(),
});

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;
export type EnvironmentInput = Record<string, string | undefined>;

export class EnvironmentValidationError extends Error {
  constructor(readonly fields: string[]) {
    super(`Missing or invalid environment configuration: ${fields.join(", ")}`);
    this.name = "EnvironmentValidationError";
  }
}

export function parseEnvironment(input: EnvironmentInput): PublicEnvironment {
  const parsed = publicEnvironmentSchema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  const fields = [
    ...new Set(
      parsed.error.issues
        .map((issue) => issue.path.join("."))
        .filter((field) => field.length > 0),
    ),
  ].sort();

  throw new EnvironmentValidationError(fields);
}

let cachedEnvironment: PublicEnvironment | undefined;

export function getEnvironment(): PublicEnvironment {
  cachedEnvironment ??= parseEnvironment({
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  return cachedEnvironment;
}

export function getRuntimeEnvironmentName(): string {
  return process.env.NODE_ENV || "development";
}
