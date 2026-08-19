import { describe, it, expect, vi, beforeEach } from "vitest";
import { SurveyService } from "@/src/modules/survey/survey.service";

describe("SurveyService", () => {
  let surveyService: SurveyService;
  let mockSurveyRepo: any;

  beforeEach(() => {
    mockSurveyRepo = {
      findSurveyByCodeAndVersion: vi.fn(),
      createSurvey: vi.fn(),
      findQuestionsBySurvey: vi.fn(),
      createQuestion: vi.fn(),
      findResponseByCode: vi.fn(),
      createResponse: vi.fn(),
    };

    surveyService = new SurveyService(mockSurveyRepo);
  });

  describe("submitResponse", () => {
    const mockQuestions = [
      { questionCode: "q_number", questionType: "NUMBER", required: true },
      { questionCode: "q_bool", questionType: "BOOLEAN", required: false },
      { questionCode: "q_single", questionType: "SINGLE_CHOICE", required: true, options: ["A", "B"] },
      { questionCode: "q_multi", questionType: "MULTIPLE_CHOICE", required: false, options: ["X", "Y"] },
    ];

    it("should skip and return existing if duplicate response code", async () => {
      mockSurveyRepo.findResponseByCode.mockResolvedValue({ id: "existing-id" });

      const input = {
        surveyId: "00000000-0000-0000-0000-000000000000",
        responseCode: "resp-1",
        answers: { q_number: 10, q_single: "A" },
        environment: "DUMMY",
      };

      const result = await surveyService.submitResponse(input as any, mockQuestions as any);
      expect(result).toEqual({ id: "existing-id" });
      expect(mockSurveyRepo.createResponse).not.toHaveBeenCalled();
    });

    it("should reject missing required answers", async () => {
      mockSurveyRepo.findResponseByCode.mockResolvedValue(null);

      const input = {
        surveyId: "00000000-0000-0000-0000-000000000000",
        responseCode: "resp-1",
        answers: { q_number: 10 }, // missing q_single
        environment: "DUMMY",
      };

      await expect(surveyService.submitResponse(input as any, mockQuestions as any))
        .rejects.toThrow(/Missing required answer/);
    });

    it("should reject invalid type (string instead of number)", async () => {
      mockSurveyRepo.findResponseByCode.mockResolvedValue(null);

      const input = {
        surveyId: "00000000-0000-0000-0000-000000000000",
        responseCode: "resp-1",
        answers: { q_number: "10", q_single: "A" },
        environment: "DUMMY",
      };

      await expect(surveyService.submitResponse(input as any, mockQuestions as any))
        .rejects.toThrow(/Invalid type/);
    });

    it("should reject invalid SINGLE_CHOICE option", async () => {
      mockSurveyRepo.findResponseByCode.mockResolvedValue(null);

      const input = {
        surveyId: "00000000-0000-0000-0000-000000000000",
        responseCode: "resp-1",
        answers: { q_number: 10, q_single: "C" },
        environment: "DUMMY",
      };

      await expect(surveyService.submitResponse(input as any, mockQuestions as any))
        .rejects.toThrow(/not in allowed options/);
    });

    it("should reject unknown questions", async () => {
      mockSurveyRepo.findResponseByCode.mockResolvedValue(null);

      const input = {
        surveyId: "00000000-0000-0000-0000-000000000000",
        responseCode: "resp-1",
        answers: { q_number: 10, q_single: "A", q_unknown: 5 },
        environment: "DUMMY",
      };

      await expect(surveyService.submitResponse(input as any, mockQuestions as any))
        .rejects.toThrow(/Unknown survey question code/);
    });

    it("should successfully normalize and save valid response", async () => {
      mockSurveyRepo.findResponseByCode.mockResolvedValue(null);
      mockSurveyRepo.createResponse.mockResolvedValue({ id: "new-resp-id" });

      const input = {
        surveyId: "00000000-0000-0000-0000-000000000000",
        responseCode: "resp-1",
        answers: { q_number: 10, q_bool: true, q_single: "A", q_multi: ["X"] },
        environment: "DUMMY",
      };

      const result = await surveyService.submitResponse(input as any, mockQuestions as any);
      expect(result).toEqual({ id: "new-resp-id" });
      expect(mockSurveyRepo.createResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          responseCode: "resp-1",
          answers: { q_number: 10, q_bool: true, q_single: "A", q_multi: ["X"] }
        })
      );
    });
  });
});
