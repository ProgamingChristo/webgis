import "server-only";

import {
  EnvironmentValidationError,
  getEnvironment,
  getRuntimeEnvironmentName,
} from "@/src/lib/env";
import { logger, type Logger } from "@/src/lib/logger";
import { getServerSupabaseClient } from "@/src/lib/supabase/server";
import { loadSpatialConfig } from "@/src/modules/spatial/spatial.config";
import { createHealthService } from "@/src/services/health.service";
import { loadApiSecurityConfig } from "@/src/lib/api-security/config";

export type BackendBootstrapResult = {
  database: "connected" | "unavailable";
};

type BootstrapDependencies = {
  configureSupabase: () => unknown;
  loadEnvironment: () => unknown;
  logger: Logger;
  runHealthCheck: () => Promise<unknown>;
};

function loadBackendEnvironment(): void {
  getEnvironment();
  loadApiSecurityConfig();
  loadSpatialConfig();
}

function getEnvironmentFailureContext(error: unknown): Record<string, string | number | boolean> {
  if (error instanceof EnvironmentValidationError) {
    return { fields: error.fields.join(",") };
  }

  return { category: "unknown" };
}

export async function bootstrapBackend(
  overrides: Partial<BootstrapDependencies> = {},
): Promise<BackendBootstrapResult> {
  const dependencies: BootstrapDependencies = {
    configureSupabase: getServerSupabaseClient,
    loadEnvironment: loadBackendEnvironment,
    logger,
    runHealthCheck: () => createHealthService().check(),
    ...overrides,
  };

  dependencies.logger.info("Starting backend...");

  try {
    dependencies.loadEnvironment();
  } catch (error) {
    dependencies.logger.error(
      "Environment configuration failed",
      getEnvironmentFailureContext(error),
    );
    throw error;
  }

  dependencies.logger.info("Environment loaded");
  dependencies.configureSupabase();
  dependencies.logger.info("Supabase configured");

  try {
    await dependencies.runHealthCheck();
    dependencies.logger.info("Database connected");
    dependencies.logger.info(`Environment: ${getRuntimeEnvironmentName()}`);
    dependencies.logger.info("Backend ready");
    return { database: "connected" };
  } catch {
    dependencies.logger.error("Database connection failed", {
      category: "supabase_probe_failed",
    });
    return { database: "unavailable" };
  }
}

type GlobalStartupState = typeof globalThis & {
  __getraBackendStartupPromise?: Promise<BackendBootstrapResult>;
};

export function initializeBackendOnce(): Promise<BackendBootstrapResult> {
  const globalState = globalThis as GlobalStartupState;
  globalState.__getraBackendStartupPromise ??= bootstrapBackend();
  return globalState.__getraBackendStartupPromise;
}
