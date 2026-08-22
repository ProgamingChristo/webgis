import "server-only";

import { StudyAreaRepository } from "@/src/repositories/study-area.repository";
import { SpatialService } from "@/src/modules/spatial/spatial.service";
import type { StudyAreaDTO, StudyAreaListQuery, CreateStudyAreaInput } from "@/src/types/domain";
import type { GeoJsonGeometry } from "@/src/types/spatial";

export class StudyAreaService {
  constructor(
    private readonly repository: StudyAreaRepository,
    private readonly spatialService: SpatialService,
  ) {}

  async findPilotByCode(code: string): Promise<StudyAreaDTO | null> {
    const query: StudyAreaListQuery = {
      limit: 100,
      offset: 0,
      page: 1,
      sort: "created_at",
      order: "desc",
    };
    const result = await this.repository.findMany(query);
    return result.items.find((item) => item.name === code) ?? null;
  }

  async validatePilotGeometry(geometry: GeoJsonGeometry): Promise<boolean> {
    try {
      const srid = await this.spatialService.validateGeometry(geometry);
      return srid === 4326;
    } catch {
      return false;
    }
  }

  async createPilotArea(input: CreateStudyAreaInput): Promise<StudyAreaDTO> {
    const isValid = await this.validatePilotGeometry(input.geometry);
    if (!isValid) {
      throw new Error("Invalid geometry for Pilot Area");
    }
    return this.repository.create(input);
  }
}
