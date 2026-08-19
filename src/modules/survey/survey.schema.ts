import { z } from "zod";
import { pointGeometrySchema } from "@/src/schemas/spatial.schema";

export const surveyStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
export const questionTypeSchema = z.enum(["NUMBER", "BOOLEAN", "TEXT", "SINGLE_CHOICE", "MULTIPLE_CHOICE"]);

export const createSurveySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  status: surveyStatusSchema.default("DRAFT"),
  environment: z.literal("DUMMY"), // Phase 13 dummy constraint
  sourceId: z.string().uuid().optional(),
});

export const createSurveyQuestionSchema = z.object({
  surveyId: z.string().uuid(),
  questionCode: z.string().min(1),
  questionType: questionTypeSchema,
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  sequence: z.number().int().min(0).default(0),
});

export const createSurveyResponseSchema = z.object({
  surveyId: z.string().uuid(),
  responseCode: z.string().min(1),
  studyAreaId: z.string().uuid().optional(),
  originGeometry: pointGeometrySchema.optional(),
  destinationGeometry: pointGeometrySchema.optional(),
  answers: z.record(z.string(), z.any()), // Will be dynamically validated by service
  environment: z.literal("DUMMY"),
  sourceId: z.string().uuid().optional(),
  submittedAt: z.string().datetime().optional(),
});
