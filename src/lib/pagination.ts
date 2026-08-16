import { NextRequest } from "next/server";

export type PaginationOptions = {
  page: number;
  limit: number;
  offset: number;
};

export function parsePagination(req: NextRequest | URL): PaginationOptions {
  const url = req instanceof NextRequest ? req.nextUrl : req;
  
  let page = parseInt(url.searchParams.get("page") || "1", 10);
  let limit = parseInt(url.searchParams.get("limit") || "20", 10);
  
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  
  if (isNaN(limit) || limit < 1) {
    limit = 20;
  }
  
  if (limit > 100) {
    limit = 100;
  }
  
  return { page, limit, offset: (page - 1) * limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit) || 1,
  };
}
