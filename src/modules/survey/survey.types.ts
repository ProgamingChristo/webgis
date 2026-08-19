import type { BaseEntity } from "@/src/types/entity";
import type { PointGeometry } from "@/src/types/spatial";

export type SurveyStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type QuestionType = "NUMBER" | "BOOLEAN" | "TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
export type ValidationStatus = "PENDING" | "VALIDATED" | "INVALID" | "NEEDS_REVIEW";

export interface SurveyEntity extends BaseEntity {
  code: string;
  name: string;
  version: string;
  status: SurveyStatus;
  environment: string;
  sourceId?: string;
}

export interface SurveyQuestionEntity extends BaseEntity {
  surveyId: string;
  questionCode: string;
  questionType: QuestionType;
  required: boolean;
  options?: string[]; // Used for SINGLE_CHOICE or MULTIPLE_CHOICE
  sequence: number;
}

export interface SurveyResponseEntity extends BaseEntity {
  surveyId: string;
  responseCode: string;
  studyAreaId?: string;
  originGeometry?: PointGeometry;
  destinationGeometry?: PointGeometry;
  answers: Record<string, any>;
  environment: string;
  validationStatus: ValidationStatus;
  sourceId?: string;
  submittedAt: string;
}

// Database Rows
export interface SurveyDatabaseRow {
  id: string;
  code: string;
  name: string;
  version: string;
  status: string;
  environment: string;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyQuestionDatabaseRow {
  id: string;
  survey_id: string;
  question_code: string;
  question_type: string;
  required: boolean;
  options: any; // jsonb
  sequence: number;
  created_at: string;
}

export interface SurveyResponseDatabaseRow {
  id: string;
  survey_id: string;
  response_code: string;
  study_area_id: string | null;
  origin_geometry: any;
  destination_geometry: any;
  answers: any;
  environment: string;
  validation_status: string;
  source_id: string | null;
  submitted_at: string;
  created_at: string;
}

// Input DTOs
export interface CreateSurveyInput {
  code: string;
  name: string;
  version: string;
  status: SurveyStatus;
  environment: string;
  sourceId?: string;
}

export interface CreateSurveyQuestionInput {
  surveyId: string;
  questionCode: string;
  questionType: QuestionType;
  required: boolean;
  options?: string[];
  sequence: number;
}

export interface CreateSurveyResponseInput {
  surveyId: string;
  responseCode: string;
  studyAreaId?: string;
  originGeometry?: PointGeometry;
  destinationGeometry?: PointGeometry;
  answers: Record<string, any>;
  environment: string;
  sourceId?: string;
  submittedAt?: string; // defaults to now
}
