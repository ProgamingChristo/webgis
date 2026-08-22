import type { DatasetVersionRepository } from "./dataset-version.repository";
import type { DatasetVersion, CreateDatasetVersionInput } from "./dataset-version.types";
import { ApplicationError } from "@/src/lib/errors";
import type { JsonObject } from "@/src/types/provenance";

export class DatasetVersionService {
  constructor(private repo: DatasetVersionRepository) {}

  async createGoldenVersion(
    code: string, 
    version: string, 
    environment: "DUMMY" | "PRODUCTION",
    description?: string,
    manifest?: JsonObject
  ): Promise<DatasetVersion> {
    const existing = await this.repo.findByCode(code);
    if (existing) {
      if (existing.status === "ACTIVE") {
        throw new ApplicationError("CONFLICT", `Version ${code} is already active.`);
      }
      return existing;
    }

    const input: CreateDatasetVersionInput = {
      code,
      version,
      environment,
      status: "DRAFT",
      description: description ?? `Dataset Version ${code}`,
      manifest: manifest ?? {},
    };

    return await this.repo.create(input);
  }

  async markAsValidating(id: string): Promise<DatasetVersion> {
    return await this.repo.update(id, { status: "VALIDATING" });
  }

  async markAsValidationFailed(id: string, reason?: string): Promise<DatasetVersion> {
    return await this.repo.update(id, { 
      status: "VALIDATION_FAILED",
      description: reason ? `Failed: ${reason}` : undefined,
    });
  }

  async activateGoldenVersion(id: string): Promise<DatasetVersion> {
    const version = await this.repo.findById(id);
    if (!version) {
      throw new ApplicationError("NOT_FOUND", "Dataset version not found.");
    }
    
    // We only allow READY or DRAFT to be activated in this model.
    if (version.status === "VALIDATION_FAILED") {
      throw new ApplicationError("VALIDATION_ERROR", "Cannot activate a failed dataset.");
    }

    return await this.repo.update(id, {
      status: "ACTIVE",
      activated_at: new Date().toISOString(),
    });
  }
}
