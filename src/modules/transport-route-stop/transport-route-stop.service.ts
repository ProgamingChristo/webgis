import "server-only";

import { TransportRouteStopRepository } from "@/src/repositories/transport-route-stop.repository";
import type { 
  TransportRouteStopDTO, 
  CreateTransportRouteStopInput, 
  TransportRouteStopListQuery 
} from "@/src/types/domain";
import type { RepositoryPage } from "@/src/repositories/contracts";

export class TransportRouteStopService {
  constructor(
    private readonly repository: TransportRouteStopRepository,
  ) {}

  async createRouteStop(input: CreateTransportRouteStopInput): Promise<TransportRouteStopDTO> {
    if (input.stop_sequence < 0) {
      throw new Error("stop_sequence must be >= 0");
    }
    
    return this.repository.create(input);
  }

  async findRouteStops(query: TransportRouteStopListQuery): Promise<RepositoryPage<TransportRouteStopDTO>> {
    return this.repository.findMany(query);
  }

  async upsertRouteStop(input: CreateTransportRouteStopInput): Promise<TransportRouteStopDTO> {
    if (input.stop_sequence < 0) {
      throw new Error("stop_sequence must be >= 0");
    }

    return this.repository.upsertByCorridorAndNode(input);
  }
}
