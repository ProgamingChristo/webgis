import "server-only";

import { TransportCorridorRepository } from "@/src/repositories/transport-corridor.repository";
import type { SpatialService } from "@/src/modules/spatial/spatial.service";
import type { TransportValidationResult } from "@/src/modules/transport/transport.types";
import type { 
  TransportCorridorDTO, 
  CreateTransportCorridorInput, 
  TransportCorridorListQuery 
} from "@/src/types/domain";
import { transportModeSchema } from "@/src/modules/transport/transport.types";
import type { RepositoryPage } from "@/src/repositories/contracts";

export class TransportCorridorService {
  constructor(
    private readonly repository: TransportCorridorRepository,
    private readonly spatialService: SpatialService,
  ) {}

  async validateCorridor(input: CreateTransportCorridorInput): Promise<TransportValidationResult> {
    const issues: string[] = [];
    
    const parsedMode = transportModeSchema.safeParse(input.transport_mode);
    if (!parsedMode.success) {
      issues.push(`Invalid transport mode: ${input.transport_mode}`);
    }

    try {
      const srid = await this.spatialService.validateGeometry(input.geometry);
      if (srid !== 4326) {
        issues.push(`Invalid SRID: ${srid}. Expected 4326.`);
      }
    } catch {
      issues.push("Invalid or missing geometry");
    }

    return {
      isValid: issues.length === 0,
      issues,
      status: issues.length === 0 ? "VALIDATED" : "REJECTED"
    };
  }

  async createCorridor(input: CreateTransportCorridorInput): Promise<TransportCorridorDTO> {
    const validation = await this.validateCorridor(input);
    
    if (!validation.isValid) {
      input.provenance.validation_status = "REJECTED";
      // Even if rejected, we might still store it if the requirement allows,
      // but typically we'd throw or mark it rejected.
    } else {
      input.provenance.validation_status = "VALIDATED";
      input.provenance.validated_at = new Date().toISOString();
    }
    
    return this.repository.create(input);
  }

  async findCorridors(query: TransportCorridorListQuery): Promise<RepositoryPage<TransportCorridorDTO>> {
    return this.repository.findMany(query);
  }

  async findCorridorById(id: string): Promise<TransportCorridorDTO | null> {
    return this.repository.findById(id);
  }
}
