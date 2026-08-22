import "server-only";

import { DatabaseUnavailableError } from "@/src/lib/errors";
import {
  SupabaseHealthRepository,
  type DatabaseHealthRepository,
} from "@/src/repositories/supabase-health.repository";

export type HealthData = {
  database: "connected";
  service: "getra-api";
  status: "ok";
};

export interface HealthChecker {
  check: () => Promise<HealthData>;
}

export class HealthService implements HealthChecker {
  constructor(private readonly repository: DatabaseHealthRepository) {}

  async check(): Promise<HealthData> {
    const connection = await this.repository.checkConnection();

    if (connection.status !== "connected") {
      throw new DatabaseUnavailableError();
    }

    return {
      database: "connected",
      service: "getra-api",
      status: "ok",
    };
  }
}

export function createHealthService(): HealthService {
  return new HealthService(new SupabaseHealthRepository());
}
