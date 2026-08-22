import "server-only";

import { TransportNodeRepository } from "@/src/repositories/transport-node.repository";
import type { SpatialService } from "@/src/modules/spatial/spatial.service";
import type { TransportValidationResult } from "@/src/modules/transport/transport.types";
import type { 
  TransportNodeDTO, 
  CreateTransportNodeInput, 
  TransportNodeListQuery 
} from "@/src/types/domain";
import { transportModeSchema, transportNodeTypeSchema } from "@/src/modules/transport/transport.types";
import type { RepositoryPage } from "@/src/repositories/contracts";

export class TransportNodeService {
  constructor(
    private readonly repository: TransportNodeRepository,
    private readonly spatialService: SpatialService,
  ) {}

  async validateNode(input: CreateTransportNodeInput): Promise<TransportValidationResult> {
    const issues: string[] = [];
    
    const parsedMode = transportModeSchema.safeParse(input.transport_mode);
    if (!parsedMode.success) {
      issues.push(`Invalid transport mode: ${input.transport_mode}`);
    }

    const parsedType = transportNodeTypeSchema.safeParse(input.node_type);
    if (!parsedType.success) {
      issues.push(`Invalid node type: ${input.node_type}`);
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

  async createNode(input: CreateTransportNodeInput): Promise<TransportNodeDTO> {
    const validation = await this.validateNode(input);
    
    if (!validation.isValid) {
      input.provenance.validation_status = "REJECTED";
    } else {
      input.provenance.validation_status = "VALIDATED";
      input.provenance.validated_at = new Date().toISOString();
    }
    
    return this.repository.create(input);
  }

  async findNodes(query: TransportNodeListQuery): Promise<RepositoryPage<TransportNodeDTO>> {
    return this.repository.findMany(query);
  }

  async findNodeById(id: string): Promise<TransportNodeDTO | null> {
    return this.repository.findById(id);
  }
}
