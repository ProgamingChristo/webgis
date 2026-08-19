import { type SupabaseClient } from "@supabase/supabase-js";
import { mapDatabaseError } from "@/src/repositories/errors";
import type { 
  SurveyEntity, SurveyQuestionEntity, SurveyResponseEntity,
  SurveyDatabaseRow, SurveyQuestionDatabaseRow, SurveyResponseDatabaseRow,
  CreateSurveyInput, CreateSurveyQuestionInput, CreateSurveyResponseInput
} from "./survey.types";

export class SurveyRepository {
  constructor(private readonly client: SupabaseClient) {}

  // --- Surveys ---

  async findSurveyByCodeAndVersion(code: string, version: string, environment: string): Promise<SurveyEntity | null> {
    const { data, error } = await this.client
      .from("surveys")
      .select("*")
      .eq("code", code)
      .eq("version", version)
      .eq("environment", environment)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "SurveyRepository.findSurveyByCodeAndVersion");
    }
    return this.mapToSurveyEntity(data as unknown as SurveyDatabaseRow);
  }

  async createSurvey(input: CreateSurveyInput): Promise<SurveyEntity> {
    const { data, error } = await this.client
      .from("surveys")
      .insert({
        code: input.code,
        name: input.name,
        version: input.version,
        status: input.status,
        environment: input.environment,
        source_id: input.sourceId
      })
      .select("*")
      .single();

    if (error) throw mapDatabaseError(error, "SurveyRepository.createSurvey");
    return this.mapToSurveyEntity(data as unknown as SurveyDatabaseRow);
  }

  // --- Questions ---

  async findQuestionsBySurvey(surveyId: string): Promise<SurveyQuestionEntity[]> {
    const { data, error } = await this.client
      .from("survey_questions")
      .select("*")
      .eq("survey_id", surveyId)
      .order("sequence", { ascending: true });

    if (error) throw mapDatabaseError(error, "SurveyRepository.findQuestionsBySurvey");
    return (data as unknown as SurveyQuestionDatabaseRow[]).map(this.mapToQuestionEntity);
  }

  async createQuestion(input: CreateSurveyQuestionInput): Promise<SurveyQuestionEntity> {
    const { data, error } = await this.client
      .from("survey_questions")
      .insert({
        survey_id: input.surveyId,
        question_code: input.questionCode,
        question_type: input.questionType,
        required: input.required,
        options: input.options || null,
        sequence: input.sequence
      })
      .select("*")
      .single();

    if (error) throw mapDatabaseError(error, "SurveyRepository.createQuestion");
    return this.mapToQuestionEntity(data as unknown as SurveyQuestionDatabaseRow);
  }

  // --- Responses ---

  async findResponseByCode(surveyId: string, responseCode: string, environment: string): Promise<SurveyResponseEntity | null> {
    const { data, error } = await this.client
      .from("survey_responses")
      .select("*")
      .eq("survey_id", surveyId)
      .eq("response_code", responseCode)
      .eq("environment", environment)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw mapDatabaseError(error, "SurveyRepository.findResponseByCode");
    }
    return this.mapToResponseEntity(data as unknown as SurveyResponseDatabaseRow);
  }

  async createResponse(input: CreateSurveyResponseInput): Promise<SurveyResponseEntity> {
    const { data, error } = await this.client
      .from("survey_responses")
      .insert({
        survey_id: input.surveyId,
        response_code: input.responseCode,
        study_area_id: input.studyAreaId || null,
        origin_geometry: input.originGeometry ? `SRID=4326;POINT(${input.originGeometry.coordinates[0]} ${input.originGeometry.coordinates[1]})` : null,
        destination_geometry: input.destinationGeometry ? `SRID=4326;POINT(${input.destinationGeometry.coordinates[0]} ${input.destinationGeometry.coordinates[1]})` : null,
        answers: input.answers,
        environment: input.environment,
        source_id: input.sourceId || null,
        submitted_at: input.submittedAt || new Date().toISOString(),
        validation_status: "VALIDATED" // Assuming validated by service before hitting repo
      })
      .select("*")
      .single();

    if (error) throw mapDatabaseError(error, "SurveyRepository.createResponse");
    return this.mapToResponseEntity(data as unknown as SurveyResponseDatabaseRow);
  }

  // --- Mappers ---

  private mapToSurveyEntity(row: SurveyDatabaseRow): SurveyEntity {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      version: row.version,
      status: row.status as any,
      environment: row.environment,
      sourceId: row.source_id || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapToQuestionEntity(row: SurveyQuestionDatabaseRow): SurveyQuestionEntity {
    return {
      id: row.id,
      surveyId: row.survey_id,
      questionCode: row.question_code,
      questionType: row.question_type as any,
      required: row.required,
      options: row.options || undefined,
      sequence: row.sequence,
      created_at: row.created_at,
      updated_at: row.created_at
    };
  }

  private mapToResponseEntity(row: SurveyResponseDatabaseRow): SurveyResponseEntity {
    return {
      id: row.id,
      surveyId: row.survey_id,
      responseCode: row.response_code,
      studyAreaId: row.study_area_id || undefined,
      originGeometry: row.origin_geometry as any,
      destinationGeometry: row.destination_geometry as any,
      answers: row.answers,
      environment: row.environment,
      validationStatus: row.validation_status as any,
      sourceId: row.source_id || undefined,
      submittedAt: row.submitted_at,
      created_at: row.created_at,
      updated_at: row.created_at
    };
  }
}
