import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { mapStudyAreaRowToDTO } from "@/src/mappers/domain.mapper";
import {
  createStudyAreaSchema,
  studyAreaFilterSchema,
  studyAreaListQuerySchema,
  updateStudyAreaSchema,
} from "@/src/schemas/data-model.schema";
import { boundingBoxSchema } from "@/src/schemas/spatial.schema";
import {
  assertRepositoryPagination,
  type ReadRepository,
  type RepositoryPage,
  type WriteRepository,
} from "@/src/repositories/contracts";
import { mapDatabaseError, RepositoryError } from "@/src/repositories/errors";
import {
  createProvenanceColumns,
  mapRepositoryRow,
  mapRepositoryRows,
  normalizeRepositoryRows,
  parseRepositoryInput,
  updateProvenanceColumns,
} from "@/src/repositories/repository.utils";
import type {
  CreateStudyAreaInput,
  StudyAreaDatabaseRow,
  StudyAreaDTO,
  StudyAreaFilter,
  StudyAreaListQuery,
  UpdateStudyAreaInput,
} from "@/src/types/domain";
import type { BoundingBox } from "@/src/types/spatial";

const STUDY_AREA_COLUMNS =
  "id, source_id, source_record_id, data_version, validation_status, retrieved_at, validated_at, metadata, name, description, geometry, created_at, updated_at, source:spatial_sources(source_type)";

export class StudyAreaRepository
  implements
    ReadRepository<StudyAreaDTO, StudyAreaListQuery, StudyAreaFilter>,
    WriteRepository<StudyAreaDTO, CreateStudyAreaInput, UpdateStudyAreaInput>
{
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<StudyAreaDTO | null> {
    const { data, error } = await this.supabase
      .from("study_areas")
      .select(STUDY_AREA_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "studyAreas.findById");
    }

    return data
      ? mapRepositoryRow<StudyAreaDatabaseRow, StudyAreaDTO>(
          data,
          mapStudyAreaRowToDTO,
          "studyAreas.findById.map",
        )
      : null;
  }

  async findMany(options: StudyAreaListQuery): Promise<RepositoryPage<StudyAreaDTO>> {
    const parsed = parseRepositoryInput(
      studyAreaListQuerySchema,
      options,
      "studyAreas.findMany.validate",
    );
    return this.executeListQuery("table", parsed);
  }

  async findWithinBBox(
    bbox: BoundingBox,
    options: StudyAreaListQuery,
  ): Promise<RepositoryPage<StudyAreaDTO>> {
    const parsedBbox = parseRepositoryInput(
      boundingBoxSchema,
      bbox,
      "studyAreas.findWithinBBox.validateBBox",
    );
    const parsedOptions = parseRepositoryInput(
      studyAreaListQuerySchema,
      options,
      "studyAreas.findWithinBBox.validateQuery",
    );
    return this.executeListQuery("bbox", parsedOptions, parsedBbox);
  }

  private async executeListQuery(
    source: "table" | "bbox",
    options: StudyAreaListQuery,
    bbox?: BoundingBox,
  ): Promise<RepositoryPage<StudyAreaDTO>> {
    const pagination = assertRepositoryPagination(options);
    let query = source === "bbox" && bbox
      ? this.supabase
          .rpc("find_study_areas_within_bbox", bbox, { count: "exact" })
          .select(STUDY_AREA_COLUMNS)
      : this.supabase
          .from("study_areas")
          .select(STUDY_AREA_COLUMNS, { count: "exact" });

    if (options.source_id) {
      query = query.eq("source_id", options.source_id);
    }

    if (options.validation_status) {
      query = query.eq("validation_status", options.validation_status);
    }

    const { data, error, count } = await query
      .order(options.sort, { ascending: options.order === "asc" })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);

    if (error) {
      throw mapDatabaseError(
        error,
        source === "bbox" ? "studyAreas.findWithinBBox" : "studyAreas.findMany",
      );
    }

    return {
      ...pagination,
      items: mapRepositoryRows<StudyAreaDatabaseRow, StudyAreaDTO>(
        normalizeRepositoryRows(data, "studyAreas.list.rows"),
        mapStudyAreaRowToDTO,
        "studyAreas.list.map",
      ),
      total: count ?? 0,
    };
  }

  async exists(id: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("study_areas")
      .select("id", { count: "exact", head: true })
      .eq("id", id);

    if (error) {
      throw mapDatabaseError(error, "studyAreas.exists");
    }

    return (count ?? 0) > 0;
  }

  async count(filters: StudyAreaFilter = {}): Promise<number> {
    const parsed = parseRepositoryInput(
      studyAreaFilterSchema,
      filters,
      "studyAreas.count.validate",
    );
    let query = this.supabase
      .from("study_areas")
      .select("id", { count: "exact", head: true });

    if (parsed.source_id) {
      query = query.eq("source_id", parsed.source_id);
    }

    if (parsed.validation_status) {
      query = query.eq("validation_status", parsed.validation_status);
    }

    const { count, error } = await query;

    if (error) {
      throw mapDatabaseError(error, "studyAreas.count");
    }

    return count ?? 0;
  }

  async create(input: CreateStudyAreaInput): Promise<StudyAreaDTO> {
    const parsed = parseRepositoryInput(
      createStudyAreaSchema,
      input,
      "studyAreas.create.validate",
    );
    const { provenance, ...entity } = parsed;
    const payload = { ...entity, ...createProvenanceColumns(provenance) };
    const { data, error } = await this.supabase
      .from("study_areas")
      .insert(payload)
      .select(STUDY_AREA_COLUMNS)
      .single();

    if (error) {
      throw mapDatabaseError(error, "studyAreas.create");
    }

    return mapRepositoryRow<StudyAreaDatabaseRow, StudyAreaDTO>(
      data,
      mapStudyAreaRowToDTO,
      "studyAreas.create.map",
    );
  }

  async update(id: string, input: UpdateStudyAreaInput): Promise<StudyAreaDTO> {
    const parsed = parseRepositoryInput(
      updateStudyAreaSchema,
      input,
      "studyAreas.update.validate",
    );
    const { provenance, ...entity } = parsed;
    const payload = { ...entity, ...updateProvenanceColumns(provenance) };
    const { data, error } = await this.supabase
      .from("study_areas")
      .update(payload)
      .eq("id", id)
      .select(STUDY_AREA_COLUMNS)
      .maybeSingle();

    if (error) {
      throw mapDatabaseError(error, "studyAreas.update");
    }

    if (!data) {
      throw new RepositoryError("NOT_FOUND", "studyAreas.update");
    }

    return mapRepositoryRow<StudyAreaDatabaseRow, StudyAreaDTO>(
      data,
      mapStudyAreaRowToDTO,
      "studyAreas.update.map",
    );
  }
}
