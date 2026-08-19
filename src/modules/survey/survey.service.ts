import { SurveyRepository } from "./survey.repository";
import { 
  CreateSurveyInput, CreateSurveyQuestionInput, CreateSurveyResponseInput,
  SurveyEntity, SurveyQuestionEntity, SurveyResponseEntity 
} from "./survey.types";
import { 
  createSurveySchema, createSurveyQuestionSchema, createSurveyResponseSchema 
} from "./survey.schema";

export class SurveyService {
  constructor(private readonly surveyRepo: SurveyRepository) {}

  async findOrCreateSurvey(input: CreateSurveyInput): Promise<SurveyEntity> {
    const validated = createSurveySchema.parse(input);
    const existing = await this.surveyRepo.findSurveyByCodeAndVersion(validated.code, validated.version, validated.environment);
    if (existing) return existing;
    return this.surveyRepo.createSurvey(validated as CreateSurveyInput);
  }

  async createQuestions(questions: CreateSurveyQuestionInput[]): Promise<SurveyQuestionEntity[]> {
    const created: SurveyQuestionEntity[] = [];
    for (const q of questions) {
      const validated = createSurveyQuestionSchema.parse(q);
      created.push(await this.surveyRepo.createQuestion(validated as CreateSurveyQuestionInput));
    }
    return created;
  }

  async getSurveyQuestions(surveyId: string): Promise<SurveyQuestionEntity[]> {
    return this.surveyRepo.findQuestionsBySurvey(surveyId);
  }

  /**
   * Validates answers against the survey definition, normalizes them, and stores the response.
   * If a response with the same code exists, it will skip (idempotent).
   */
  async submitResponse(input: CreateSurveyResponseInput, questions: SurveyQuestionEntity[]): Promise<SurveyResponseEntity | null> {
    const validated = createSurveyResponseSchema.parse(input);
    
    // Deduplication check
    const existing = await this.surveyRepo.findResponseByCode(validated.surveyId, validated.responseCode, validated.environment);
    if (existing) {
      console.log(`[SurveyService] Skipping duplicate response: ${validated.responseCode}`);
      return existing;
    }

    // Validate and normalize answers
    const normalizedAnswers: Record<string, any> = {};

    // 1. Check all required questions are present and validate types
    for (const q of questions) {
      const rawAnswer = validated.answers[q.questionCode];
      
      if (rawAnswer === undefined || rawAnswer === null) {
        if (q.required) {
          throw new Error(`Missing required answer for question: ${q.questionCode}`);
        }
        continue;
      }

      // 2. Validate type & format
      switch (q.questionType) {
        case "NUMBER":
          if (typeof rawAnswer !== "number") throw new Error(`Invalid type for ${q.questionCode}: expected NUMBER`);
          normalizedAnswers[q.questionCode] = rawAnswer;
          break;
        case "BOOLEAN":
          if (typeof rawAnswer !== "boolean") throw new Error(`Invalid type for ${q.questionCode}: expected BOOLEAN`);
          normalizedAnswers[q.questionCode] = rawAnswer;
          break;
        case "TEXT":
          if (typeof rawAnswer !== "string") throw new Error(`Invalid type for ${q.questionCode}: expected TEXT`);
          normalizedAnswers[q.questionCode] = rawAnswer;
          break;
        case "SINGLE_CHOICE":
          if (typeof rawAnswer !== "string") throw new Error(`Invalid type for ${q.questionCode}: expected SINGLE_CHOICE string`);
          if (q.options && !q.options.includes(rawAnswer)) {
            throw new Error(`Invalid answer for ${q.questionCode}: '${rawAnswer}' is not in allowed options`);
          }
          normalizedAnswers[q.questionCode] = rawAnswer;
          break;
        case "MULTIPLE_CHOICE":
          if (!Array.isArray(rawAnswer)) throw new Error(`Invalid type for ${q.questionCode}: expected MULTIPLE_CHOICE array`);
          if (q.options) {
            for (const val of rawAnswer) {
              if (!q.options.includes(val)) {
                throw new Error(`Invalid answer for ${q.questionCode}: '${val}' is not in allowed options`);
              }
            }
          }
          normalizedAnswers[q.questionCode] = rawAnswer;
          break;
      }
    }

    // 3. Reject unknown questions
    const definedCodes = new Set(questions.map(q => q.questionCode));
    for (const key of Object.keys(validated.answers)) {
      if (!definedCodes.has(key)) {
        throw new Error(`Unknown survey question code: ${key}`);
      }
    }

    // Validation passed, insert
    const toInsert = { ...validated, answers: normalizedAnswers } as CreateSurveyResponseInput;
    return this.surveyRepo.createResponse(toInsert);
  }
}
