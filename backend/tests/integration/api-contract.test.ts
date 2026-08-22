import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { parsePagination, buildPaginationMeta } from "@/src/lib/pagination";
import { parseSortQuery } from "@/src/lib/query-parser";
import { createSuccessResponse, createErrorResponse, createListResponse } from "@/src/lib/api-response";
import { ApplicationError } from "@/src/lib/errors";

describe("API Contract Foundation", () => {
  describe("Response Wrappers", () => {
    it("createSuccessResponse should match contract", async () => {
      const res = createSuccessResponse("req-123", { hello: "world" });
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        data: { hello: "world" },
        request_id: "req-123"
      });
    });

    it("createErrorResponse should match contract", async () => {
      const error = new ApplicationError("NOT_FOUND");
      const res = createErrorResponse("req-123", error);
      const json = await res.json();
      expect(json).toEqual({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
          retryable: false
        },
        request_id: "req-123"
      });
    });

    it("createListResponse should match contract", async () => {
      const meta = buildPaginationMeta(2, 10, 25);
      const res = createListResponse("req-123", [1, 2, 3], meta);
      const json = await res.json();
      expect(json).toEqual({
        success: true,
        data: [1, 2, 3],
        meta: {
          page: 2,
          limit: 10,
          total: 25,
          total_pages: 3
        },
        request_id: "req-123"
      });
    });
  });

  describe("Pagination & Query Parsers", () => {
    it("parsePagination with defaults", () => {
      const req = new NextRequest("http://localhost/api?page=xyz&limit=abc");
      const { page, limit } = parsePagination(req);
      expect(page).toBe(1);
      expect(limit).toBe(20);
    });

    it("parsePagination with custom values and max bound", () => {
      const req = new NextRequest("http://localhost/api?page=3&limit=200");
      const { page, limit, offset } = parsePagination(req);
      expect(page).toBe(3);
      expect(limit).toBe(100);
      expect(offset).toBe(200);
    });

    it("parseSortQuery restricts to allowed fields", () => {
      const req = new NextRequest("http://localhost/api?sort=invalid_field");
      expect(() => parseSortQuery(req, ["created_at"])).toThrow(ApplicationError);
    });

    it("parseSortQuery extracts valid sort", () => {
      const req = new NextRequest("http://localhost/api?sort=created_at&order=asc");
      const { sort, order } = parseSortQuery(req, ["created_at"]);
      expect(sort).toBe("created_at");
      expect(order).toBe("asc");
    });

    it("parseSortQuery rejects an invalid sort order", () => {
      const req = new NextRequest(
        "http://localhost/api?sort=created_at&order=drop_table",
      );

      let thrown: unknown;
      try {
        parseSortQuery(req, ["created_at"]);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ApplicationError);
      expect(thrown).toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });
});
